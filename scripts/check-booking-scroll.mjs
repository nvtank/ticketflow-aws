/* global process, console, document, window, sessionStorage, scrollY, innerHeight, innerWidth */
import { chromium, expect } from '@playwright/test';
const base = process.env.FLOW_QA_URL || 'http://127.0.0.1:3000/';
const b = await chromium.launch({ args: ['--no-sandbox'] });
for (const mode of ['desktop', 'mobile', 'reduced']) {
  const c = await b.newContext({
    viewport: mode === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    isMobile: mode === 'mobile',
    hasTouch: mode === 'mobile',
    reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference',
  });
  const p = await c.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.stack));
  p.on('console', (m) => {
    if (m.type() === 'error' && /Maximum call stack|RangeError/.test(m.text()))
      errors.push(m.text());
  });
  await p.addInitScript(() => sessionStorage.setItem('tikflow-ticket-intro-v5', 'seen'));
  await p.route('**/api/v1/auth/refresh', (r) =>
    r.fulfill({ status: 401, json: { message: 'QA' } }),
  );
  await p.goto(base, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  if (mode !== 'reduced')
    await p.waitForFunction(() => document.querySelector('.tf-intro')?.dataset.phase === 'ready');
  await p.waitForTimeout(500);
  const scroll = async (fraction) => {
    await p
      .locator('.tf-booking')
      .evaluate(
        (el, f) =>
          window.scrollTo(
            0,
            el.getBoundingClientRect().top + scrollY - innerHeight * 0.7 + el.offsetHeight * f,
          ),
        fraction,
      );
    await p.waitForTimeout(900);
  };
  const selected = async (index) => {
    await expect(p.locator(`#tf-step-${index}`)).toHaveAttribute('aria-selected', 'true');
  };
  await scroll(0.15);
  await selected(0);
  await scroll(0.5);
  await selected(1);
  await p.getByRole('radio', { name: 'BACKSTAGE' }).check();
  await p.getByRole('tab', { name: '01 DISCOVER' }).click();
  await selected(0);
  await scroll(0.52);
  await selected(0);
  await scroll(0.86);
  await selected(2);
  await expect(
    p.locator('#tf-demo-panel').getByRole('heading', { name: 'BACKSTAGE' }),
  ).toBeVisible();
  await scroll(0.5);
  await selected(1);
  await expect(p.getByRole('radio', { name: 'BACKSTAGE' })).toBeChecked();
  await scroll(0.15);
  await selected(0);
  await p.getByRole('tab', { name: '01 DISCOVER' }).focus();
  await p.keyboard.press('ArrowRight');
  await selected(1);
  await scroll(0.86);
  await selected(2);
  await p.locator('#tf-demo-panel a[href="/events"]').click();
  await p.waitForURL('**/events', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await expect(p.locator('#main-content h1').first()).toBeVisible();
  await p.goBack({ waitUntil: 'domcontentloaded' });
  await p.waitForURL(base, { waitUntil: 'domcontentloaded' });
  await expect(p.locator('.ch-title')).toBeVisible();
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (overflow || errors.length) throw Error(JSON.stringify({ mode, overflow, errors }));
  console.log(
    JSON.stringify({
      mode,
      scrollSequence: '01→02→03→02→01',
      manualOverride: true,
      selectionRetained: true,
      routeCleanup: true,
      overflow,
      errors,
    }),
  );
  await c.close();
}
await b.close();
