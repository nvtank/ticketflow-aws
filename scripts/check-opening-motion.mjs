/* global process, window, document, requestAnimationFrame, getComputedStyle, innerWidth, console */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const base = process.env.FLOW_QA_URL || 'http://127.0.0.1:3000/';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await c.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.route('**/api/v1/auth/**', (r) =>
  r.fulfill({ status: 401, json: { message: 'Not signed in' } }),
);
await p.route('**/api/v1/events?**', (r) =>
  r.fulfill({ json: { items: [], pagination: { page: 1, pageSize: 9, total: 0, totalPages: 0 } } }),
);

await p.addInitScript(() => {
  window.__introFrames = [];
  const f = () => {
    const e = document.querySelector('.tf-intro');
    const t = document.querySelector('.tf-intro-ticket');
    if (e && t) {
      window.__introFrames.push({ phase: e.dataset.phase, w: t.getBoundingClientRect().width });
    }
    if (window.__introFrames.length < 600) requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
});
await p.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(
  () =>
    ['loading', 'expanding', 'ready'].includes(document.querySelector('.tf-intro')?.dataset.phase),
  { timeout: 60000 },
);
await fs.mkdir('/tmp/tikflow-opening', { recursive: true });
await p.screenshot({ path: '/tmp/tikflow-opening/intro.png' });
await p.waitForFunction(() => document.querySelector('.tf-intro')?.dataset.phase === 'ready', {
  timeout: 12000,
});
await p.waitForTimeout(200);
await p.screenshot({ path: '/tmp/tikflow-opening/hero.png' });
const intro = await p.evaluate(() => ({
  phases: [...new Set(window.__introFrames.map((x) => x.phase))],
  smallest: Math.min(
    ...window.__introFrames
      .filter((x) => x.phase !== 'ready' && x.phase !== 'idle')
      .map((x) => x.w),
  ),
  largest: Math.max(...window.__introFrames.filter((x) => x.phase === 'expanding').map((x) => x.w)),
  chars: document.querySelectorAll('.tf-hero-char').length,
  h1: document.querySelector('h1').getBoundingClientRect().height,
  overflow: document.documentElement.scrollWidth - innerWidth,
}));
if (!intro.phases.includes('expanding') || intro.largest < 1400)
  throw Error(`Ticket expansion failed ${JSON.stringify(intro)}`);
const heroMedia = await p.locator('.tf-hero').locator('img,canvas,video').count();
if (heroMedia !== 3) throw Error('Expected atmospheric background and two photographic passes');
const photoBackgrounds = await p
  .locator('.tf-hero')
  .evaluate(
    (el) =>
      [el, ...el.querySelectorAll('*')].filter((node) =>
        getComputedStyle(node).backgroundImage.includes('url('),
      ).length,
  );

await p.mouse.move(800, 400);
await p.waitForTimeout(100);
await p.locator('.tf-energy-stage').scrollIntoViewIfNeeded();
await p.waitForTimeout(600);
await p.screenshot({ path: '/tmp/tikflow-opening/energy.png' });
await p.goto(base, { waitUntil: 'networkidle' });
await p.waitForTimeout(250);
if (await p.locator('.tf-intro').evaluate((el) => getComputedStyle(el).display !== 'none'))
  throw Error('Returning visitor intro repeated');
const modes = [];
for (const mode of ['mobile', 'reduced', 'skip']) {
  const ctx = await b.newContext({
    viewport: mode === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    isMobile: mode === 'mobile',
    hasTouch: mode === 'mobile',
    reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference',
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/v1/auth/**', (r) =>
    r.fulfill({ status: 401, json: { message: 'Not signed in' } }),
  );
  await page.route('**/api/v1/events?**', (r) =>
    r.fulfill({
      json: { items: [], pagination: { page: 1, pageSize: 9, total: 0, totalPages: 0 } },
    }),
  );
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  if (mode === 'reduced') {
    await page.waitForTimeout(500);
    if (await page.locator('.tf-intro').evaluate((el) => getComputedStyle(el).display !== 'none'))
      throw Error('Reduced motion intro displayed');
  } else {
    if (mode === 'skip') {
      await page.locator('.tf-intro-skip').click();
    }
    await page.waitForFunction(
      () => document.querySelector('.tf-intro')?.dataset.phase === 'ready',
      null,
      { timeout: 12000 },
    );
  }
  if (mode === 'mobile') {
    await page.screenshot({ path: '/tmp/tikflow-opening/mobile-hero.png' });
    await page.locator('.tf-energy-stage').scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await page.screenshot({ path: '/tmp/tikflow-opening/mobile-energy.png' });
    if (await page.locator('html').evaluate((el) => el.classList.contains('lenis')))
      throw Error('Lenis enabled on touch mobile');
  }
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
    throw Error(`${mode} overflow`);
  modes.push({ mode, passed: true });
  await ctx.close();
}
console.log(JSON.stringify({ intro, heroMedia, photoBackgrounds, modes, errors }, null, 2));
await b.close();
if (errors.length) process.exitCode = 1;
