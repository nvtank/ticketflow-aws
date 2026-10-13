import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import console from 'node:console';
import { URL } from 'node:url';
import process from 'node:process';

const template = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
const password = randomBytes(24).toString('hex');
const ticketSecret = randomBytes(48).toString('hex');
const jwtSecret = randomBytes(48).toString('hex');
const contents = template
  .replaceAll('change-this-local-password', password)
  .replace('generate-with-pnpm-env-setup', jwtSecret)
  .replace('generate-with-pnpm-env-setup-ticket', ticketSecret);
try {
  await writeFile(new URL('../.env', import.meta.url), contents, { flag: 'wx', mode: 0o600 });
  console.log(
    'Created root .env with random local database password and JWT secret. No values printed.',
  );
} catch (error) {
  if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
    if (!process.argv.includes('--upgrade')) {
      console.log(
        '.env already exists; preserved it. Use pnpm env:setup --upgrade to append missing auth/payment settings.',
      );
    } else {
      const file = new URL('../.env', import.meta.url);
      let existing = await readFile(file, 'utf8');
      for (const line of contents.split('\n')) {
        if (
          !/^(JWT_SECRET|JWT_ISSUER|JWT_AUDIENCE|ACCESS_TOKEN_SECONDS|REFRESH_TOKEN_DAYS|SESSION_MAX_DAYS|DEMO_PASSWORD|TICKET_SIGNING_KEY|PAYMENT_PROVIDER|PAYMENT_RETURN_ORIGIN|PAYMENT_RECONCILE_INTERVAL_MS|PAYOS_CLIENT_ID|PAYOS_API_KEY|PAYOS_CHECKSUM_KEY)=/.test(
            line,
          )
        )
          continue;
        const key = line.split('=')[0];
        if (!new RegExp(`^${key}=`, 'm').test(existing)) existing += `\n${line}`;
      }
      existing = existing.replace(
        /^JWT_SECRET=generate-with-pnpm-env-setup$/m,
        `JWT_SECRET=${jwtSecret}`,
      );
      await writeFile(file, existing.endsWith('\n') ? existing : `${existing}\n`, { mode: 0o600 });
      console.log(
        'Appended missing authentication/payment settings; existing database settings and valid JWT secret preserved.',
      );
    }
  } else throw error;
}
