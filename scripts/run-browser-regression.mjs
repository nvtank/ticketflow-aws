import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
// Fresh API state per suite and viewport keeps real IP auth limits unchanged.
const supported = ['waiting', 'auth', 'events', 'booking', 'payments', 'checkin', 'google'];
const requested = process.argv.slice(2);
if (requested.some((suite) => !supported.includes(suite))) throw new Error('Unknown browser suite');
for (const suite of requested.length ? requested : supported) {
  for (const project of ['desktop-chromium', 'mobile-chromium']) {
    const report = process.env.PLAYWRIGHT_HTML_OUTPUT_DIR;
    const args = [
      'exec',
      'playwright',
      'test',
      '--config',
      `playwright.${suite}.config.ts`,
      '--project',
      project,
    ];
    if (process.env.PLAYWRIGHT_RESULTS_ROOT)
      args.push('--output', resolve(process.env.PLAYWRIGHT_RESULTS_ROOT, suite, project));
    const result = spawnSync('pnpm', args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        ...(report ? { PLAYWRIGHT_HTML_OUTPUT_DIR: resolve(report, suite, project) } : {}),
      },
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
