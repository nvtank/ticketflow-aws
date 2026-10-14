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
async function login(page: Page, register = true) {
  await page.goto(register ? '/register' : '/login');
  if (register) await page.getByLabel('Họ và tên', { exact: true }).fill('Khách thanh toán');
  await page
    .getByLabel('Email', { exact: true })
    .fill(register ? `payment-${crypto.randomUUID()}@e2e.local` : 'customer2@tixflow.local');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page
    .getByRole('button', { name: register ? 'Tạo tài khoản' : 'Đăng nhập', exact: true })
    .click();
  await expect(page).toHaveURL(/\/profile$/);
}
async function checkout(page: Page, count = 2) {
  const response = await page.request.get('http://127.0.0.1:4000/api/v1/events?q=TixFlow%20Music');
  const body = (await response.json()) as { items: { slug: string }[] };
  await page.goto(`/events/${body.items[0]!.slug}/booking`);
  await expect(page.getByText('Đã kết nối thời gian thực', { exact: true })).toBeVisible();
  const available = page.getByRole('button', { name: /^Ghế .*: Còn trống$/ });
  for (let i = 0; i < count; i++) await available.nth(i).click();
  await page.getByRole('button', { name: 'Xác nhận giữ ghế', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ghế bạn đang giữ', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp tục đến đơn hàng', exact: true }).click();
  await expect(page).toHaveURL(/\/checkout\/[a-f0-9-]+$/);
  const orderId = page.url().split('/').pop()!;
  await page.getByRole('button', { name: 'Thanh toán mô phỏng (local)', exact: true }).click();
  await expect(page).toHaveURL(/\/dev-payments\/[a-f0-9-]+$/);
  return { orderId, paymentId: page.url().split('/').pop()! };
}
test('verified duplicate payment issues owned QR tickets; return URL alone never marks paid', async ({
  page,
}, info) => {
  await login(page);
  const { orderId, paymentId } = await checkout(page);
  await page.goto(`/payment/success?paymentId=${paymentId}&code=00&status=PAID`);
  await expect(
    page.getByRole('heading', { name: 'Đang chờ xác nhận thanh toán', exact: true }),
  ).toBeVisible();
  await page.goto(`/dev-payments/${paymentId}`);
  await page.getByRole('button', { name: 'Gửi callback trùng', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Thanh toán đã được xác nhận', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Xem vé của tôi', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Vé của tôi', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Xem vé', exact: true }).first().click();
  await expect(page.getByRole('img', { name: /^Mã QR vé TF-/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Xem đơn hàng', exact: true })).toHaveAttribute(
    'href',
    `/checkout/${orderId}`,
  );
  await page.reload();
  await expect(page.getByRole('img', { name: /^Mã QR vé TF-/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('verified-qr-ticket.png'), fullPage: true });
});
test('failed payment releases the reservation and does not show a paid result', async ({
  page,
}, info) => {
  await login(page, false);
  const { orderId } = await checkout(page, 1);
  await page.getByRole('button', { name: 'Thanh toán thất bại', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Thanh toán chưa hoàn tất', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Xem đơn hàng', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/checkout/${orderId}$`));
  await expect(page.getByText('Thanh toán thất bại', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Xem vé của tôi', exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('verified-payment-failure.png'), fullPage: true });
});
