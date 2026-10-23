import { defineConfig } from '@playwright/test';
import auth from './playwright.auth.config';
export default defineConfig({ ...auth, testMatch: 'checkin.spec.ts', timeout: 90000 });
