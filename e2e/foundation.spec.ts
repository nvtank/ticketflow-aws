import { expect, test } from '@playwright/test';

test('home has Vietnamese navigation and no invented event inventory', async ({
  page,
}, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Đừng chỉ nghe kể.');
  await expect(page.getByRole('heading', { name: 'Chưa thể tải dữ liệu' })).toBeVisible();
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
  test(`${route} redirects anonymous visitors to login`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(
      (url) => url.pathname === '/login' && url.searchParams.get('next') === route,
    );
    await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
    await expect(page.getByText('Tài khoản được xác minh', { exact: true })).toHaveCount(0);
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

test('authentication forms validate locally and show a real API failure honestly', async ({
  page,
}, testInfo) => {
  await page.goto('/register');
  await page.getByLabel('Họ và tên', { exact: true }).fill('A');
  await page.getByLabel('Email', { exact: true }).fill('invalid-email');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('short');
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await expect(page.getByText('Email không hợp lệ.', { exact: true })).toBeVisible();
  await expect(page.getByText('Mật khẩu cần ít nhất 12 ký tự.', { exact: true })).toBeVisible();
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('customer@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Example-password!2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Dịch vụ tạm thời không khả dụng.',
  );
  await expect(page).toHaveURL(/\/login$/);
  await page.screenshot({ path: testInfo.outputPath('login-error.png'), fullPage: true });
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
