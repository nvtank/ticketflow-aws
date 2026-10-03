import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: 'auth.spec.ts',
  webServer: [
    {
      command: 'pnpm --filter @tixflow/api start',
      url: 'http://127.0.0.1:4000/api/v1/health/live',
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        NODE_ENV: 'test',
        DATABASE_URL:
          process.env.TEST_DATABASE_URL ??
          'postgresql://tixflow_test:tixflow_test_only@127.0.0.1:55432/tixflow_test',
        REDIS_URL: process.env.TEST_REDIS_URL ?? 'redis://127.0.0.1:56379',
        API_PORT: '4000',
        CORS_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000',
        JWT_SECRET: 'test-only-authentication-secret-for-browser-authentication-tests-2026',
      },
    },
    {
      command: 'pnpm --filter @tixflow/web start',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: false,
      timeout: 60_000,
      env: { NODE_ENV: 'production', API_INTERNAL_URL: 'http://127.0.0.1:4000' },
    },
  ],
});
