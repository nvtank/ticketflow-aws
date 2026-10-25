/* global process, console, document, window, getComputedStyle, DOMMatrixReadOnly, sessionStorage, innerWidth, innerHeight */
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
const base = process.env.FLOW_QA_URL || 'http://127.0.0.1:3000/';
const b = await chromium.launch({ args: ['--no-sandbox'] });
await fs.mkdir('/tmp/tikflow-nav-motion', { recursive: true });
for (const width of [1440, 390, 320]) {
  const c = await b.newContext({
    viewport: { width, height: 1000 },
    isMobile: width < 700,
    hasTouch: width < 700,
  });
  const p = await c.newPage();
  p.setDefaultNavigationTimeout(180_000);
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.stack));
  p.on('console', (m) => {
    if (m.type() === 'error' && /RangeError|Maximum call stack/.test(m.text()))
      errors.push(m.text());
  });
  await p.addInitScript(() => sessionStorage.setItem('tikflow-ticket-intro-v5', 'seen'));
  await p.route('**/api/v1/auth/refresh', (r) =>
    r.fulfill({ status: 401, json: { message: 'QA' } }),
  );
  await p.goto(base, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => document.querySelector('.tf-intro')?.dataset.phase === 'ready');
  await p.waitForTimeout(2300);
  await p.screenshot({ path: `/tmp/tikflow-nav-motion/${width}-hero.png` });
  if (width > 1100) {
    const links = p.locator('.tf-nav-links a');
    await links.nth(0).hover();
    await p.waitForTimeout(500);
    const before = await p.locator('.tf-nav-hover').evaluate((x) => getComputedStyle(x).transform);
    await links.nth(2).hover();
    await p.waitForTimeout(500);
    const after = await p.locator('.tf-nav-hover').evaluate((x) => getComputedStyle(x).transform);
    if (before === after) throw Error('Highlight did not move');
    await p.screenshot({ path: `/tmp/tikflow-nav-motion/${width}-hover.png` });
    await p.mouse.move(800, 600);
    await p.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo(0, 900);
    });
    await p.waitForTimeout(1000);
    await expect(p.locator('.tf-nav')).toHaveAttribute('data-hidden', 'true');
    await p.evaluate(() => window.scrollTo(0, 650));
    await p.waitForTimeout(800);
    await expect(p.locator('.tf-nav')).toHaveAttribute('data-hidden', 'false');
    const scale = await p
      .locator('.tf-nav-shell')
      .evaluate((x) => new DOMMatrixReadOnly(getComputedStyle(x).transform).a);
    if (scale >= 0.99) throw Error('Navbar did not compact');
  }
  const trigger = p.getByRole('button', { name: 'Open menu', exact: true });
  await trigger.focus();
  await trigger.click();
  await p.waitForTimeout(2500);
  const dialog = p.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await p.screenshot({ path: `/tmp/tikflow-nav-motion/${width}-menu.png` });
  const overflow = await dialog.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return (
      el.scrollWidth > el.clientWidth + 1 ||
      r.left < 0 ||
      r.top < 0 ||
      r.right > innerWidth + 1 ||
      r.bottom > innerHeight + 1
    );
  });
  if (overflow) throw Error('Menu overflow');
  // Changing the preference must leave the entire menu visible.
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await expect(dialog).toBeVisible();
  await expect
    .poll(() => dialog.evaluate((el) => getComputedStyle(el).clipPath))
    .not.toContain('100%');
  await p.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await p.emulateMedia({ reducedMotion: 'no-preference' });
  // Reopening immediately also exercises timeline cleanup and focus restoration.
  await trigger.click();
  await expect(dialog).toBeVisible();
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() => dialog.evaluate((el) => getComputedStyle(el).clipPath))
    .not.toContain('100%');
  await p.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await p.getByRole('button', { name: 'Search events', exact: true }).click();
  await expect(p.getByRole('searchbox', { name: 'Event name' })).toBeFocused();
  await p.keyboard.press('Escape');
  if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
    throw Error('Page overflow');
  if (errors.length) throw Error(errors.join('\n'));
  console.log(JSON.stringify({ width, passed: true, errors }));
  await c.close();
}
await b.close();
