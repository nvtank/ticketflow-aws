import 'reflect-metadata';
import { createRequire } from 'node:module';
import { randomUUID, createHash } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { googleTokenFixture, TEST_GOOGLE_CLIENT_ID } from './google-token-fixture';
import type * as App from '../src/app.module';
import type * as Bootstrap from '../src/bootstrap';
import type * as Env from '../src/config/environment';
import type * as Config from '../src/config/configuration.module';
import type * as DB from '../src/database/database.service';
import type * as Auth from '../src/auth/auth.service';
import type * as Google from '../src/auth/google/google-token-verifier';
import type * as Challenges from '../src/auth/google/google-challenge.service';
const require = createRequire(import.meta.url);
const { AppModule } = require('../dist/app.module.js') as typeof App;
const { configureApplication } = require('../dist/bootstrap.js') as typeof Bootstrap;
const { parseEnvironment } = require('../dist/config/environment.js') as typeof Env;
const { ENVIRONMENT } = require('../dist/config/configuration.module.js') as typeof Config;
const { DatabaseService } = require('../dist/database/database.service.js') as typeof DB;
const { AuthService } = require('../dist/auth/auth.service.js') as typeof Auth;
const { GOOGLE_OAUTH_CLIENT } =
  require('../dist/auth/google/google-token-verifier.js') as typeof Google;
const { GoogleChallengeService } =
  require('../dist/auth/google/google-challenge.service.js') as typeof Challenges;
describe('Google authentication with real PostgreSQL Redis and signature verification', () => {
  let app: INestApplication,
    db: DB.DatabaseService,
    auth: Auth.AuthService,
    challenges: Challenges.GoogleChallengeService;
  const prefix = randomUUID(),
    f = googleTokenFixture(),
    keys: string[] = [],
    password = 'Google-fixture-password!2026';
  const email = (tag: string) => `${prefix}-${tag}@google-fixture.test`;
  const http = () => request(app.getHttpServer());
  const origin = 'http://localhost:3000';
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? '');
    if (
      url.port !== '55432' ||
      url.pathname !== '/tixflow_test' ||
      !['localhost', '127.0.0.1'].includes(url.hostname)
    )
      throw new Error('Requires isolated local test database.');
    const env = parseEnvironment({ ...process.env, GOOGLE_CLIENT_ID: TEST_GOOGLE_CLIENT_ID });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ENVIRONMENT)
      .useValue(env)
      .overrideProvider(GOOGLE_OAUTH_CLIENT)
      .useValue(f.client)
      .compile();
    app = module.createNestApplication({ logger: false });
    configureApplication(app, env);
    await app.listen(0, '127.0.0.1');
    db = app.get(DatabaseService);
    auth = app.get(AuthService);
    challenges = app.get(GoogleChallengeService);
  });
  afterAll(async () => {
    if (db) {
      const users = await db.user.findMany({
        where: { email: { startsWith: prefix } },
        select: { id: true },
      });
      const ids = users.map((u) => u.id);
      await db.auditLog.deleteMany({ where: { actorId: { in: ids } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    }
    if (keys.length) await challenges.redis.del(...keys);
    await app?.close();
  });
  async function challenge(bearer?: string) {
    const route = bearer ? '/auth/google/link/challenge' : '/auth/google/challenge';
    let req = http()
      .post('/api/v1' + route)
      .set('Origin', origin);
    if (bearer) req = req.set('Authorization', `Bearer ${bearer}`);
    const result = await req.expect(201);
    const cookie = (result.headers['set-cookie'] as unknown as string[]).find((c) =>
      c.startsWith('tixflow_google_challenge='),
    )!;
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/api/v1/auth/google');
    const header = cookie.split(';')[0]!;
    keys.push('auth:google:' + createHash('sha256').update(header.split('=')[1]!).digest('hex'));
    return { cookie: header, nonce: result.body.nonce as string, key: keys[keys.length - 1]! };
  }
  const login = (cookie: string, credential: string) =>
    http()
      .post('/api/v1/auth/google/login')
      .set('Origin', origin)
      .set('Cookie', cookie)
      .send({ credential });
  it('creates a passwordless CUSTOMER, restores session and identifies return login by sub', async () => {
    expect((await http().get('/api/v1/auth/google/config').expect(200)).body.enabled).toBe(true);
    const c = await challenge(),
      sub = randomUUID(),
      r = await login(
        c.cookie,
        f.token({ email: email('new'), sub, nonce: c.nonce, role: 'ADMIN' }),
      ).expect(200);
    expect(r.body.user.role).toBe('CUSTOMER');
    expect(r.body.user).not.toHaveProperty('passwordHash');
    const user = await db.user.findUniqueOrThrow({ where: { id: r.body.user.id } });
    expect(user.passwordHash).toBeNull();
    expect(await db.externalIdentity.count({ where: { userId: user.id } })).toBe(1);
    const refresh = (r.headers['set-cookie'] as unknown as string[]).find((v) =>
      v.startsWith('tixflow_refresh='),
    )!;
    expect(refresh).toContain('HttpOnly');
    await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', refresh.split(';')[0]!)
      .set('Origin', origin)
      .expect(200);
    await http()
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'never-a-user-password' })
      .expect(401);
    await db.user.update({ where: { id: user.id }, data: { role: 'ORGANIZER' } });
    const again = await challenge(),
      a = await login(
        again.cookie,
        f.token({ sub, email: email('changed'), nonce: again.nonce }),
      ).expect(200);
    expect(a.body.user.id).toBe(user.id);
    expect(a.body.user.email).toBe(user.email);
    expect(a.body.user.role).toBe('ORGANIZER');
    const methods = await http()
      .get('/api/v1/auth/methods')
      .set('Authorization', `Bearer ${a.body.accessToken}`)
      .expect(200);
    expect(methods.body).toEqual({ hasPassword: false, googleLinked: true });
  });
  it('two concurrent callbacks using one nonce create one account and session', async () => {
    const c = await challenge(),
      credential = f.token({ email: email('replay'), nonce: c.nonce });
    const replies = await Promise.all([login(c.cookie, credential), login(c.cookie, credential)]);
    expect(replies.map((r) => r.status).sort()).toEqual([200, 401]);
    const user = await db.user.findUniqueOrThrow({ where: { email: email('replay') } });
    expect(await db.userSession.count({ where: { userId: user.id } })).toBe(1);
  });
  it('never automatically links an existing email', async () => {
    const user = await auth.register({ email: email('existing'), name: 'Existing user', password });
    const c = await challenge();
    await login(c.cookie, f.token({ email: user.user.email, nonce: c.nonce })).expect(409);
    expect(await db.externalIdentity.count({ where: { userId: user.user.id } })).toBe(0);
    expect(await db.userSession.count({ where: { userId: user.user.id } })).toBe(1);
  });
  it('requires browser challenge cookie and real Redis expiry', async () => {
    await login('unrelated=value', f.token({ email: email('missing') })).expect(401);
    const c = await challenge();
    await challenges.redis.expire(c.key, 0);
    await login(c.cookie, f.token({ email: email('expired'), nonce: c.nonce })).expect(401);
  });
  it('rejects login for an inactive Google identity', async () => {
    const user = await db.user.create({
      data: { email: email('locked'), name: 'Locked', isActive: false },
    });
    const sub = randomUUID();
    await db.externalIdentity.create({
      data: { provider: 'GOOGLE', subject: sub, userId: user.id },
    });
    const c = await challenge();
    await login(c.cookie, f.token({ sub, email: user.email, nonce: c.nonce })).expect(401);
  });
  it('links only with current account, matching email and a recent session', async () => {
    const user = await auth.register({ email: email('link'), name: 'Link user', password }),
      c = await challenge(user.accessToken);
    await http()
      .post('/api/v1/auth/google/link')
      .set('Origin', origin)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .set('Cookie', c.cookie)
      .send({ credential: f.token({ email: user.user.email, nonce: c.nonce }) })
      .expect(200);
    expect(await db.externalIdentity.count({ where: { userId: user.user.id } })).toBe(1);
    expect(
      await db.auditLog.count({ where: { actorId: user.user.id, action: 'AUTH_GOOGLE_LINKED' } }),
    ).toBe(1);
    const methods = await http()
      .get('/api/v1/auth/methods')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);
    expect(methods.body).toEqual({ hasPassword: true, googleLinked: true });
    const other = await auth.register({ email: email('other'), name: 'Other user', password }),
      stolen = await challenge(user.accessToken);
    await http()
      .post('/api/v1/auth/google/link')
      .set('Authorization', `Bearer ${other.accessToken}`)
      .set('Cookie', stolen.cookie)
      .send({ credential: f.token({ email: other.user.email, nonce: stolen.nonce }) })
      .expect(401);
    const mismatch = await challenge(other.accessToken);
    await http()
      .post('/api/v1/auth/google/link')
      .set('Authorization', `Bearer ${other.accessToken}`)
      .set('Cookie', mismatch.cookie)
      .send({ credential: f.token({ email: email('wrong-google'), nonce: mismatch.nonce }) })
      .expect(409);
    await db.userSession.updateMany({
      where: { userId: other.user.id },
      data: { createdAt: new Date(Date.now() - 1200000) },
    });
    const old = await challenge(other.accessToken);
    await http()
      .post('/api/v1/auth/google/link')
      .set('Authorization', `Bearer ${other.accessToken}`)
      .set('Cookie', old.cookie)
      .send({ credential: f.token({ email: other.user.email, nonce: old.nonce }) })
      .expect(403);
  });
  it('blocks a cross-site challenge and anonymous linking', async () => {
    await http()
      .post('/api/v1/auth/google/challenge')
      .set('Origin', 'https://attacker.invalid')
      .expect(403);
    await http().post('/api/v1/auth/google/link/challenge').expect(401);
  });
});
