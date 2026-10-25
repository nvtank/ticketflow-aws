/* global process, document, window, getComputedStyle, URL, console */
import { chromium, expect } from '@playwright/test';

const base = process.env.FLOW_QA_URL || 'http://127.0.0.1:3000/';
const origin = new URL(base).origin;
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const results = [];

function captureErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack || error.message));
  // React catches cleanup errors: they can reach console.error without a pageerror event.
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /Maximum call stack|RangeError|Uncaught|above error occurred/i.test(message.text())
    )
      errors.push(message.text());
  });
  return errors;
}
async function healthy(page, errors) {
  if (errors.length) throw Error(errors.join('\n'));
  await expect(page.locator('#main-content h1').first()).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('[data-flow-route-transition]')
        .evaluateAll((nodes) =>
          nodes.every(
            (node) =>
              getComputedStyle(node).visibility === 'hidden' ||
              getComputedStyle(node).pointerEvents === 'none',
          ),
        ),
    )
    .toBe(true);
  if (errors.length) throw Error(errors.join('\n'));
}
async function destination(page, path) {
  await page.waitForURL((url) => url.pathname === path, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
}

const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = captureErrors(page);
await page.route('**/api/v1/auth/refresh', (route) =>
  route.fulfill({ status: 401, json: { message: 'Navigation QA: anonymous session' } }),
);
await page.goto(base, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForFunction(
  () => document.querySelector('.tf-intro')?.dataset.phase === 'ready',
  null,
  { timeout: 30000 },
);

const scenarios = [
  {
    name: 'CTA after complete first-visit intro',
    path: '/events',
    selector: '.tf-hero .tf-button',
  },
  { name: 'Artists navbar', path: '/artists', selector: '.tf-nav-links a[href="/artists"]' },
  { name: 'About navbar', path: '/about', selector: '.tf-nav-links a[href="/about"]' },
  { name: 'Community navbar', path: '/community', selector: '.tf-nav-links a[href="/community"]' },
  { name: 'Guide navbar', path: '/guide', selector: '.tf-nav-links a[href="/guide"]' },
  {
    name: 'Contributors menu',
    path: '/contributors',
    menu: true,
    selector: '.tf-site-menu a[href="/contributors"]',
  },
  { name: 'Featured event', event: true, selector: '.tf-mosaic .tf-poster' },
  { name: 'Radar event', event: true, selector: '.tf-radar-card[data-active="true"] .tf-poster' },
  {
    name: 'My tickets authentication',
    path: '/login',
    selector: '.tf-nav-links a[href="/my-tickets"]',
  },
  {
    name: 'Organizer authentication',
    path: '/login',
    menu: true,
    selector: '.tf-site-menu a[href="/organizer"]',
  },
];
for (const scenario of scenarios.filter(
  (s) => !process.env.FLOW_NAV_CASES || process.env.FLOW_NAV_CASES.split(',').includes(s.name),
)) {
  await page.evaluate(() => window.scrollTo(0, 0));
  if (scenario.menu) {
    const trigger = page.getByRole('button', { name: 'Open menu', exact: true });
    await trigger.focus();
    await trigger.press('Enter');
    try {
      await expect(page.locator('.tf-site-menu')).toBeVisible();
    } catch (error) {
      console.log(
        'MENU',
        scenario.name,
        page.url(),
        await page.locator('.tf-nav').evaluate((el) => el.outerHTML),
      );
      throw error;
    }
  }
  if (scenario.event) {
    await page
      .locator(scenario.name.startsWith('Radar') ? '.tf-radar' : '#featured')
      .scrollIntoViewIfNeeded();
    await page.waitForTimeout(2200);
  }
  const link = page.locator(scenario.selector).first();
  await link.focus();
  const path = scenario.event
    ? new URL(await link.getAttribute('href'), origin).pathname
    : scenario.path;
  await link.click();
  try {
    await destination(page, path);
  } catch (error) {
    console.log(
      JSON.stringify({
        failedScenario: scenario.name,
        actualUrl: page.url(),
        expectedPath: path,
        errors,
        body: (await page.locator('body').innerText()).slice(-2200),
      }),
    );
    throw error;
  }
  await healthy(page, errors);
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await destination(page, '/');
  await expect(page.locator('.ch-title')).toBeVisible();
  await expect(page.locator('.tf-intro')).toBeHidden();
  if (errors.length) throw Error(errors.join('\n'));
  results.push({ scenario: scenario.name, passed: true });
  console.log('PASS', scenario.name);
}
await page.locator('.tf-hero .tf-button').click();
await destination(page, '/events');
await healthy(page, errors);
await page.goBack({ waitUntil: 'domcontentloaded' });
await destination(page, '/');
await page.goForward({ waitUntil: 'domcontentloaded' });
await destination(page, '/events');
await healthy(page, errors);
results.push({ scenario: 'Browser Back / Forward', passed: true });
await context.close();

for (const mode of ['early-intro-exit', 'mobile-menu', 'reduced-motion']) {
  const c = await browser.newContext({
    viewport: mode === 'mobile-menu' ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    isMobile: mode === 'mobile-menu',
    hasTouch: mode === 'mobile-menu',
    reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference',
  });
  const p = await c.newPage();
  const failures = captureErrors(p);
  await p.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({ status: 401, json: { message: 'Navigation QA: anonymous session' } }),
  );
  await p.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
  if (mode === 'early-intro-exit') {
    await p.waitForFunction(() =>
      ['loading', 'expanding'].includes(document.querySelector('.tf-intro')?.dataset.phase),
    );
    const link = p.locator('.tf-nav-links a[href="/artists"]');
    await link.focus();
    await p.keyboard.press('Enter');
  } else if (mode === 'mobile-menu') {
    await p.waitForFunction(
      () => document.querySelector('.tf-intro')?.dataset.phase === 'ready',
      null,
      { timeout: 30000 },
    );
    await p.getByRole('button', { name: 'Open menu', exact: true }).click();
    await p.getByRole('dialog').locator('a[href="/artists"]').click();
  } else {
    await p.locator('.tf-nav-links a[href="/artists"]').click();
  }
  await destination(p, '/artists');
  await healthy(p, failures);
  await p.goBack({ waitUntil: 'domcontentloaded' });
  await destination(p, '/');
  await expect(p.locator('.ch-title')).toBeVisible();
  if (failures.length) throw Error(failures.join('\n'));
  results.push({ scenario: mode, passed: true });
  await c.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
