import { defineConfig } from '@playwright/test';
import auth from './playwright.auth.config';
const servers = auth.webServer;
if (!Array.isArray(servers)) throw new Error('Google tests require isolated API/web servers.');
export default defineConfig({
  ...auth,
  testMatch: 'google.spec.ts',
  timeout: 60000,
  webServer: servers.map((server, index) =>
    index === 0
      ? {
          ...server,
          env: {
            ...server.env,
            GOOGLE_CLIENT_ID: '123456-tixflow-test.apps.googleusercontent.com',
          },
        }
      : server,
  ),
});
