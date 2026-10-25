/* global process, innerWidth, document, window, console, getComputedStyle */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const shots = process.env.FLOW_QA_OUTPUT || join(tmpdir(), 'tikflow-qa');
await fs.mkdir(shots, { recursive: true });
const fixture = {
  items: Array.from({ length: 7 }, (_, i) => ({
    id: `qa-${i}`,
    slug: `qa-event-${i}`,
    title: [
      'Đêm nhạc Sài Gòn — Demo',
      'Những ngày rực rỡ — Demo',
      'Live at midnight — Demo',
      'Sống cùng âm nhạc — Demo',
    ][i % 4],
    category: 'MUSIC',
    city: 'TP. Hồ Chí Minh',
    venueName: 'Sân khấu minh họa',
    startsAt: '2026-11-21T12:00:00.000Z',
    coverUrl: null,
    minPriceVnd: 350000,
    availableSeats: 0,
  })),
  pagination: { page: 1, pageSize: 9, total: 7, totalPages: 1 },
};
const results = [];
for (const mode of ['desktop', 'mobile', 'reduced']) {
  const context = await browser.newContext({
    viewport: mode === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference',
    isMobile: mode === 'mobile',
    hasTouch: mode === 'mobile',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/v1/events?**', (route) => route.fulfill({ json: fixture }));
  await page.route('**/api/v1/auth/**', (route) =>
    route.fulfill({ status: 401, json: { message: 'Not signed in' } }),
  );
  await page.goto(process.env.FLOW_QA_URL || 'http://127.0.0.1:3000/', {
    waitUntil: 'networkidle',
  });
  await page.waitForFunction(
    () => {
      const intro = document.querySelector('.tf-intro');
      return (
        !intro || getComputedStyle(intro).display === 'none' || intro.dataset.phase === 'ready'
      );
    },
    null,
    { timeout: 12000 },
  );
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shots}/${mode}-hero.png` });
  const titleHeight = await page.locator('h1').evaluate((el) => el.getBoundingClientRect().height);
  if (titleHeight > (mode === 'mobile' ? 350 : 800))
    throw Error(`Hero title height invalid: ${titleHeight}`);
  const overflow = await page.evaluate(() => ({
    width: innerWidth,
    doc: document.documentElement.scrollWidth,
    font: document.fonts.check('16px "Be Vietnam Pro"'),
  }));
  if (overflow.doc > overflow.width + 1)
    throw Error(`${mode} horizontal overflow ${JSON.stringify(overflow)}`);
  await page.getByRole('button', { name: 'Search events', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Event name' }).fill('concert');
  await page.keyboard.press('Escape');
  if (await page.getByRole('dialog').count()) throw Error('Search did not close');
  if (mode === 'mobile') {
    await page.getByRole('button', { name: 'Open menu' }).click();
    if (!(await page.getByRole('navigation', { name: 'All pages' }).isVisible()))
      throw Error('Mobile menu missing');
    await page.keyboard.press('Escape');
  }
  await page.locator('#ticket').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Flip to explore' }).click();
  await page.waitForTimeout(800);
  if (
    (await page.getByRole('button', { name: 'Show front' }).getAttribute('aria-pressed')) !== 'true'
  )
    throw Error('Ticket flip failed');
  await page.locator('.tf-booking').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.getByRole('tab', { name: '02 PICK A PASS' }).click();
  await page.waitForTimeout(800);
  await page.getByRole('radio', { name: 'BACKSTAGE' }).check();
  await page.getByRole('button', { name: 'Preview your ticket' }).click();
  await page.waitForTimeout(800);
  if (
    !(await page.locator('#tf-demo-panel').getByRole('heading', { name: 'BACKSTAGE' }).isVisible())
  )
    throw Error('Ticket selection did not persist');
  await page.screenshot({ path: `${shots}/${mode}-booking.png` });
  await page.locator('.tf-trending').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Next events' }).click();
  await page.waitForTimeout(700);
  const rail = await page.locator('.tf-event-rail').evaluate((el) => el.scrollLeft);
  if (rail < 10) throw Error('Carousel did not move');
  const images = await page
    .locator('.tf-home img')
    .evaluateAll((imgs) =>
      imgs.filter((im) => im.complete && im.naturalWidth === 0).map((im) => im.src),
    );
  if (images.length) throw Error(`Broken images: ${images}`);
  await page.locator('.tf-finale').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}/${mode}-finale.png` });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${shots}/${mode}-full.png`, fullPage: true });
  results.push({ mode, overflow, carouselScroll: rail, errors });
  if (errors.length) throw Error(errors.join('\n'));
  await context.close();
}
const failureContext = await browser.newContext({ reducedMotion: 'reduce' });
const failurePage = await failureContext.newPage();
let recovered = false;
await failurePage.route('**/api/v1/events?**', (route) =>
  route.fulfill(
    recovered ? { json: fixture } : { status: 503, json: { message: 'QA simulated outage' } },
  ),
);
await failurePage.route('**/api/v1/auth/**', (route) =>
  route.fulfill({ status: 401, json: { message: 'Not signed in' } }),
);
await failurePage.goto(process.env.FLOW_QA_URL || 'http://127.0.0.1:3000/');
await failurePage.getByRole('button', { name: 'Try again ↗' }).first().waitFor();
recovered = true;
await failurePage.getByRole('button', { name: 'Try again ↗' }).first().click();
await failurePage.locator('.tf-mosaic .tf-poster').first().waitFor();
await failurePage.evaluate(() => window.scrollTo(0, 0));
await failurePage.waitForTimeout(400);
await failurePage.getByRole('button', { name: 'Search events', exact: true }).click();
await failurePage.getByRole('searchbox', { name: 'Event name' }).fill('concert');
await failurePage.getByRole('button', { name: 'Search', exact: true }).click();
await failurePage.waitForURL('**/events?q=concert');
results.push({ mode: 'API retry and search navigation', passed: true });
await failureContext.close();
const nativeContext = await browser.newContext({ javaScriptEnabled: false });
const nativePage = await nativeContext.newPage();
await nativePage.goto(process.env.FLOW_QA_URL || 'http://127.0.0.1:3000/');
if (!(await nativePage.locator('h1').isVisible()))
  throw Error('Primary content missing without JS');
if (!(await nativePage.locator('.tf-hero .tf-button').isVisible()))
  throw Error('Discovery CTA missing without JS');
results.push({ mode: 'JavaScript disabled', passed: true });
await nativeContext.close();
console.log(JSON.stringify(results, null, 2));
await browser.close();
