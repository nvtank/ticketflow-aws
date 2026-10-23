import { spawnSync } from 'node:child_process';
import process from 'node:process';
import console from 'node:console';
import { URL } from 'node:url';

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://tixflow_test:tixflow_test_only@127.0.0.1:55432/tixflow_test';
const parsed = new URL(databaseUrl);
if (
  !['127.0.0.1', 'localhost'].includes(parsed.hostname) ||
  parsed.pathname !== '/tixflow_test' ||
  parsed.port !== '55432'
) {
  throw new Error(
    'Test database must be local tixflow_test on port 55432. Refusing to migrate another database.',
  );
}
const result = spawnSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: databaseUrl },
});
console.log(
  result.status === 0
    ? 'Test database migrations applied.'
    : 'Test database preparation failed. Start the test Compose stack first.',
);
process.exitCode = result.status ?? 1;
