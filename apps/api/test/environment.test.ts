import { describe, expect, it } from 'vitest';
import { parseEnvironment } from '../src/config/environment';

const local = {
  JWT_SECRET: 'test-only-environment-secret-at-least-forty-eight-characters-long',
  DATABASE_URL: 'postgresql://local:local@localhost:5432/tixflow',
  REDIS_URL: 'redis://localhost:6379',
};

describe('Environment validation', () => {
  it('parses local configuration and comma separated CORS origins', () => {
    const environment = parseEnvironment({
      ...local,
      CORS_ORIGINS: 'http://localhost:3000, http://localhost:3001',
    });
    expect(environment.API_PORT).toBe(4000);
    expect(environment.CORS_ORIGINS).toEqual(['http://localhost:3000', 'http://localhost:3001']);
  });

  it('rejects missing database configuration without disclosing inputs', () => {
    expect(() =>
      parseEnvironment({
        ...local,
        DATABASE_URL: 'invalid-password-secret',
        REDIS_URL: local.REDIS_URL,
      }),
    ).toThrow('Invalid environment fields: DATABASE_URL');
    expect(() =>
      parseEnvironment({
        ...local,
        DATABASE_URL: 'invalid-password-secret',
        REDIS_URL: local.REDIS_URL,
      }),
    ).not.toThrow('invalid-password-secret');
  });

  it.each(['-1', '0', '65536', 'four-thousand'])('rejects invalid port %s', (port) => {
    expect(() => parseEnvironment({ ...local, API_PORT: port })).toThrow('API_PORT');
  });

  it('requires service-specific URL protocols', () => {
    expect(() => parseEnvironment({ ...local, DATABASE_URL: 'https://localhost' })).toThrow(
      'DATABASE_URL',
    );
    expect(() => parseEnvironment({ ...local, REDIS_URL: 'postgresql://localhost/test' })).toThrow(
      'REDIS_URL',
    );
  });

  it('rejects wildcard CORS configuration', () => {
    expect(() => parseEnvironment({ ...local, CORS_ORIGINS: '*' })).toThrow('CORS_ORIGINS');
  });
});

describe('Payment environment', () => {
  it('requires all PayOS channel secrets without exposing their values', () => {
    expect(() =>
      parseEnvironment({ ...local, PAYMENT_PROVIDER: 'payos', PAYOS_CLIENT_ID: 'private-client' }),
    ).toThrow('PAYOS_API_KEY');
    expect(() =>
      parseEnvironment({ ...local, PAYMENT_PROVIDER: 'payos', PAYOS_CLIENT_ID: 'private-client' }),
    ).not.toThrow('private-client');
  });
  it('disables mock in production and requires persistent signing key', () => {
    expect(() =>
      parseEnvironment({ ...local, NODE_ENV: 'production', PAYMENT_PROVIDER: 'mock' }),
    ).toThrow('PAYMENT_PROVIDER');
    expect(() =>
      parseEnvironment({
        ...local,
        NODE_ENV: 'production',
        PAYMENT_RETURN_ORIGIN: 'https://tickets.example.com',
      }),
    ).toThrow('TICKET_SIGNING_KEY');
  });
  it('rejects return origins containing paths or credentials', () => {
    for (const value of [
      'https://example.com/path',
      'https://user:password@example.com',
      'https://example.com?query=1',
    ])
      expect(() => parseEnvironment({ ...local, PAYMENT_RETURN_ORIGIN: value })).toThrow(
        'PAYMENT_RETURN_ORIGIN',
      );
  });
});
