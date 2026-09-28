import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'foundation.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'pnpm --filter @tixflow/api start',
      url: 'http://127.0.0.1:4000/api/v1/health/live',
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/unavailable',
        REDIS_URL: 'redis://127.0.0.1:2',
        API_PORT: '4000',
        CORS_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000',
        JWT_SECRET: 'test-only-authentication-secret-for-browser-foundation-tests-2026',
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
