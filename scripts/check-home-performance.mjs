/* global document, window, getComputedStyle, sessionStorage, innerWidth */
import process from 'node:process';
import console from 'node:console';
import { setTimeout } from 'node:timers';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium, expect } from '@playwright/test';

// Read-only browser checks against a running API/web; never seeds or changes accounts.
const base = process.env.FLOW_QA_URL || 'http://127.0.0.1:3000';
const output = join(tmpdir(), 'tixflow-home-performance');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const results = [];
try {
  const slow = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // A legacy seen flag must never suppress the intro on a new document.
  await slow.addInitScript(() => sessionStorage.setItem('tikflow-ticket-intro-v5', 'seen'));
  const slowPage = await slow.newPage();
  await slowPage.route('**/*', async (route) => {
    if (route.request().resourceType() === 'script')
      await new Promise((resolve) => setTimeout(resolve, 2500));
    await route.continue();
  });
  await slowPage.goto(base, { waitUntil: 'commit', timeout: 180_000 });
  await expect(slowPage.locator('.tf-intro')).toBeVisible();
  await slowPage.screenshot({ path: join(output, 'first-paint-intro.png') });
  await expect(slowPage.locator('.tf-intro')).toBeHidden({ timeout: 2500 });
  await slowPage.waitForLoadState('networkidle');
  await expect(slowPage.locator('.tf-intro')).toBeHidden();
  await expect(slowPage.locator('.ch-title')).toBeVisible();
  results.push({ scenario: 'intro-before-hydration-and-bounded-exit', passed: true });
  await slowPage.locator('.tf-energy-stage').scrollIntoViewIfNeeded();
  await slowPage.reload({ waitUntil: 'commit' });
  await expect(slowPage.locator('.tf-intro')).toBeVisible();
  await expect(slowPage.locator('.tf-intro')).toBeHidden({ timeout: 2500 });
  await slowPage.waitForLoadState('networkidle');
  results.push({
    scenario: 'intro-replays-on-reload-with-existing-storage-and-scroll',
    passed: true,
  });
  await slow.close();

  for (const width of [1440, 1152, 1024, 390, 320]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      isMobile: width < 700,
      hasTouch: width < 700,
    });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(180_000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(base, { waitUntil: 'networkidle' });
    expect(response.status()).toBe(200);
    await expect(page.locator('.tf-intro')).toBeHidden();
    await expect(page.locator('.tf-nav')).toBeVisible();
    expect(
      await page.locator('.tf-nav-shell').evaluate((el) => el.scrollWidth > el.clientWidth + 1),
    ).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(
      false,
    );
    if (width > 1100) {
      const links = page.locator('.tf-nav-links a');
      await links.first().hover();
      await expect(page.locator('.tf-nav-hover')).toBeVisible();
      await page.mouse.move(900, 600);
    }
    await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
    await expect(page.locator('.tf-nav')).toHaveAttribute('data-hidden', 'true');
    await page.evaluate(() => window.scrollTo({ top: 650, behavior: 'instant' }));
    await expect(page.locator('.tf-nav')).toHaveAttribute('data-hidden', 'false');
    await expect
      .poll(() => page.locator('.tf-nav').evaluate((el) => el.getBoundingClientRect().top))
      .toBeGreaterThanOrEqual(0);
    const trigger = page.getByRole('button', { name: 'Open menu', exact: true });
    for (let repeat = 0; repeat < 2; repeat++) {
      await trigger.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect
        .poll(() => dialog.evaluate((el) => Number(getComputedStyle(el).opacity)))
        .toBe(1);
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    }
    await trigger.click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Search events', exact: true }).click();
    await expect(page.getByRole('searchbox', { name: 'Event name' })).toBeFocused();
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: join(output, `${width}-home.png`) });
    // Route transitions must not insert a delay before Next.js starts navigation.
    await page.locator('.tf-hero-actions a[href="/events"]').click();
    await expect(page).toHaveURL(/\/events$/);
    await expect(page.locator('[data-flow-route-transition]')).toBeHidden();
    await page.locator('.tf-brand').click();
    await expect(page).toHaveURL(new RegExp(`${base}/?$`));
    await expect(page.locator('.tf-intro')).toBeHidden();
    await page.locator('.tf-energy-title').scrollIntoViewIfNeeded();
    const spacing = await page.locator('.tf-energy-title').evaluate((el) => {
      const first = el.querySelector('[data-energy-word]').getBoundingClientRect();
      const line = el.querySelector('.tf-energy-line').getBoundingClientRect();
      const the = el.querySelector('.tf-energy-line > span').getBoundingClientRect();
      const flow = el.querySelector('.tf-energy-line em').getBoundingClientRect();
      return { lineGap: line.top - first.bottom, wordGap: flow.left - the.right };
    });
    expect(spacing.lineGap).toBeGreaterThanOrEqual(0);
    expect(spacing.wordGap).toBeGreaterThan(10);
    await page.screenshot({ path: join(output, `${width}-feel-the-flow.png`) });
    expect(errors).toEqual([]);
    results.push({ width, scenario: 'navbar-menu-search-navigation', passed: true });
    console.log(JSON.stringify(results.at(-1)));
    await context.close();
  }
  for (const options of [{ javaScriptEnabled: false }, { reducedMotion: 'reduce' }]) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle', timeout: 180_000 });
    await expect(page.locator('.tf-intro')).toBeHidden();
    await expect(page.locator('.ch-title')).toBeVisible();
    results.push({ scenario: JSON.stringify(options), passed: true });
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(join(output, 'results.json'), JSON.stringify(results, null, 2));
}
console.log(JSON.stringify({ passed: results.length, output }));
