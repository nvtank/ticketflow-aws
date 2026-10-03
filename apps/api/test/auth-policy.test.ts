import 'reflect-metadata';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { ExecutionContext } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserRole } from '@tixflow/shared';
import { describe, expect, it, vi } from 'vitest';
import type * as PasswordModule from '../src/auth/password.service';
import type * as DtoModule from '../src/auth/auth.dto';
import type * as GuardModule from '../src/auth/auth.guard';
import type * as DecoratorModule from '../src/auth/auth.decorators';
import type * as JwtModule from '../src/auth/local-jwt.provider';
import type * as CookieModule from '../src/auth/cookie-origin.guard';
import type * as EnvModule from '../src/config/environment';
import type { AuthProvider } from '../src/auth/auth-provider';
import type { AuthRequest } from '../src/auth/auth.types';
import type { DatabaseService } from '../src/database/database.service';

const require = createRequire(import.meta.url);
const { PasswordService } = require('../dist/auth/password.service.js') as typeof PasswordModule;
const { RegisterDto } = require('../dist/auth/auth.dto.js') as typeof DtoModule;
const { AuthGuard } = require('../dist/auth/auth.guard.js') as typeof GuardModule;
const { Public, Roles } = require('../dist/auth/auth.decorators.js') as typeof DecoratorModule;
const { LocalJwtAuthProvider } = require('../dist/auth/local-jwt.provider.js') as typeof JwtModule;
const { CookieOriginGuard } = require('../dist/auth/cookie-origin.guard.js') as typeof CookieModule;
const { parseEnvironment } = require('../dist/config/environment.js') as typeof EnvModule;
const environment = parseEnvironment(process.env);

function context(headers: AuthRequest['headers'], handler = () => {}, controller = class {}) {
  const request = { headers, method: 'POST' };
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('Password hashing and input policy', () => {
  const passwords = new PasswordService();
  it('uses a salted bcrypt hash and rejects a wrong password', async () => {
    const hash = await passwords.hash('Correct-password!2026');
    expect(hash).toMatch(/^\$2[ab]\$12\$/);
    expect(await passwords.verify('Correct-password!2026', hash)).toBe(true);
    expect(await passwords.verify('Wrong-password!2026', hash)).toBe(false);
  });
  it('rejects UTF-8 truncation aliases and short passwords', async () => {
    await expect(passwords.hash('a'.repeat(73))).rejects.toMatchObject({ status: 400 });
    await expect(passwords.hash('😀'.repeat(19))).rejects.toMatchObject({ status: 400 });
    await expect(passwords.hash('short')).rejects.toMatchObject({ status: 400 });
    expect(await passwords.verify('😀'.repeat(19))).toBe(false);
  });
  it('normalizes emails and refuses client-supplied roles in the DTO', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: '  CUSTOMER@EXAMPLE.COM ',
      name: ' Local Customer ',
      password: 'Correct-password!2026',
      role: 'ADMIN',
    });
    expect(dto.email).toBe('customer@example.com');
    expect(
      (await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).some(
        (error) => error.property === 'role',
      ),
    ).toBe(true);
  });
});

describe('Authentication and role guard', () => {
  const provider: AuthProvider = {
    authenticate: vi.fn(async () => ({
      sessionId: randomUUID(),
      user: {
        id: randomUUID(),
        email: 'customer@example.com',
        name: 'Customer',
        phone: null,
        role: UserRole.CUSTOMER,
      },
    })),
    issue: vi.fn(async () => ({ accessToken: 'unused', expiresIn: 900 })),
  };
  const guard = new AuthGuard(new Reflector(), provider);
  it('allows explicitly public routes and requires bearer auth everywhere else', async () => {
    const controller = class {};
    Public()(controller);
    expect(await guard.canActivate(context({}, undefined, controller))).toBe(true);
    await expect(guard.canActivate(context({}))).rejects.toMatchObject({ status: 401 });
  });
  it('rejects a CUSTOMER on ADMIN routes', async () => {
    const handler = () => {};
    Roles(UserRole.ADMIN)(handler);
    await expect(
      guard.canActivate(context({ authorization: 'Bearer example' }, handler)),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe('JWT verification before any database lookup', () => {
  const jwt = new JwtService();
  const lookup = vi.fn(async () => {
    throw new Error('Invalid JWT must not query the database');
  });
  const database = { userSession: { findUnique: lookup } } as unknown as DatabaseService;
  const provider = new LocalJwtAuthProvider(jwt, database, environment);
  const claims = { sub: randomUUID(), sid: randomUUID(), tokenUse: 'access' };
  const options = {
    secret: environment.JWT_SECRET,
    issuer: environment.JWT_ISSUER,
    audience: environment.JWT_AUDIENCE,
    expiresIn: 900,
  };
  it.each([
    ['expired', { expiresIn: -1 }],
    ['wrong issuer', { issuer: 'someone-else' }],
    ['wrong audience', { audience: 'another-app' }],
    ['wrong algorithm', { algorithm: 'HS384' as const }],
    ['wrong key', { secret: 'a-different-signing-key' }],
  ])('rejects %s tokens', async (_label, overrides) => {
    const token = await jwt.signAsync(claims, { ...options, ...overrides });
    await expect(provider.authenticate(token)).rejects.toMatchObject({ status: 401 });
    expect(lookup).not.toHaveBeenCalled();
  });
  it('rejects a signed token with the wrong token type', async () => {
    const token = await jwt.signAsync({ ...claims, tokenUse: 'refresh' }, options);
    await expect(provider.authenticate(token)).rejects.toMatchObject({ status: 401 });
  });
});

describe('Cookie request origin policy', () => {
  const guard = new CookieOriginGuard(environment);
  it('rejects foreign origins and cross-site browser requests', () => {
    expect(() => guard.canActivate(context({ origin: 'https://evil.example' }))).toThrow();
    expect(() => guard.canActivate(context({ 'sec-fetch-site': 'cross-site' }))).toThrow();
    expect(guard.canActivate(context({ origin: 'http://localhost:3000' }))).toBe(true);
    expect(guard.canActivate(context({}))).toBe(true);
  });
});
