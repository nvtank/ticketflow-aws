import { expect, test } from '@playwright/test';

test('home has Vietnamese navigation and no invented event inventory', async ({
  page,
}, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Đừng chỉ nghe kể.');
  await expect(
    page.getByRole('heading', { name: 'Những sự kiện mới đang được chuẩn bị' }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.getByRole('main')).toHaveCount(1);
  expect(pageErrors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true });
});

test('event search persists in URL and follows browser history', async ({ page }) => {
  await page.goto('/events?category=MUSIC');
  await page.getByLabel('Tìm sự kiện theo tên').fill('Đà Nẵng');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await expect(page).toHaveURL(/q=%C4%90%C3%A0\+N%E1%BA%B5ng/);
  await expect(page).toHaveURL(/category=MUSIC/);
  await page.getByLabel('Tìm sự kiện theo tên').fill('Hà Nội');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await expect(page).toHaveURL(/q=H%C3%A0\+N%E1%BB%99i/);
  await page.goBack();
  await expect(page.getByLabel('Tìm sự kiện theo tên')).toHaveValue('Đà Nẵng');
});

test('health page reports actual missing dependencies and can refresh', async ({ page }) => {
  await page.goto('/system');
  await expect(page.getByText('Đã kết nối', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Chưa kết nối', { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Kiểm tra lại' }).click();
  await expect(
    page.getByText('API hoạt động; một số dịch vụ chưa kết nối.', { exact: true }),
  ).toBeVisible();
});

for (const route of ['/organizer', '/staff', '/admin']) {
  test(`${route} identifies the preview without private data`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText('Bản xem trước · Phase 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Đây là bản xem trước bố cục', { exact: false })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });
}

test('public layout fits the viewport and keyboard skip link works', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Đến nội dung chính' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('unimplemented routes return a real 404', async ({ page }) => {
  const response = await page.goto('/route-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Có vẻ bạn đã lạc nhịp.' })).toBeVisible();
});

test('navigation adapts to viewport and mobile dialog manages focus', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  if (!isMobile) {
    await expect(
      page.getByRole('navigation', { name: 'Điều hướng chính', exact: true }),
    ).toBeVisible();
    return;
  }
  const trigger = page.getByRole('button', { name: 'Mở menu', exact: true });
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press('Tab');
    expect(
      await page
        .getByRole('dialog')
        .evaluate((element) => element.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
