import { defineConfig } from '@playwright/test';
import auth from './playwright.auth.config';
export default defineConfig({ ...auth, testMatch: 'events.spec.ts', timeout: 90_000 });
