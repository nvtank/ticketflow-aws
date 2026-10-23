import { defineConfig } from '@playwright/test';
import auth from './playwright.auth.config';
export default defineConfig({ ...auth, testMatch: 'waiting.spec.ts', timeout: 90000 });
