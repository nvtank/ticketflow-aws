import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';
const password = 'TixFlowDemo!2026';
test.beforeAll(() => {
  const url =
      process.env.TEST_DATABASE_URL ??
      'postgresql://tixflow_test:tixflow_test_only@127.0.0.1:55432/tixflow_test',
    p = new URL(url);
  if (
    !['localhost', '127.0.0.1'].includes(p.hostname) ||
    p.port !== '55432' ||
    p.pathname !== '/tixflow_test'
  )
    throw new Error('Requires isolated local test DB.');
  execFileSync('pnpm', ['--filter', '@tixflow/api', 'exec', 'node', 'dist/seed.js'], {
    stdio: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: url,
      DEMO_PASSWORD: password,
      TICKET_SIGNING_KEY: 'test-only-persistent-ticket-signing-key-for-isolated-database-2026',
    },
  });
});

async function loginAs(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
async function metric(page: Page, label: string) {
  return Number(
    await page.getByText(label, { exact: true }).locator('..').locator('p').last().innerText(),
  );
}
test('customer buys a ticket, assigned staff admits once and organizer sees the updated attendance', async ({
  page,
  browser,
}, info) => {
  await page.goto('/register');
  await page.getByLabel('Họ và tên', { exact: true }).fill('Khách check-in');
  await page.getByLabel('Email', { exact: true }).fill(`checkin-${crypto.randomUUID()}@e2e.local`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  const response = await page.request.get('http://127.0.0.1:4000/api/v1/events?q=TixFlow%20Music');
  const events = (await response.json()) as { items: { id: string; slug: string }[] };
  const event = events.items[0]!;
  await page.goto(`/events/${event.slug}/booking`);
  await page
    .getByRole('button', { name: /^Ghế .*: Còn trống$/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Xác nhận giữ ghế', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp tục đến đơn hàng', exact: true }).click();
  await page.getByRole('button', { name: 'Thanh toán mô phỏng (local)', exact: true }).click();
  await page.getByRole('button', { name: 'Thanh toán thành công', exact: true }).click();
  await page.getByRole('link', { name: 'Xem vé của tôi', exact: true }).click();
  await page.getByRole('link', { name: 'Xem vé', exact: true }).first().click();
  const code = (await page.getByText(/^TF-[A-F0-9]{32}$/).innerText()).trim();
  await expect(page.getByRole('img', { name: /^Mã QR vé/ })).toBeVisible();
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:3000',
    viewport: page.viewportSize() ?? undefined,
  });
  const staff = await context.newPage();
  await loginAs(staff, 'staff@tixflow.local');
  await staff.goto(`/staff/events/${event.id}/scan`);
  await expect(staff.getByRole('heading', { name: 'Quét vé vào cổng', exact: true })).toBeVisible();
  const before = await metric(staff, 'Đã check-in');
  const orgContext = await browser.newContext({
    baseURL: 'http://127.0.0.1:3000',
    viewport: page.viewportSize() ?? undefined,
  });
  const org = await orgContext.newPage();
  await loginAs(org, 'organizer@tixflow.local');
  await org.goto('/organizer/analytics');
  await expect(org.getByText('Tổng check-in', { exact: true })).toBeVisible();
  const prior = await metric(org, 'Tổng check-in');
  await staff.getByLabel('Mã vé hoặc dữ liệu QR', { exact: true }).fill(code);
  await staff.getByRole('button', { name: 'Kiểm tra vé', exact: true }).click();
  await expect(staff.getByText('Vé hợp lệ, sẵn sàng check-in.', { exact: true })).toBeVisible();
  await staff.getByRole('button', { name: 'Xác nhận vào cổng', exact: true }).click();
  await expect(staff.getByText('Check-in thành công.', { exact: true })).toBeVisible();
  await expect.poll(() => metric(staff, 'Đã check-in')).toBe(before + 1);
  await staff.getByRole('button', { name: 'Kiểm tra vé', exact: true }).click();
  await expect(staff.getByText('Vé đã được sử dụng.', { exact: true })).toBeVisible();
  await expect(staff.getByRole('button', { name: 'Xác nhận vào cổng', exact: true })).toHaveCount(
    0,
  );
  await org.reload();
  await expect.poll(() => metric(org, 'Tổng check-in')).toBe(prior + 1);
  expect(await staff.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await staff.screenshot({ path: info.outputPath('staff-admission.png'), fullPage: true });
  await org.screenshot({ path: info.outputPath('organizer-analytics.png'), fullPage: true });
  await context.close();
  await orgContext.close();
});
