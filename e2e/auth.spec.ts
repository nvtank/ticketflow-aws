import { expect, test } from '@playwright/test';

test('registers, restores a shared session, protects roles, updates profile and revokes passwords', async ({
  page,
  context,
}, testInfo) => {
  const email = `browser-${Date.now()}-${testInfo.project.name}@example.com`;
  const password = 'Browser-password!2026';
  const changedPassword = 'Updated-browser-password!2026';
  await page.goto('/register');
  await page.getByLabel('Họ và tên', { exact: true }).fill('Browser Customer');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('heading', { name: 'Hồ sơ của tôi' })).toBeVisible();
  const firstCookie = (await context.cookies()).find((cookie) => cookie.name === 'tixflow_refresh');
  expect(firstCookie?.httpOnly).toBe(true);
  expect(firstCookie?.path).toBe('/api/v1/auth');
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeVisible();
  await page.goto('/profile');
  await page.getByLabel('Họ tên', { exact: true }).fill('Updated Browser Customer');
  await page.getByLabel('Số điện thoại', { exact: true }).fill('+84901234567');
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(page.getByText('Đã cập nhật hồ sơ.', { exact: true })).toBeVisible();
  const secondTab = await context.newPage();
  await Promise.all([page.reload(), secondTab.goto('/profile')]);
  for (const tab of [page, secondTab]) {
    await expect(tab.getByLabel('Họ tên', { exact: true })).toHaveValue('Updated Browser Customer');
    await expect(tab.getByLabel('Số điện thoại', { exact: true })).toHaveValue('+84901234567');
  }
  const rotated = (await context.cookies()).find((cookie) => cookie.name === 'tixflow_refresh');
  expect(rotated?.value).not.toBe(firstCookie?.value);
  await page.getByLabel('Mật khẩu hiện tại', { exact: true }).fill(password);
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill(changedPassword);
  await page.getByLabel('Xác nhận mật khẩu mới', { exact: true }).fill(changedPassword);
  await page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fprofile$/);
  await secondTab.reload();
  await expect(secondTab).toHaveURL(/\/login\?next=/);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(changedPassword);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fprofile$/);
  expect((await context.cookies()).some((cookie) => cookie.name === 'tixflow_refresh')).toBe(false);
});

test('reports actual PostgreSQL and Redis readiness', async ({ page }) => {
  await page.goto('/system');
  await expect(page.getByText('Đã kết nối', { exact: true })).toHaveCount(3);
  await expect(page.getByText('Chưa kết nối', { exact: true })).toHaveCount(0);
});
