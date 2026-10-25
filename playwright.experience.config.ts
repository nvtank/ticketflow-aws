import { defineConfig } from '@playwright/test';
import auth from './playwright.auth.config';
export default defineConfig({
  ...auth,
  testMatch: 'experience.spec.ts',
  timeout: 90_000,
  use: { ...auth.use, screenshot: 'only-on-failure' },
});
