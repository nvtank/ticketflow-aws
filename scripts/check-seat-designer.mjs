/* global process, console, document, innerWidth, URL, window */
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { labelSeatBlocks } from '../packages/shared/dist/index.js';
// UI interaction fixtures only. Database integrity/booking prices are covered by events.integration.test.ts.
const base = process.env.FLOW_QA_URL || 'http://127.0.0.1:3000';
const output = '/tmp/tixflow-seat-designer';
await fs.mkdir(output, { recursive: true });
const id = '11111111-1111-4111-8111-111111111111';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const results = [];
try {
  for (const width of (process.env.SEATING_QA_WIDTHS || '1440,390,320').split(',').map(Number)) {
    let role = 'ORGANIZER',
      failSave = false,
      saves = 0;
    let event = {
      id,
      slug: 'seat-designer-qa',
      title: 'Venue Studio QA',
      category: 'CONFERENCE',
      city: 'Đà Nẵng',
      venueName: 'Studio',
      startsAt: '2027-11-20T12:00:00.000Z',
      endsAt: '2027-11-20T15:00:00.000Z',
      salesStartAt: '2026-01-01T00:00:00.000Z',
      salesEndAt: '2027-11-19T12:00:00.000Z',
      coverUrl: null,
      minPriceVnd: 0,
      availableSeats: 0,
      status: 'DRAFT',
      description: 'Browser-only fixture for visual seating interactions.',
      ticketPolicy: 'Fixture policy for browser interaction checks.',
      galleryUrls: [],
      maxTicketsPerOrder: 4,
      inventoryRevision: 0,
      waitingRoomEnabled: false,
      waitingRoomCapacity: 20,
      rejectionReason: null,
      organization: { id, name: 'Studio QA' },
      venue: { id, name: 'Studio', city: 'Đà Nẵng', address: '123 QA' },
      sections: [],
      seatMapLayout: null,
    };
    let seats = [];
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      hasTouch: width < 700,
      isMobile: width < 700,
      reducedMotion: 'reduce',
    });
    const user = () => ({ id, email: 'qa@example.test', name: 'QA', phone: null, role });
    await context.route('**/api/v1/**', async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname.replace('/api/v1', '');
      const json = (body, status = 200) => route.fulfill({ json: body, status });
      if (path === '/auth/refresh')
        return json({ user: user(), accessToken: 'qa-only-token', expiresIn: 3600 });
      if (path === '/auth/me') return json(user());
      if (path === '/auth/google/config') return json({ enabled: false });
      if (path === '/notifications/unread-count') return json({ count: 0 });
      if (path === `/organizer/events/${id}/seat-map/design`) {
        saves++;
        if (failSave)
          return json(
            { message: 'Sơ đồ đã được thay đổi ở nơi khác. Tải lại trang trước khi lưu.' },
            409,
          );
        const input = req.postDataJSON();
        const zoneIds = new Map(input.zones.map((z) => [z.id, randomUUID()]));
        input.zones = input.zones.map((z) => ({ ...z, id: zoneIds.get(z.id) }));
        input.blocks = input.blocks.map((b) => ({ ...b, zoneId: zoneIds.get(b.zoneId) }));
        const blocks = labelSeatBlocks(input.blocks);
        seats = blocks.flatMap((b) =>
          Array.from({ length: b.rows * b.columns }, (_, i) => ({
            id: randomUUID(),
            sectionId: b.zoneId,
            rowLabel: b.rowLabels[Math.floor(i / b.columns)],
            columnNumber: (i % b.columns) + 1,
            code: `${b.rowLabels[Math.floor(i / b.columns)]}${String((i % b.columns) + 1).padStart(2, '0')}`,
            status: b.disabledSeats.includes(i) ? 'UNAVAILABLE' : 'AVAILABLE',
            priceVnd: input.zones.find((z) => z.id === b.zoneId).priceVnd,
          })),
        );
        event = {
          ...event,
          inventoryRevision: event.inventoryRevision + 1,
          seatMapLayout: {
            version: 1,
            width: input.width,
            height: input.height,
            stage: input.stage,
            zones: input.zones,
            blocks,
          },
          availableSeats: seats.filter((s) => s.status === 'AVAILABLE').length,
          sections: input.zones.map((z) => ({
            id: z.id,
            name: z.name,
            rowCount: blocks.filter((b) => b.zoneId === z.id).reduce((n, b) => n + b.rows, 0),
            columnCount: Math.max(...blocks.filter((b) => b.zoneId === z.id).map((b) => b.columns)),
            ticketType: { id: z.id, name: z.name, priceVnd: z.priceVnd },
            totalSeats: seats.filter((s) => s.sectionId === z.id).length,
            availableSeats: seats.filter((s) => s.sectionId === z.id && s.status === 'AVAILABLE')
              .length,
            soldSeats: 0,
          })),
        };
        return json(event);
      }
      if (path === `/organizer/events/${id}` || path === `/events/${event.slug}`)
        return json(event);
      if (path === `/organizer/events/${id}/seats`)
        return json({
          eventId: id,
          revision: event.inventoryRevision,
          serverTime: new Date().toISOString(),
          seats,
        });
      if (path === `/events/${id}/booking-state`)
        return json({
          eventId: id,
          revision: event.inventoryRevision,
          serverTime: new Date().toISOString(),
          salesStartAt: event.salesStartAt,
          salesEndAt: event.salesEndAt,
          maxTicketsPerOrder: 4,
          activeHold: null,
          seats,
        });
      if (path === '/organizations/me')
        return json([{ id, name: 'Studio QA', status: 'APPROVED' }]);
      if (path.endsWith('/reviews'))
        return json({
          items: [],
          pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
          summary: { count: 0, average: null, distribution: [] },
        });
      return json([]);
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/organizer/events/${id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Thiết kế chỗ ngồi' })).toBeVisible({
      timeout: 60000,
    });
    await page.getByRole('button', { name: 'Dãy 10 ghế', exact: true }).click();
    await page.getByLabel('Số hàng', { exact: true }).fill('2');
    await page.getByLabel('Ghế mỗi hàng', { exact: true }).fill('5');
    await page.getByText('Khóa ghế không mở bán (0)', { exact: true }).click();
    await page.getByRole('button', { name: 'Khóa ghế A01', exact: true }).click();
    await expect(page.locator('[data-seat-capacity]')).toHaveText('9');
    await expect(
      page.getByRole('button', { name: 'Gửi duyệt sự kiện', exact: true }),
    ).toBeDisabled();
    await page.getByRole('button', { name: 'Thêm zone', exact: true }).click();
    await page.getByLabel('Tên zone', { exact: true }).fill('VIP');
    await page.getByLabel('Giá vé / ghế (VND)', { exact: true }).fill('1200000');
    await page.getByRole('button', { name: 'Dãy 6 ghế', exact: true }).click();
    await expect(page.locator('[data-seat-capacity]')).toHaveText('15');
    await page.getByRole('button', { name: 'Nhân bản dãy', exact: true }).click();
    await expect(page.locator('[data-layout-block]')).toHaveCount(3);
    await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
    await expect(page.locator('[data-layout-block]')).toHaveCount(2);
    const canvas = page.locator('svg[aria-label="Sơ đồ bố trí chỗ ngồi"]');
    await page.getByRole('button', { name: 'Cuộn mặt bằng', exact: true }).click();
    await expect(canvas).toHaveCSS('touch-action', 'auto');
    await page.getByRole('button', { name: 'Cuộn mặt bằng', exact: true }).click();
    await expect(canvas).toHaveCSS('touch-action', 'none');
    if (width >= 700) {
      await page
        .getByRole('button', { name: 'Dãy 6 ghế', exact: true })
        .dragTo(canvas, { targetPosition: { x: 400, y: 240 } });
      await expect(page.locator('[data-layout-block]')).toHaveCount(3);
      await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
      await expect(page.locator('[data-layout-block]')).toHaveCount(2);
    }
    const first = page.locator('[data-layout-block]').first();
    await first.scrollIntoViewIfNeeded();
    await first.focus();
    await first.press('Enter');
    const x = Number(await page.getByLabel('Vị trí X', { exact: true }).inputValue());
    await first.press('ArrowRight');
    await expect(page.getByLabel('Vị trí X', { exact: true })).toHaveValue(String(x + 10));
    await page.getByLabel('Góc xoay (°)', { exact: true }).fill('10');
    await first.scrollIntoViewIfNeeded();
    if (width < 700) {
      await page.screenshot({ path: `${output}/${width}-before-touch.png` });
      await page.evaluate(() => {
        window.__seatTouch = [];
        for (const name of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'])
          document.addEventListener(
            name,
            (e) =>
              window.__seatTouch.push({
                name,
                button: e.button,
                type: e.pointerType,
                target: e.target.closest('[data-layout-block]')?.getAttribute('data-layout-block'),
                x: e.clientX,
                y: e.clientY,
              }),
            { capture: true },
          );
      });
    }
    const box = await first.boundingBox();
    if (!box) throw new Error('Missing row geometry');
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    if (width >= 700) {
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(start.x + 30, start.y + 40, { steps: 8 });
      await page.mouse.up();
    } else {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: start.x + 15, y: start.y + 30 }],
      });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
      const trace = await page.evaluate(() => window.__seatTouch);
      expect(trace.some((e) => e.name === 'pointercancel')).toBe(false);
      expect(trace.some((e) => e.name === 'pointerup')).toBe(true);
    }
    await expect
      .poll(async () => Number(await page.getByLabel('Vị trí Y', { exact: true }).inputValue()))
      .toBeGreaterThan(340);
    await page.getByLabel('Vị trí X', { exact: true }).fill('200');
    await page.getByLabel('Vị trí Y', { exact: true }).fill('600');
    // An overlap must disable save without sending a destructive request.
    await page.getByLabel('Vị trí X', { exact: true }).fill('1000');
    await page.getByLabel('Vị trí Y', { exact: true }).fill('100');
    await expect(page.getByText(/Sân khấu chồng lên/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lưu sơ đồ', exact: true })).toBeDisabled();
    expect(saves).toBe(0);
    await page.getByLabel('Vị trí X', { exact: true }).fill('200');
    await page.getByLabel('Vị trí Y', { exact: true }).fill('600');
    failSave = true;
    await page.getByRole('button', { name: 'Lưu sơ đồ', exact: true }).click();
    await expect(
      page.getByText('Sơ đồ đã được thay đổi ở nơi khác. Tải lại trang trước khi lưu.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator('[data-seat-capacity]')).toHaveText('15');
    failSave = false;
    await page.getByRole('button', { name: 'Lưu sơ đồ', exact: true }).click();
    await expect(page.getByText('Đã lưu sơ đồ chỗ ngồi.', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-layout-block]')).toHaveCount(2);
    await expect(page.locator('[data-seat-capacity]')).toHaveText('15');
    expect(event.seatMapLayout.blocks[0].rotation).toBe(10);
    expect(event.seatMapLayout.blocks[0].disabledSeats).toEqual([0]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.locator('#seat-designer').screenshot({ path: `${output}/${width}-designer.png` });
    await page.locator('[data-layout-block]').first().focus();
    await page.locator('[data-layout-block]').first().press('ArrowRight');
    await page.getByRole('button', { name: 'Lưu sơ đồ', exact: true }).click();
    await page.getByRole('button', { name: 'Xác nhận lưu sơ đồ', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('[data-layout-block]')).toHaveCount(2);
    event.status = 'PENDING_APPROVAL';
    await page.reload();
    await expect(
      page.getByText('Sự kiện đã gửi duyệt hoặc công bố. Sơ đồ được khóa.', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lưu sơ đồ', exact: true })).toHaveCount(0);
    role = 'CUSTOMER';
    event.status = 'PUBLISHED';
    await page.goto(`${base}/events/${event.slug}/booking`, { waitUntil: 'domcontentloaded' });
    const available = page.getByRole('button', { name: /^Ghế A02: Còn trống/ });
    await expect(available).toBeVisible();
    await expect(page.getByRole('button', { name: /^Ghế A01: Không mở bán/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await available.focus();
    await available.press('Enter');
    await expect(available).toHaveAttribute('aria-pressed', 'true');
    const vip = page.getByRole('button', { name: /^Ghế C01: Còn trống/ });
    await vip.focus();
    await vip.press('Enter');
    await expect(vip).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('1.699.000 ₫', { exact: true }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `${output}/${width}-booking.png`, fullPage: true });
    expect(errors).toEqual([]);
    results.push({ width, passed: true, saves });
    await context.close();
    console.log(results.at(-1));
  }
} finally {
  await browser.close();
  await fs.writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
}
