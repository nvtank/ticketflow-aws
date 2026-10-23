import { createRequire } from 'node:module';
import process from 'node:process';
import console from 'node:console';
import { URL } from 'node:url';
import { isIP } from 'node:net';
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
require('dotenv').config({ path: new URL('../.env', import.meta.url), quiet: true });
const { PayOS, APIError } = require('@payos/node');
try {
  const url = new URL(process.argv.slice(2).find((arg) => arg !== '--') ?? '');
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/api/v1/payments/webhook' ||
    url.hostname === 'localhost' ||
    url.hostname.endsWith('.localhost') ||
    isIP(url.hostname)
  )
    throw new Error('Provide a public HTTPS domain with path /api/v1/payments/webhook.');
  for (const name of ['PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY'])
    if (!process.env[name]) throw new Error(`Missing ${name}.`);
  const client = new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    baseURL: 'https://api-merchant.payos.vn',
    logLevel: 'off',
    timeout: 10000,
    maxRetries: 0,
  });
  await client.webhooks.confirm(url.href);
  console.log(`PayOS webhook verified and registered: ${url.origin}${url.pathname}`);
} catch (error) {
  if (error instanceof Error && !(error instanceof APIError))
    console.error(
      'Webhook registration failed. Check the public URL, running API and local channel settings.',
    );
  else console.error('PayOS did not confirm the webhook. No credentials printed.');
  process.exitCode = 1;
}
