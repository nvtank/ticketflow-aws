import { expect, test } from '@playwright/test';

// Read-only browser checks against the running local app and its actual API.
// Start with pnpm dev (or built API/web) before this suite; no database reseed.
test('world home connects real discovery and accessible journey controls', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Đừng chỉ');
  await expect(page.locator('.world-scene img')).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('.world-scene img')
        .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  const tabs = page.getByRole('tablist', { name: 'Các bước đặt vé' });
  await tabs.getByRole('tab', { name: /Chọn ghế/ }).click();
  await expect(page.getByRole('tabpanel')).toContainText('5 phút');
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: /Nhận vé/ })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText('vé QR');
  await page.keyboard.press('Home');
  await expect(tabs.getByRole('tab', { name: /Khám phá/ })).toBeFocused();
  await page.getByLabel('Tìm trải nghiệm của bạn').fill('TixFlow');
  await page.getByRole('button', { name: 'Tìm sự kiện', exact: true }).click();
  await expect(page).toHaveURL(/\/events\?q=TixFlow/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test('floating navigation preserves focus, routes and category filters', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  await page.getByRole('region', { name: 'Danh mục sự kiện' }).scrollIntoViewIfNeeded();
  await expect(page.locator('header')).toHaveAttribute('data-scrolled', 'true');
  await page.getByRole('button', { name: 'Danh mục tiếp theo' }).click();
  await expect
    .poll(() => page.locator('.biome-rail').evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(100);
  await page
    .getByRole('region', { name: 'Danh mục sự kiện' })
    .getByRole('link')
    .filter({ hasText: 'Hội nghị' })
    .click();
  await expect(page).toHaveURL(/category=CONFERENCE/);
  if (isMobile) {
    const trigger = page.getByRole('button', { name: 'Mở menu', exact: true });
    await trigger.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Điều hướng trên di động' })
      .getByRole('link', { name: 'Về TixFlow', exact: true })
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  } else {
    await page
      .getByRole('navigation', { name: 'Điều hướng chính', exact: true })
      .getByRole('link', { name: 'Về TixFlow', exact: true })
      .click();
  }
  await expect(page).toHaveURL('/about');
  await expect(page.locator('.world-progress')).toHaveCount(0);
  await page.locator('header').getByRole('link', { name: 'TixFlow · Trang chủ' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('.world-scene')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('reduced motion and repeated navigation keep content and layouts intact', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const route of [
    '/',
    '/events',
    '/',
    '/login',
    '/register',
    '/artists',
    '/community',
    '/guide',
    '/contributors',
  ]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      route,
    ).toBe(true);
    await expect(page.getByRole('main')).toHaveCount(1);
    if (route === '/') {
      await expect(page.locator('.world-progress')).toBeHidden();
      expect(
        await page.locator('.world-scene').evaluate((el) => getComputedStyle(el).transform),
      ).toBe('none');
      await page.screenshot({ path: info.outputPath('home-reduced-motion.png'), fullPage: true });
    }
  }
  expect(errors).toEqual([]);
});

test('event API failure has an honest retry state', async ({ page }) => {
  // Network fault injection is confined to this test; no fake event response.
  await page.route('**/api/v1/events?*', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Chưa thể tải dữ liệu' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Thử lại', exact: true })).toBeVisible();
  await page.unroute('**/api/v1/events?*');
  const response = page.waitForResponse(
    (response) => response.url().includes('/api/v1/events?') && response.status() === 200,
  );
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await response;
  await expect(page.getByRole('heading', { name: 'Chưa thể tải dữ liệu' })).not.toBeVisible();
});
