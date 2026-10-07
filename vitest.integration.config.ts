import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    include: ['apps/api/test/**/*.integration.test.ts'],
    environment: 'node',
    maxWorkers: 1,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      HOLD_RECONCILE_INTERVAL_MS: '0',
      SOCKET_REDIS_ADAPTER: 'true',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgresql://tixflow_test:tixflow_test_only@127.0.0.1:55432/tixflow_test',
      REDIS_URL: process.env.TEST_REDIS_URL ?? 'redis://127.0.0.1:56379',
      CORS_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000',
      JWT_SECRET: 'test-only-authentication-secret-for-local-integration-tests-2026',
    },
  },
});
