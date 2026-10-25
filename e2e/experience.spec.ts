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
    throw new Error('Requires isolated test database.');
  execFileSync('pnpm', ['--filter', '@tixflow/api', 'exec', 'node', 'dist/seed.js'], {
    stdio: 'pipe',
    env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: url, DEMO_PASSWORD: password },
  });
});

test('home search and artist discovery lead to published event details', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Feel the real thing.');
  await page.getByLabel('Tìm trải nghiệm của bạn').fill('TixFlow Music');
  await page.getByRole('button', { name: 'Tìm sự kiện', exact: true }).click();
  await expect(page).toHaveURL(/\/events\?q=TixFlow\+Music/);
  await expect(page.getByRole('heading', { name: /TixFlow Music Festival/ })).toBeVisible();
  await page.goto('/artists');
  await page.getByLabel('Tìm nghệ sĩ', { exact: true }).fill('Luma');
  await page.getByRole('button', { name: 'Tìm nghệ sĩ', exact: true }).click();
  await expect(page).toHaveURL(/q=Luma/);
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: 'Luma', exact: true }) })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Luma' })).toBeVisible();
  await expect(page.getByText('Nghệ sĩ demo · Hồ sơ hư cấu')).toBeVisible();
  await page
    .getByRole('heading', { name: /TixFlow Music Festival/ })
    .getByRole('link')
    .click();
  await expect(page).toHaveURL(/\/events\/tixflow-music-festival$/);
  await expect(page.getByRole('link', { name: 'Chọn ghế', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: info.outputPath('event-detail.png'), fullPage: true });
});

test('story team GitHub and guide form a connected accessible journey', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/');
  if (isMobile) {
    await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Điều hướng trên di động' })
      .getByRole('link', { name: 'Về TixFlow', exact: true })
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  } else
    await page
      .getByRole('navigation', { name: 'Điều hướng chính', exact: true })
      .getByRole('link', { name: 'Về TixFlow', exact: true })
      .click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('sức mạnh');
  await page.getByRole('link', { name: 'Gặp đội ngũ phía sau TixFlow' }).click();
  await expect(page).toHaveURL(/\/contributors$/);
  await expect(page.getByRole('heading', { name: 'hoangphatdev', exact: true })).toBeVisible();
  const github = page.getByRole('link', { name: 'Khám phá mã nguồn' });
  await expect(github).toHaveAttribute('href', 'https://github.com/nvtank/ticketflow-aws');
  await expect(github).toHaveAttribute('rel', /noopener/);
  for (const handle of ['hoangphatdev', 'nguyen-van-hoan', 'nvtank'])
    await expect(page.locator(`main a[href="https://github.com/${handle}"]`)).toBeVisible();
  await page.locator('footer').getByRole('link', { name: 'Hướng dẫn đặt vé', exact: true }).click();
  const question = page.getByRole('button', { name: 'Tôi xem vé và mã QR ở đâu?' });
  await question.click();
  await expect(question).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('region', { name: 'Tôi xem vé và mã QR ở đâu?' })).toContainText(
    'Vé của tôi',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('guide.png'), fullPage: true });
});

test('a paid customer creates edits and deletes a real booking review', async ({ page }, info) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('customer@tixflow.local');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  const reviewContext = page.waitForResponse((response) =>
    response.url().includes('/review-context'),
  );
  await page.goto('/events/tixflow-music-festival#reviews');
  const eligibility = await reviewContext;
  expect(eligibility.status()).toBe(200);
  expect(await eligibility.json()).toMatchObject({ eligible: true });
  await expect(page.getByLabel('Nội dung đánh giá')).toBeVisible();
  const comment = `Trải nghiệm đặt vé ${info.project.name}: chọn ghế và mở QR thuận tiện.`;
  const fourStars = page.getByRole('radio', { name: '4 sao', exact: true });
  await fourStars.locator('..').click();
  await expect(fourStars).toBeChecked();
  await page.getByLabel('Nội dung đánh giá').fill(comment);
  await page.getByRole('button', { name: 'Gửi đánh giá', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chỉnh sửa đánh giá của bạn' })).toBeVisible();
  await expect(page.locator('article').filter({ hasText: comment })).toBeVisible();
  await page.getByLabel('Nội dung đánh giá').fill(comment + ' Đã cập nhật.');
  await page.getByRole('button', { name: 'Cập nhật đánh giá', exact: true }).click();
  await expect(
    page.locator('article').filter({ hasText: comment + ' Đã cập nhật.' }),
  ).toBeVisible();
  await page.goto('/community');
  await page.getByLabel('Lọc theo số sao').selectOption('4');
  await expect(page.locator('article').filter({ hasText: comment })).toBeVisible();
  await page.screenshot({ path: info.outputPath('community-review.png'), fullPage: true });
  await page
    .locator('article')
    .filter({ hasText: comment })
    .getByRole('link', { name: /TixFlow Music Festival/ })
    .click();
  await page.getByRole('button', { name: 'Xóa đánh giá', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận xóa', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('article').filter({ hasText: comment })).toHaveCount(0);
});

test('all public experiences fit mobile widths and respect reduced motion', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of [
    '/',
    '/about',
    '/artists',
    '/artists/luma',
    '/community',
    '/contributors',
    '/guide',
    '/events',
    '/login',
    '/register',
  ]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.getByRole('heading', { level: 1 }), route).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      route,
    ).toBe(true);
    await expect(page.getByRole('main')).toHaveCount(1);
    if (route === '/' || route === '/about' || route === '/artists' || route === '/contributors')
      await page.screenshot({
        path: info.outputPath(`${route === '/' ? 'home' : route.slice(1)}.png`),
        fullPage: true,
      });
  }
  expect(errors).toEqual([]);
});
