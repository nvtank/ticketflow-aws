import 'reflect-metadata';
import { createRequire } from 'node:module';
import { Controller, Get } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type * as ApplicationModule from '../src/app.module';
import type * as BootstrapModule from '../src/bootstrap';
import type * as EnvironmentModule from '../src/config/environment';
import type * as ConfigurationModule from '../src/config/configuration.module';

// Load the actual tsc-built Nest modules with decorator metadata intact.
const require = createRequire(import.meta.url);
const { AppModule } = require('../dist/app.module.js') as typeof ApplicationModule;
const { configureApplication } = require('../dist/bootstrap.js') as typeof BootstrapModule;
const { parseEnvironment } = require('../dist/config/environment.js') as typeof EnvironmentModule;

class FaultController {
  failure(): never {
    throw new Error('database-password-must-not-escape');
  }
}

Controller('__test')(FaultController);
Get('failure')(
  FaultController.prototype,
  'failure',
  Object.getOwnPropertyDescriptor(FaultController.prototype, 'failure')!,
);

describe('Real Nest HTTP foundation (no database or Redis mocks)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [FaultController],
    }).compile();
    app = module.createNestApplication({ logger: false });
    configureApplication(app, parseEnvironment(process.env));
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('serves versioned liveness and security headers', async () => {
    const result = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);
    expect(result.body).toMatchObject({ status: 'ok', service: 'tixflow-api' });
    expect(result.headers['x-content-type-options']).toBe('nosniff');
    expect(result.headers['x-request-id']).toMatch(/^[a-f0-9-]{36}$/);
  });

  it('runs real unavailable dependency probes and reports 503 honestly', async () => {
    const result = await request(app.getHttpServer()).get('/api/v1/health').expect(503);
    expect(result.body).toMatchObject({
      status: 'degraded',
      dependencies: { postgres: 'down', redis: 'down' },
    });
    expect(result.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(result.body)).not.toContain('postgresql://');
  });

  it('returns a consistent correlated error for unknown routes', async () => {
    const result = await request(app.getHttpServer()).get('/api/v1/missing').expect(404);
    expect(result.body).toMatchObject({
      statusCode: 404,
      code: 'HTTP_404',
      requestId: result.headers['x-request-id'],
    });
  });

  it('replaces caller-controlled request IDs', async () => {
    const result = await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .set('X-Request-ID', 'untrusted-id');
    expect(result.headers['x-request-id']).not.toBe('untrusted-id');
  });

  it('permits only configured browser origins', async () => {
    const allowed = await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .set('Origin', 'http://localhost:3000');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    const denied = await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .set('Origin', 'https://untrusted.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('redacts internal exceptions', async () => {
    const result = await request(app.getHttpServer()).get('/api/v1/__test/failure').expect(500);
    expect(result.body.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(result.body)).not.toContain('database-password');
    expect(result.body.stack).toBeUndefined();
  });

  it('counts completed HTTP requests rather than returning fixture metrics', async () => {
    const before = await request(app.getHttpServer()).get('/api/v1/metrics').expect(200);
    await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);
    const after = await request(app.getHttpServer()).get('/api/v1/metrics').expect(200);
    expect(after.body.httpRequestsTotal - before.body.httpRequestsTotal).toBe(2);
    expect(after.body.httpErrorsTotal).toBeGreaterThanOrEqual(2);
    expect(after.body.scope).toBe('current_api_process');
    expect(after.body).not.toHaveProperty('ticketsSold');
  });

  it('publishes actual OpenAPI paths', async () => {
    const result = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    expect(result.body.paths).toHaveProperty('/api/v1/health');
    expect(result.body.paths).not.toHaveProperty('/api/v1/orders');
  });

  it('enforces rate limits with HTTP 429', async () => {
    const outcomes = await Promise.all(
      Array.from({ length: 125 }, () => request(app.getHttpServer()).get('/api/v1/health/live')),
    );
    expect(outcomes.some((outcome) => outcome.status === 429)).toBe(true);
    expect(outcomes.filter((outcome) => outcome.status === 200).length).toBeLessThanOrEqual(120);
    const limited = outcomes.find((outcome) => outcome.status === 429);
    expect(limited?.body.code).toBe('HTTP_429');
  });
});

describe('Production diagnostic restrictions', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const { ENVIRONMENT } =
      require('../dist/config/configuration.module.js') as typeof ConfigurationModule;
    const environment = { ...parseEnvironment(process.env), NODE_ENV: 'production' as const };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ENVIRONMENT)
      .useValue(environment)
      .compile();
    app = module.createNestApplication({ logger: false });
    configureApplication(app, environment);
    await app.listen(0, '127.0.0.1');
  });
  afterAll(async () => {
    await app?.close();
  });
  it('disables public metrics and Swagger outside local development', async () => {
    await request(app.getHttpServer()).get('/api/v1/metrics').expect(403);
    await request(app.getHttpServer()).get('/api/docs-json').expect(404);
  });
});
