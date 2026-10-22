import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type * as ApplicationModule from '../src/app.module';
import type * as BootstrapModule from '../src/bootstrap';
import type * as EnvironmentModule from '../src/config/environment';
import type * as DatabaseModule from '../src/database/database.service';
import type * as AuthModule from '../src/auth/auth.service';
import type * as PasswordModule from '../src/auth/password.service';
import type { AuthResult } from '../src/auth/auth.types';

const require = createRequire(import.meta.url);
const { AppModule } = require('../dist/app.module.js') as typeof ApplicationModule;
const { configureApplication } = require('../dist/bootstrap.js') as typeof BootstrapModule;
const { parseEnvironment } = require('../dist/config/environment.js') as typeof EnvironmentModule;
const { DatabaseService } =
  require('../dist/database/database.service.js') as typeof DatabaseModule;
const { AuthService, hashRefreshToken } =
  require('../dist/auth/auth.service.js') as typeof AuthModule;
const { PasswordService } = require('../dist/auth/password.service.js') as typeof PasswordModule;

describe('Authentication with real PostgreSQL and Redis', () => {
  let app: INestApplication;
  let db: InstanceType<typeof DatabaseService>;
  let auth: InstanceType<typeof AuthService>;
  let passwords: InstanceType<typeof PasswordService>;
  const password = 'Fixture-auth-password!2026';
  const prefix = randomUUID();
  const userIds: string[] = [];
  const organizationIds: string[] = [];
  const accounts = new Map<string, { id: string; email: string }>();

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? '');
    if (
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      url.port !== '55432' ||
      url.pathname !== '/tixflow_test'
    )
      throw new Error('Refusing to run on a non-test database.');
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication({ logger: false });
    configureApplication(app, parseEnvironment(process.env));
    await app.listen(0, '127.0.0.1');
    db = app.get(DatabaseService);
    auth = app.get(AuthService);
    passwords = app.get(PasswordService);
    await db.$queryRaw`SELECT 1`;
    const redis = new Redis(process.env.REDIS_URL ?? '', {
      lazyConnect: true,
      connectTimeout: 2000,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
    });
    redis.on('error', () => {});
    try {
      await redis.connect();
      expect(await redis.ping()).toBe('PONG');
    } finally {
      redis.disconnect();
    }
    const passwordHash = await passwords.hash(password);
    for (const role of ['CUSTOMER', 'ORGANIZER', 'STAFF', 'ADMIN'] as const) {
      const user = await db.user.create({
        data: {
          email: `${prefix}-${role.toLowerCase()}@fixture.local`,
          name: `Fixture ${role}`,
          passwordHash,
          role,
        },
      });
      accounts.set(role, user);
      userIds.push(user.id);
    }
    for (const suffix of ['own', 'other']) {
      const org = await db.organization.create({
        data: { name: `Fixture ${suffix}`, slug: `${prefix}-${suffix}`, status: 'APPROVED' },
      });
      organizationIds.push(org.id);
    }
    await db.organizationMember.create({
      data: { organizationId: organizationIds[0]!, userId: accounts.get('ORGANIZER')!.id },
    });
  });

  afterAll(async () => {
    if (db && userIds.length) {
      // Only delete IDs created by this test run; never truncate shared tables.
      await db.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
      await db.organizationMember.deleteMany({
        where: { organizationId: { in: organizationIds } },
      });
      await db.organization.deleteMany({ where: { id: { in: organizationIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app?.close();
  });

  const login = (role = 'CUSTOMER'): Promise<AuthResult> =>
    auth.login({ email: accounts.get(role)!.email, password });
  const bearer = (result: AuthResult) => `Bearer ${result.accessToken}`;
  const cookie = (result: AuthResult) => `tixflow_refresh=${result.refreshToken}`;

  it('registers normalized CUSTOMER accounts and stores only hashes', async () => {
    const email = `${prefix}-registered@fixture.local`;
    const result = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: ` ${email.toUpperCase()} `, name: 'New Customer', password })
      .expect(201);
    userIds.push(result.body.user.id);
    expect(result.body.user).toMatchObject({ email, role: 'CUSTOMER' });
    expect(result.body).not.toHaveProperty('refreshToken');
    expect(result.body.user).not.toHaveProperty('passwordHash');
    const stored = await db.user.findUniqueOrThrow({ where: { email } });
    expect(stored.passwordHash).not.toBe(password);
    expect(await passwords.verify(password, stored.passwordHash)).toBe(true);
    const setCookie = String(result.headers['set-cookie']);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/api/v1/auth');
  });

  it('rejects public role elevation and cross-origin cookie requests', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `${prefix}-escalation@fixture.local`,
        name: 'Unauthorized Admin',
        password,
        role: 'ADMIN',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Origin', 'https://evil.example')
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: accounts.get('CUSTOMER')!.email, password })
      .expect(403);
  });

  it('resolves concurrent duplicate registrations with one database user', async () => {
    const email = `${prefix}-concurrent@fixture.local`;
    const outcomes = await Promise.allSettled([
      auth.register({ email, name: 'Concurrent User', password }),
      auth.register({ email, name: 'Concurrent User', password }),
    ]);
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    userIds.push(user.id);
    expect(outcomes.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect(await db.user.count({ where: { email } })).toBe(1);
  });

  it('logs in through HTTP and rejects incorrect passwords', async () => {
    const email = accounts.get('CUSTOMER')!.email;
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'incorrect-password!2026' })
      .expect(401);
    const result = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${result.body.accessToken}`)
      .expect(200);
  });

  it('enforces all four role policies using current database roles', async () => {
    for (const role of ['CUSTOMER', 'ORGANIZER', 'STAFF', 'ADMIN']) {
      const session = await login(role);
      for (const workspace of ['organizer', 'staff', 'admin']) {
        await request(app.getHttpServer())
          .get(`/api/v1/workspaces/${workspace}`)
          .set('Authorization', bearer(session))
          .expect(role.toLowerCase() === workspace ? 200 : 403);
      }
    }
    await request(app.getHttpServer()).get('/api/v1/workspaces/admin').expect(401);
  });

  it('prevents cross-organization access while allowing explicit admin access', async () => {
    const organizer = await login('ORGANIZER');
    const mine = await request(app.getHttpServer())
      .get('/api/v1/organizations/me')
      .set('Authorization', bearer(organizer))
      .expect(200);
    expect(mine.body.map((item: { id: string }) => item.id)).toEqual([organizationIds[0]]);
    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationIds[0]}`)
      .set('Authorization', bearer(organizer))
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationIds[1]}`)
      .set('Authorization', bearer(organizer))
      .expect(403);
    const admin = await login('ADMIN');
    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationIds[1]}`)
      .set('Authorization', bearer(admin))
      .expect(200);
  });

  it('rotates once and commits family revocation on refresh replay', async () => {
    const session = await login();
    const rotated = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie(session))
      .set('Origin', 'http://localhost:3000')
      .expect(200);
    const stored = await db.refreshToken.findUniqueOrThrow({
      where: { tokenHash: hashRefreshToken(session.refreshToken) },
    });
    expect(stored.consumedAt).not.toBeNull();
    expect(stored.tokenHash).not.toBe(session.refreshToken);
    expect(rotated.body).not.toHaveProperty('refreshToken');
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie(session))
      .expect(401);
    expect(
      (await db.userSession.findUniqueOrThrow({ where: { id: stored.sessionId } })).revokedAt,
    ).not.toBeNull();
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${rotated.body.accessToken}`)
      .expect(401);
    expect(
      await db.auditLog.count({
        where: { entityId: stored.sessionId, action: 'AUTH_REFRESH_REPLAY' },
      }),
    ).toBe(1);
  });

  it('serializes concurrent refreshes and fails closed on replay', async () => {
    const session = await login();
    const outcomes = await Promise.allSettled([
      auth.refresh(session.refreshToken),
      auth.refresh(session.refreshToken),
    ]);
    expect(outcomes.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    const token = await db.refreshToken.findUniqueOrThrow({
      where: { tokenHash: hashRefreshToken(session.refreshToken) },
      include: { session: true },
    });
    expect(token.session.revokedAt).not.toBeNull();
    expect(
      await db.refreshToken.count({ where: { sessionId: token.sessionId, consumedAt: null } }),
    ).toBe(1);
  });

  it('rejects expired refresh credentials', async () => {
    const session = await login();
    await db.refreshToken.update({
      where: { tokenHash: hashRefreshToken(session.refreshToken) },
      data: { createdAt: new Date(Date.now() - 3000), expiresAt: new Date(Date.now() - 1000) },
    });
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie(session))
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', bearer(session))
      .expect(401);
  });

  it('logs out idempotently and immediately invalidates the access JWT', async () => {
    const session = await login();
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie(session))
      .expect(204);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', bearer(session))
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie(session))
      .expect(204);
  });

  it('revokes a bearer session when its refresh cookie is absent', async () => {
    const session = await login();
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', bearer(session))
      .expect(204);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', bearer(session))
      .expect(401);
  });

  it('updates only the authenticated user profile', async () => {
    const session = await login();
    await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', bearer(session))
      .send({ name: 'Updated Customer', phone: '+84901234567' })
      .expect(200);
    expect((await db.user.findUniqueOrThrow({ where: { id: session.user.id } })).name).toBe(
      'Updated Customer',
    );
    await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', bearer(session))
      .send({ id: accounts.get('ADMIN')!.id, role: 'ADMIN' })
      .expect(400);
    expect((await db.user.findUniqueOrThrow({ where: { id: session.user.id } })).role).toBe(
      'CUSTOMER',
    );
  });

  it('revokes all sessions after a password change', async () => {
    const email = `${prefix}-password@fixture.local`;
    const created = await auth.register({ email, name: 'Password User', password });
    userIds.push(created.user.id);
    const second = await auth.login({ email, password });
    await request(app.getHttpServer())
      .post('/api/v1/users/me/password')
      .set('Authorization', bearer(created))
      .send({ currentPassword: password, newPassword: 'Updated-auth-password!2026' })
      .expect(204);
    for (const session of [created, second])
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', bearer(session))
        .expect(401);
    await expect(auth.login({ email, password })).rejects.toMatchObject({ status: 401 });
    expect((await auth.login({ email, password: 'Updated-auth-password!2026' })).user.id).toBe(
      created.user.id,
    );
  });

  it('checks account lock status on every authenticated request', async () => {
    const session = await login();
    await db.user.update({ where: { id: session.user.id }, data: { isActive: false } });
    try {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', bearer(session))
        .expect(401);
      await expect(login()).rejects.toMatchObject({ status: 401 });
    } finally {
      await db.user.update({ where: { id: session.user.id }, data: { isActive: true } });
    }
  });
});
