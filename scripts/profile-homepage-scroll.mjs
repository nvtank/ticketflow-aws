/* global process, window, document, performance, scrollY, getComputedStyle, DOMMatrixReadOnly, requestAnimationFrame, setTimeout, console, Element */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const page = await b.newPage({ viewport: { width: 1440, height: 1000 } });
if (process.argv.includes('--reference')) {
  await page.goto('https://lenis.dev/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: '/tmp/lenis-reference.png' });
  console.log('Reference saved');
}
await page.goto(process.env.FLOW_QA_URL || 'http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.locator('#vibes').scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
await page.evaluate(() => {
  window.__samples = [];
  window.__wheels = [];
  window.__layoutReads = 0;
  const readRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function (...args) {
    window.__layoutReads++;
    return readRect.apply(this, args);
  };
  let last = performance.now();
  let until = last + 4500;
  const f = (t) => {
    const track = document.querySelector('.tf-vibe-track');
    window.__samples.push({
      dt: t - last,
      y: scrollY,
      x: track ? new DOMMatrixReadOnly(getComputedStyle(track).transform).m41 : 0,
    });
    last = t;
    if (t < until) requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
  window.addEventListener(
    'wheel',
    (e) => {
      setTimeout(() => window.__wheels.push({ prevented: e.defaultPrevented, y: e.deltaY }), 0);
    },
    { passive: true },
  );
});
await page.mouse.move(700, 550);
for (let i = 0; i < 12; i++) {
  await page.mouse.wheel(0, 110);
  await page.waitForTimeout(40);
}
await page.waitForTimeout(1500);
const result = await page.evaluate(() => {
  const a = window.__samples;
  let maxLag = 0;
  for (let i = 1; i < a.length; i++) {
    if (a[i].y === a[i - 1].y) maxLag = Math.max(maxLag, Math.abs(a[i].x - a[i - 1].x));
  }
  return {
    wheelPrevented: window.__wheels.filter((x) => x.prevented).length,
    wheelCount: window.__wheels.length,
    layoutReads: window.__layoutReads,
    frames: a.length,
    p95: a.map((x) => x.dt).sort((a, b) => a - b)[Math.floor(a.length * 0.95)],
    over34: a.filter((x) => x.dt > 34).length,
    maxTrackMotionAfterScrollStopped: maxLag,
    endX: a.at(-1)?.x,
  };
});
console.log(JSON.stringify(result));
await fs.writeFile(
  process.env.FLOW_PROFILE_OUT || '/tmp/flow-profile-before.json',
  JSON.stringify(result, null, 2),
);
await page.screenshot({ path: '/tmp/flow-horizontal-profile.png' });
await b.close();
