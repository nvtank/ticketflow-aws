import { describe, expect, it } from 'vitest';
import { parseEnvironment } from '../src/config/environment';

const local = {
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
      parseEnvironment({ DATABASE_URL: 'invalid-password-secret', REDIS_URL: local.REDIS_URL }),
    ).toThrow('Invalid environment fields: DATABASE_URL');
    expect(() =>
      parseEnvironment({ DATABASE_URL: 'invalid-password-secret', REDIS_URL: local.REDIS_URL }),
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
