import { defineConfig } from '@playwright/test';
import auth from './playwright.auth.config';
export default defineConfig({ ...auth, testMatch: 'booking.spec.ts', timeout: 90_000 });
