import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
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

test('FIFO waiting room admits the next customer and issues a receipt notification', async ({
  page,
  browser,
}, info) => {
  const origin = 'http://127.0.0.1:4000/api/v1';
  const login = await page.request.post(origin + '/auth/login', {
    data: { email: 'organizer@tixflow.local', password },
  });
  expect(login.ok()).toBe(true);
  const auth = (await login.json()) as { accessToken: string };
  const headers = { Authorization: `Bearer ${auth.accessToken}` };
  const events = await page.request.get(origin + '/events?q=TixFlow%20Music');
  const event = ((await events.json()) as { items: { id: string; slug: string }[] }).items[0]!;
  const settings = origin + `/events/${event.id}/waiting-room/settings`;
  expect(
    (await page.request.patch(settings, { headers, data: { enabled: true, capacity: 1 } })).ok(),
  ).toBe(true);
  const other = await browser.newContext({
      baseURL: 'http://127.0.0.1:3000',
      viewport: page.viewportSize() ?? undefined,
    }),
    second = await other.newPage();
  await page.context().clearCookies();
  const customerTokens: string[] = [];
  try {
    for (const p of [page, second]) {
      const existing = p === second;
      const endpoint = existing ? 'login' : 'register';
      await p.goto(existing ? '/login' : '/register');
      if (!existing) await p.getByLabel('Họ và tên', { exact: true }).fill('Khách phòng chờ');
      await p
        .getByLabel('Email', { exact: true })
        .fill(existing ? 'customer2@tixflow.local' : `waiting-${crypto.randomUUID()}@e2e.local`);
      await p.getByLabel('Mật khẩu', { exact: true }).fill(password);
      const authentication = p.waitForResponse(
        (r) => r.url().endsWith(`/api/v1/auth/${endpoint}`) && r.request().method() === 'POST',
      );
      await p
        .getByRole('button', { name: existing ? 'Đăng nhập' : 'Tạo tài khoản', exact: true })
        .click();
      const response = await authentication;
      expect(response.ok()).toBe(true);
      const authenticated = (await response.json()) as { accessToken: string };
      customerTokens.push(authenticated.accessToken);
      await expect(p).toHaveURL(/\/profile$/);
      await p.goto(`/events/${event.slug}/booking`);
      await p.getByRole('button', { name: 'Vào hàng đợi', exact: true }).click();
    }
    await expect(
      page.getByRole('heading', { name: 'Đã đến lượt đặt vé', exact: true }),
    ).toBeVisible();
    await expect(second.getByText('Vị trí của bạn:', { exact: false })).toContainText('1');
    await second.reload();
    await expect(second.getByText('Vị trí của bạn:', { exact: false })).toContainText('1');
    const timer = second.getByRole('timer', { name: 'Thời gian phiên chờ còn lại' });
    const readSeconds = async () => {
      const [minutes, seconds] = (await timer.innerText()).split(':').map(Number);
      return minutes! * 60 + seconds!;
    };
    const initial = await readSeconds(),
      started = Date.now();
    for (let i = 0; i < 3; i++)
      await second.waitForResponse(
        (r) =>
          r.url().endsWith(`/events/${event.id}/waiting-room`) && r.request().method() === 'GET',
      );
    expect(
      Math.abs(initial - (await readSeconds()) - (Date.now() - started) / 1000),
    ).toBeLessThanOrEqual(2);
    await second.screenshot({ path: info.outputPath('waiting-room.png'), fullPage: true });
    await page.getByRole('button', { name: 'Rời hàng đợi', exact: true }).click();
    await expect(
      second.getByRole('heading', { name: 'Đã đến lượt đặt vé', exact: true }),
    ).toBeVisible();
    await second
      .getByRole('button', { name: /^Ghế .*: Còn trống$/ })
      .first()
      .click();
    await second.getByRole('button', { name: 'Xác nhận giữ ghế', exact: true }).click();
    await second.getByRole('button', { name: 'Tiếp tục đến đơn hàng', exact: true }).click();
    await second.getByRole('button', { name: 'Thanh toán mô phỏng (local)', exact: true }).click();
    await second.getByRole('button', { name: 'Thanh toán thành công', exact: true }).click();
    await second.getByRole('link', { name: 'Xem vé của tôi', exact: true }).click();
    await second.goto('/notifications');
    await expect(
      second.getByRole('heading', { name: 'Thông báo của tôi', exact: true }),
    ).toBeVisible();
    await second.getByRole('button', { name: 'Đánh dấu đã đọc', exact: true }).first().click();
    await expect(second.getByText('0 thông báo chưa đọc', { exact: true })).toBeVisible();
    expect(await second.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await second.screenshot({ path: info.outputPath('receipt-inbox.png'), fullPage: true });
  } finally {
    for (const token of customerTokens)
      await page.request.delete(origin + `/events/${event.id}/waiting-room`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    await page.request.patch(settings, { headers, data: { enabled: false, capacity: 20 } });
    await other.close();
  }
});
