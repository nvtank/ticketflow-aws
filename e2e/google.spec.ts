import { test, expect } from '@playwright/test';
test('Google SDK button uses a nonce cookie and recovers from expired challenge without logging in', async ({
  page,
  context,
}) => {
  await page.route('https://accounts.google.com/gsi/client?hl=vi', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.google={accounts:{id:{initialize(options){window.googleOptions=options;},renderButton(element){const button=document.createElement('button');button.type='button';button.textContent='Google SDK test account';button.onclick=()=>window.googleOptions.callback({credential:'synthetic-google-token-for-expired-challenge'});element.appendChild(button);}}}};`,
    }),
  );
  await page.goto('/login?next=%2Fmy-tickets');
  await expect(
    page.getByRole('button', { name: 'Google SDK test account', exact: true }),
  ).toBeVisible();
  const cookie = (await context.cookies()).find((c) => c.name === 'tixflow_google_challenge');
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe('Strict');
  expect(cookie?.path).toBe('/api/v1/auth/google');
  await context.clearCookies({ name: 'tixflow_google_challenge' });
  await page.getByRole('button', { name: 'Google SDK test account', exact: true }).click();
  await expect(
    page.getByText('Phiên Google đã hết hạn. Vui lòng thử lại.', { exact: true }).first(),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByRole('button', { name: 'Thử lại Google', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Google SDK test account', exact: true }),
  ).toBeVisible();
  expect((await context.cookies()).some((c) => c.name === 'tixflow_refresh')).toBe(false);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('Google SDK network failure shows an actionable error while password login remains available', async ({
  page,
}) => {
  await page.route('https://accounts.google.com/gsi/client?hl=vi', (route) => route.abort());
  await page.goto('/register');
  await expect(
    page.getByText('Không tải được đăng nhập Google. Hãy thử lại.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Thử lại Google', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tạo tài khoản', exact: true })).toBeEnabled();
});
