import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
const password = 'TixFlowDemo!2026';
test.beforeAll(() => {
  const url =
    process.env.TEST_DATABASE_URL ??
    'postgresql://tixflow_test:tixflow_test_only@127.0.0.1:55432/tixflow_test';
  const parsed = new URL(url);
  if (
    !['localhost', '127.0.0.1'].includes(parsed.hostname) ||
    parsed.port !== '55432' ||
    parsed.pathname !== '/tixflow_test'
  )
    throw new Error('E2E seed requires local test database.');
  execFileSync('pnpm', ['--filter', '@tixflow/api', 'exec', 'node', 'dist/seed.js'], {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: url, NODE_ENV: 'test', DEMO_PASSWORD: password },
  });
});
test('organizer creates seats, admin rejects and approves, customer discovers the real event', async ({
  page,
  browser,
}, info) => {
  const title = `E2E Live ${info.project.name} ${Date.now()}`;
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('organizer@tixflow.local');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/organizer$/);
  await page.goto('/organizer/events/new');
  await page.getByLabel('Tổ chức', { exact: true }).selectOption({ label: 'TixFlow Live' });
  await page.getByLabel('Tên sự kiện', { exact: true }).fill(title);
  await page
    .getByLabel('Mô tả sự kiện', { exact: true })
    .fill('Một đêm nhạc tích hợp đầy đủ với dữ liệu PostgreSQL thực tế.');
  await page.getByLabel('Tên địa điểm', { exact: true }).fill('TixFlow Test Arena');
  await page.getByLabel('Thành phố', { exact: true }).fill('Đà Nẵng');
  await page.getByLabel('Địa chỉ', { exact: true }).fill('123 Đường E2E');
  await page
    .getByLabel('Chính sách mua và hoàn vé', { exact: true })
    .fill('Không hoàn vé sau khi thanh toán thành công.');
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
  await expect(page).toHaveURL(/\/organizer\/events\/[a-f0-9-]+$/);
  const id = page.url().split('/').pop()!;
  const standard = page.locator('fieldset').nth(0);
  await standard.getByLabel('Số hàng', { exact: true }).fill('2');
  await standard.getByLabel('Số cột', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Thêm khu vực', exact: true }).click();
  const vip = page.locator('fieldset').nth(1);
  await vip.getByLabel('Tên khu vực', { exact: true }).fill('VIP');
  await vip.getByLabel('Loại vé', { exact: true }).fill('VIP');
  await vip.getByLabel('Giá VND', { exact: true }).fill('1200000');
  await vip.getByLabel('Số hàng', { exact: true }).fill('1');
  await vip.getByLabel('Số cột', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Tạo sơ đồ ghế', exact: true }).click();
  await expect(page.getByText('Đã tạo sơ đồ ghế.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ghế A01: AVAILABLE', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Ghế A01: UNAVAILABLE', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Email nhân viên', { exact: true }).fill('staff@tixflow.local');
  await page.getByRole('button', { name: 'Phân công', exact: true }).click();
  await expect(page.getByText('staff@tixflow.local', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Gửi duyệt sự kiện', exact: true }).click();
  await expect(page.getByText('Chờ duyệt', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('organizer-seat-map.png'), fullPage: true });
  const adminContext = await browser.newContext({
    baseURL: 'http://127.0.0.1:3000',
    viewport: page.viewportSize() ?? undefined,
  });
  const admin = await adminContext.newPage();
  await admin.goto('/login');
  await admin.getByLabel('Email', { exact: true }).fill('admin@tixflow.local');
  await admin.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await admin.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(admin).toHaveURL(/\/admin$/);
  await admin.goto(`/admin/events/${id}`);
  await admin.getByRole('button', { name: 'Từ chối sự kiện', exact: true }).click();
  await admin
    .getByLabel('Lý do', { exact: true })
    .fill('Vui lòng bổ sung chính sách trước khi mở bán.');
  await admin.getByRole('button', { name: 'Xác nhận quyết định', exact: true }).click();
  await expect(admin.getByText('Bị từ chối', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Lý do từ chối:', { exact: false }).first()).toContainText('bổ sung');
  await page.getByText('Chỉnh sửa thông tin sự kiện', { exact: true }).click();
  await page
    .getByLabel('Chính sách mua và hoàn vé', { exact: true })
    .fill('Hoàn tiền nếu sự kiện bị hủy; không hoàn trong các trường hợp khác.');
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
  await expect(page.getByText('Bản nháp', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Gửi duyệt sự kiện', exact: true }).click();
  await expect(page.getByText('Chờ duyệt', { exact: true })).toBeVisible();
  await admin.reload();
  await admin.getByRole('button', { name: 'Phê duyệt sự kiện', exact: true }).click();
  await admin.getByRole('button', { name: 'Xác nhận quyết định', exact: true }).click();
  await expect(admin.getByText('Đã công bố', { exact: true })).toBeVisible();
  await expect(admin.getByText('Phê duyệt', { exact: true })).toBeVisible();
  expect(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await admin.screenshot({ path: info.outputPath('admin-event-review.png'), fullPage: true });
  const customerContext = await browser.newContext({
    baseURL: 'http://127.0.0.1:3000',
    viewport: page.viewportSize() ?? undefined,
  });
  const customer = await customerContext.newPage();
  await customer.goto('/events');
  await customer.getByLabel('Tìm sự kiện theo tên').fill(title);
  await customer.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await expect(customer).toHaveURL(/q=/);
  await customer.getByRole('link', { name: 'Xem chi tiết', exact: true }).click();
  await expect(customer.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(customer.getByText('Còn 2/2 ghế', { exact: false })).toBeVisible();
  await customer.screenshot({ path: info.outputPath('published-event.png'), fullPage: true });
  expect(await customer.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
    true,
  );
  await adminContext.close();
  await customerContext.close();
});
