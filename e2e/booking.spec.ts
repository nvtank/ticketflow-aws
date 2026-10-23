import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';
const password = 'TixFlowDemo!2026';
test.beforeAll(() => {
  const url =
      process.env.TEST_DATABASE_URL ??
      'postgresql://tixflow_test:tixflow_test_only@127.0.0.1:55432/tixflow_test',
    parsed = new URL(url);
  if (
    !['localhost', '127.0.0.1'].includes(parsed.hostname) ||
    parsed.port !== '55432' ||
    parsed.pathname !== '/tixflow_test'
  )
    throw new Error('Requires local test DB.');
  execFileSync('pnpm', ['--filter', '@tixflow/api', 'exec', 'node', 'dist/seed.js'], {
    stdio: 'pipe',
    env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: url, DEMO_PASSWORD: password },
  });
});
async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
}
test('two customers hold seats, receive realtime updates, reload and cancel a server-priced order', async ({
  page,
  browser,
}, info) => {
  await login(page, 'customer@tixflow.local');
  const response = await page.request.get('http://127.0.0.1:4000/api/v1/events?q=TixFlow%20Music');
  expect(response.ok()).toBe(true);
  const result = (await response.json()) as { items: { slug: string }[] };
  const slug = result.items[0]!.slug;
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:3000',
    viewport: page.viewportSize() ?? undefined,
  });
  const other = await context.newPage();
  await login(other, 'customer2@tixflow.local');
  await page.goto(`/events/${slug}/booking`);
  await other.goto(`/events/${slug}/booking`);
  await expect(page.getByText('Đã kết nối thời gian thực', { exact: true })).toBeVisible();
  await expect(other.getByText('Đã kết nối thời gian thực', { exact: true })).toBeVisible();
  const choices = page.getByRole('button', { name: /^Ghế .*: Còn trống$/ });
  await expect(choices.first()).toBeVisible();
  const labels = await choices.evaluateAll((elements) =>
    elements.slice(0, 5).map((element) => element.getAttribute('aria-label')!),
  );
  expect(labels).toHaveLength(5);
  for (const label of labels.slice(0, 4))
    await page.getByRole('button', { name: label, exact: true }).click();
  await page.getByRole('button', { name: labels[4]!, exact: true }).click();
  await expect(
    page.locator('[data-sonner-toast]').getByText('Tối đa 4 vé mỗi lượt.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: labels[4]!, exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.getByRole('button', { name: 'Xác nhận giữ ghế', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ghế bạn đang giữ', exact: true })).toBeVisible();
  const code = labels[0]!.match(/^Ghế ([A-Z]+\d+):/)![1]!;
  await expect(
    other.getByRole('button', { name: `Ghế ${code}: Người khác đang giữ`, exact: true }),
  ).toBeDisabled({ timeout: 4000 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ghế bạn đang giữ', exact: true })).toBeVisible();
  await expect(page.getByRole('timer', { name: 'Thời gian giữ ghế còn lại' })).toHaveText(
    /\d{2}:\d{2}/,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('customer-seat-map.png'), fullPage: true });
  await page.getByRole('button', { name: 'Tiếp tục đến đơn hàng', exact: true }).click();
  await expect(page).toHaveURL(/\/checkout\/[a-f0-9-]+$/);
  await expect(page.getByRole('heading', { name: 'Đơn hàng của bạn', exact: true })).toBeVisible();
  await expect(page.getByText('4.800.000 ₫', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hủy đơn hàng', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận hủy đơn', exact: true }).click();
  await expect(page.getByText('Đã hủy', { exact: true }).first()).toBeVisible();
  await expect(
    other.getByRole('button', { name: `Ghế ${code}: Còn trống`, exact: true }),
  ).toBeEnabled({ timeout: 4000 });
  await other.getByRole('button', { name: `Ghế ${code}: Còn trống`, exact: true }).click();
  await other.getByRole('button', { name: 'Xác nhận giữ ghế', exact: true }).click();
  await expect(other.getByRole('heading', { name: 'Ghế bạn đang giữ', exact: true })).toBeVisible();
  await other.getByRole('button', { name: 'Tiếp tục đến đơn hàng', exact: true }).click();
  await expect(other).toHaveURL(/\/checkout\/[a-f0-9-]+$/);
  await other.screenshot({ path: info.outputPath('pending-order.png'), fullPage: true });
  await page.goto(other.url());
  await expect(page.getByText('Bạn không sở hữu đơn hàng này.', { exact: true })).toBeVisible();
  await other.getByRole('button', { name: 'Hủy đơn hàng', exact: true }).click();
  await other.getByRole('button', { name: 'Xác nhận hủy đơn', exact: true }).click();
  await expect(other.getByText('Đã hủy', { exact: true }).first()).toBeVisible();
  await context.close();
});
