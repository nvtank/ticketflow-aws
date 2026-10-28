/* global fetch, AbortSignal */
import console from 'node:console';
import process from 'node:process';
import { URL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

// The web proxy should never advertise readiness while the local API is still compiling.
try {
  process.loadEnvFile(new URL('../.env', import.meta.url));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const origin = process.env.API_INTERNAL_URL || `http://127.0.0.1:${process.env.API_PORT || 4000}`;
const endpoint = new URL('/api/v1/health', origin);
const started = Date.now();
const limit = Number(process.env.API_STARTUP_TIMEOUT_MS || 180_000);
let ready = false;
let lastMessage = 0;
while (Date.now() - started < limit) {
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(1500) });
    const health = response.ok ? await response.json() : null;
    if (health?.status === 'ok') {
      ready = true;
      break;
    }
  } catch {
    // Connection refused is expected during Prisma generation and Nest's initial build.
  }
  if (Date.now() - lastMessage >= 10_000) {
    console.log('Waiting for the API to finish starting (PostgreSQL and Redis must be running)…');
    lastMessage = Date.now();
  }
  await delay(500);
}
if (!ready) {
  console.error('API did not become ready. Check the apps/api log and run pnpm infra:up.');
  process.exitCode = 1;
} else {
  console.log('API ready. Starting the web app.');
}
