import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['apps/api/test/**/*.test.ts'],
    exclude: ['**/*.integration.test.ts'],
    environment: 'node',
    maxWorkers: 1,
    testTimeout: 10_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/unavailable',
      REDIS_URL: 'redis://127.0.0.1:2',
      CORS_ORIGINS: 'http://localhost:3000',
      JWT_SECRET: 'test-only-authentication-secret-for-foundation-tests-2026',
    },
  },
});
