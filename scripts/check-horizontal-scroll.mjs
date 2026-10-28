/* global document, window, getComputedStyle, DOMMatrixReadOnly */
import process from 'node:process';
import console from 'node:console';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium, expect } from '@playwright/test';

const base = process.env.FLOW_QA_URL || 'http://127.0.0.1:3000';
const output = join(tmpdir(), 'tixflow-horizontal-scroll');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const results = [];
const measure = (page) =>
  page.evaluate(() => {
    const section = document.querySelector('.tf-vibes');
    const track = section.querySelector('.tf-vibe-track');
    const card = track.querySelector('.tf-vibe');
    const rect = section.getBoundingClientRect();
    const spacer = section.parentElement.getBoundingClientRect();
    const matrix = new DOMMatrixReadOnly(getComputedStyle(card).transform);
    return {
      y: window.scrollY,
      start: spacer.top + window.scrollY,
      sectionTop: rect.top,
      sectionHeight: rect.height,
      sectionWidth: rect.width,
      position: getComputedStyle(section).position,
      trackX: new DOMMatrixReadOnly(getComputedStyle(track).transform).e,
      cardScale: Math.hypot(matrix.a, matrix.b),
      documentHeight: document.documentElement.scrollHeight,
      spacerHeight: spacer.height,
    };
  });
const move = async (page, y) => {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y);
  await delay(200);
  return measure(page);
};
try {
  for (const width of [1440, 1024]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(180_000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let releaseEvents;
    const heldEvents = new Promise((resolve) => {
      releaseEvents = resolve;
    });
    await page.route('**/api/v1/events?*', async (route) => {
      await heldEvents;
      await route.continue();
    });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      document.querySelector('.tf-vibes')?.parentElement?.classList.contains('pin-spacer'),
    );
    await expect(page.locator('.tf-intro')).toBeHidden();
    const pending = await measure(page);
    const response = page.waitForResponse(
      (response) => response.url().includes('/api/v1/events?') && response.status() === 200,
    );
    releaseEvents();
    await response;
    await expect(page.locator('.tf-mosaic .tf-poster').first()).toBeVisible();
    await delay(250);
    const loaded = await measure(page);
    expect(loaded.start).toBeGreaterThan(pending.start + 20);
    const betweenOldAndNewStart = await move(page, (pending.start + loaded.start) / 2);
    expect(betweenOldAndNewStart.position).not.toBe('fixed');
    expect(Math.abs(betweenOldAndNewStart.trackX)).toBeLessThan(1);
    expect(
      Math.abs(betweenOldAndNewStart.sectionTop - (loaded.start - betweenOldAndNewStart.y)),
    ).toBeLessThan(2);
    const samples = [];
    for (const offset of [-300, -120, -2, 2, 100, 400, 800]) {
      const sample = await move(page, loaded.start + offset);
      expect(Math.abs(sample.documentHeight - loaded.documentHeight)).toBeLessThan(3);
      expect(Math.abs(sample.sectionWidth - loaded.sectionWidth)).toBeLessThan(2);
      expect(Math.abs(sample.cardScale - 1)).toBeLessThan(0.002);
      if (offset < 0) {
        expect(sample.position).not.toBe('fixed');
        expect(Math.abs(sample.trackX)).toBeLessThan(1);
        expect(Math.abs(sample.sectionTop - (loaded.start - sample.y))).toBeLessThan(2);
      } else {
        expect(sample.position).toBe('fixed');
        expect(Math.abs(sample.sectionTop)).toBeLessThan(2);
      }
      samples.push(sample);
    }
    await page.screenshot({ path: join(output, `${width}-horizontal.png`) });
    // Real wheel input must advance gradually across the boundary in both directions.
    let previous = await move(page, loaded.start - 240);
    await page.mouse.move(width / 2, 700);
    for (const amount of [80, 80, 80, 80, 80, -80, -80, -80, -80, -80]) {
      await page.mouse.wheel(0, amount);
      await delay(220);
      const current = await measure(page);
      expect(Math.abs(current.y - previous.y)).toBeLessThan(100);
      expect(Math.sign(current.y - previous.y)).toBe(Math.sign(amount));
      if (current.y < loaded.start - 2) expect(current.position).not.toBe('fixed');
      previous = current;
    }
    const exit = await move(page, loaded.start + loaded.spacerHeight - loaded.sectionHeight + 100);
    expect(exit.position).not.toBe('fixed');
    const reverse = await move(page, loaded.start - 100);
    expect(reverse.position).not.toBe('fixed');
    expect(Math.abs(reverse.trackX)).toBeLessThan(1);
    expect(errors).toEqual([]);
    results.push({ width, passed: true, layoutShift: loaded.start - pending.start, samples });
    console.log(JSON.stringify({ width, passed: true, layoutShift: loaded.start - pending.start }));
    await context.close();
  }
  for (const options of [
    { viewport: { width: 390, height: 900 }, isMobile: true, hasTouch: true },
    { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' },
  ]) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle', timeout: 180_000 });
    await expect(page.locator('.tf-intro')).toBeHidden();
    await expect(page.locator('.pin-spacer .tf-vibes')).toHaveCount(0);
    await page.locator('.tf-vibes').scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    await page.locator('.tf-vibe-window').evaluate((el) => {
      el.scrollLeft = 180;
    });
    expect(await page.locator('.tf-vibe-window').evaluate((el) => el.scrollLeft)).toBeGreaterThan(
      100,
    );
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThan(2);
    results.push({ options, passed: true });
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(join(output, 'results.json'), JSON.stringify(results, null, 2));
}
console.log(JSON.stringify({ passed: results.length, output }));
