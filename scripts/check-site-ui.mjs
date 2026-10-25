/* global process, console, document, URL, getComputedStyle, innerWidth, scrollTo */
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Browser-only fixtures: no database, payment, reservation or account mutations.
const base = process.env.FLOW_QA_URL || 'http://127.0.0.1:3000';
const output = process.env.SITE_QA_OUTPUT || join(tmpdir(), 'tikflow-site-ui');
await fs.mkdir(output, { recursive: true });
const id = (n) => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;
const now = new Date().toISOString();
const future = new Date(Date.now() + 3600000).toISOString();
const pagination = { page: 1, pageSize: 9, total: 1, totalPages: 1 };
const event = {
  id: id(1),
  slug: 'ui-qa-concert',
  title: 'Đêm nhạc kết nối — QA',
  category: 'MUSIC',
  city: 'TP. Hồ Chí Minh',
  venueName: 'Sân khấu QA',
  startsAt: '2027-11-21T12:00:00.000Z',
  coverUrl: null,
  minPriceVnd: 350000,
  availableSeats: 12,
  status: 'PUBLISHED',
  description: 'Sự kiện minh họa chỉ xuất hiện trong trình duyệt kiểm tra giao diện.',
  endsAt: '2027-11-21T16:00:00.000Z',
  salesStartAt: '2026-01-01T00:00:00.000Z',
  salesEndAt: '2027-11-20T12:00:00.000Z',
  ticketPolicy: 'Xuất trình mã QR hợp lệ tại cổng.',
  galleryUrls: [],
  maxTicketsPerOrder: 4,
  inventoryRevision: 1,
  waitingRoomEnabled: false,
  waitingRoomCapacity: 100,
  rejectionReason: null,
  organization: { id: id(2), name: 'Tổ chức QA' },
  venue: { id: id(3), name: 'Sân khấu QA', city: 'TP. Hồ Chí Minh', address: 'Địa chỉ QA' },
  sections: [
    {
      id: id(4),
      name: 'Khu A',
      rowCount: 2,
      columnCount: 8,
      ticketType: { id: id(5), name: 'Standard', priceVnd: 350000 },
      totalSeats: 16,
      availableSeats: 12,
      soldSeats: 2,
    },
  ],
};
const order = {
  id: id(6),
  eventId: event.id,
  holdId: id(7),
  status: 'PENDING_PAYMENT',
  totalVnd: 350000,
  feeVnd: 0,
  expiresAt: future,
  createdAt: now,
  serverTime: now,
  event: { ...event, address: 'Địa chỉ QA' },
  items: [{ seatId: id(10), code: 'A1', section: 'Khu A', priceVnd: 350000 }],
};
const ticket = {
  id: id(8),
  code: 'QA-TICKET-001',
  status: 'VALID',
  eventId: event.id,
  orderId: order.id,
  seatCode: 'A1',
  section: 'Khu A',
  priceVnd: 350000,
  createdAt: now,
  event: order.event,
  qrCredential: 'QA-ONLY-NOT-A-VALID-TICKET',
};
const artist = {
  id: id(9),
  slug: 'qa-artist',
  name: 'Nghệ sĩ QA',
  genre: 'Indie',
  tagline: 'Âm nhạc kết nối',
  biography: 'Nghệ sĩ minh họa cho kiểm tra giao diện.',
  color: 'cyan',
  isDemo: true,
  upcomingEvents: 1,
};
const list = (items) => ({ items, pagination: { ...pagination, total: items.length } });
const reviews = { ...list([]), summary: { count: 0, average: null, distribution: [] } };
const results = [];
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  for (const width of (process.env.SITE_QA_WIDTHS || '1440,390').split(',').map(Number)) {
    for (const role of [null, 'CUSTOMER', 'ORGANIZER', 'ADMIN', 'STAFF'].filter(
      (value) => !process.env.SITE_QA_ROLE || value === process.env.SITE_QA_ROLE,
    )) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        reducedMotion: 'reduce',
        isMobile: width < 700,
        hasTouch: width < 700,
      });
      const user = {
        id: id(20),
        email: 'ui-qa@example.test',
        name: 'Tài khoản QA',
        phone: null,
        role,
      };
      const blocked = [];
      let failEvents = false;
      let waiting = false;
      await context.route('**/api/v1/**', async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname.replace('/api/v1', '');
        const json = (data, status = 200) => route.fulfill({ status, json: data });
        if (path === '/auth/refresh')
          return role
            ? json({ user, accessToken: 'qa-browser-token-only', expiresIn: 3600 })
            : json({ message: 'QA anonymous' }, 401);
        if (request.method() !== 'GET') {
          blocked.push(`${request.method()} ${path}`);
          return json({ message: 'QA blocks mutations' }, 400);
        }
        if (path === '/auth/me') return json(user);
        if (path === '/auth/google/config') return json({ enabled: false });
        if (path === '/auth/methods') return json({ hasPassword: true, googleLinked: false });
        if (path === '/events')
          return failEvents ? json({ message: 'QA connection error' }, 503) : json(list([event]));
        if (path === `/events/${event.slug}`)
          return json({ ...event, waitingRoomEnabled: waiting });
        if (path.endsWith('/waiting-room'))
          return json({
            state: 'WAITING',
            position: 3,
            peopleAhead: 2,
            queued: 4,
            active: 1,
            capacity: 1,
            expiresAt: future,
            serverTime: now,
            admissionToken: null,
          });
        if (path.endsWith('/booking-state'))
          return json({
            eventId: event.id,
            revision: 1,
            serverTime: now,
            salesStartAt: event.salesStartAt,
            salesEndAt: event.salesEndAt,
            maxTicketsPerOrder: 4,
            activeHold: null,
            seats: Array.from({ length: 16 }, (_, i) => ({
              id: id(30 + i),
              sectionId: id(4),
              code: `A${i + 1}`,
              rowLabel: i < 8 ? 'A' : 'B',
              columnNumber: (i % 8) + 1,
              status: ['AVAILABLE', 'AVAILABLE', 'HELD_BY_OTHERS', 'SOLD', 'UNAVAILABLE'][i % 5],
              priceVnd: 350000,
            })),
          });
        if (path === `/orders/${order.id}`) return json(order);
        if (path === '/orders/me') return json(list([order]));
        if (path === '/payments/config') return json({ provider: 'mock', available: true });
        if (path === `/payments/${id(11)}/status` || path === `/payments/${id(12)}/status`) {
          const paid = path.includes(id(11));
          return json({
            id: paid ? id(11) : id(12),
            orderId: order.id,
            provider: 'mock',
            status: paid ? 'SUCCEEDED' : 'FAILED',
            orderStatus: paid ? 'PAID' : 'PAYMENT_FAILED',
            amountVnd: 350000,
            checkoutUrl: null,
            expiresAt: future,
            serverTime: now,
          });
        }
        if (path === '/tickets/me') return json(list([ticket]));
        if (path === `/tickets/${ticket.id}`) return json(ticket);
        if (path === '/artists') return json({ ...list([artist]), genres: ['Indie'] });
        if (path === '/artists/qa-artist') return json({ ...artist, events: [event] });
        if (path.includes('/reviews')) return json(reviews);
        if (path === '/notifications/me') return json({ ...list([]), unread: 0 });
        if (path === '/organizations/me')
          return json([{ ...event.organization, status: 'APPROVED' }]);
        if (path === '/organizer/dashboard')
          return json({
            totalEvents: 1,
            sellingEvents: 1,
            soldSeats: 2,
            totalSeats: 16,
            revenueVnd: 700000,
            occupancy: 0.125,
          });
        if (path === '/organizer/events' || path === '/admin/events/pending')
          return json(list([event]));
        if (path === `/organizer/events/${event.id}` || path === `/admin/events/${event.id}`)
          return json(event);
        if (path === '/organizer/analytics')
          return json({
            from: '2026-10-01',
            to: '2026-10-25',
            timezone: 'Asia/Ho_Chi_Minh',
            totalEvents: 1,
            paidOrders: 2,
            revenueVnd: 700000,
            soldTickets: 2,
            availableSeats: 12,
            heldSeats: 1,
            soldSeats: 2,
            capacity: 16,
            occupancy: 0.125,
            checkIns: 1,
            revenueByDay: [
              { date: '2026-10-24', revenueVnd: 350000, orders: 1 },
              { date: '2026-10-25', revenueVnd: 700000, orders: 2 },
            ],
            sections: [],
            recentOrders: [],
          });
        if (path === '/admin/dashboard')
          return json({
            users: 4,
            organizations: 1,
            events: 1,
            pendingEvents: 1,
            pendingOrganizations: 0,
            revenueVnd: 700000,
            paidOrders: 2,
            tickets: 2,
            checkIns: 1,
            refundRequired: 0,
          });
        if (path === '/admin/monitoring')
          return json({
            scope: 'QA',
            uptimeSeconds: 60,
            httpRequestsTotal: 24,
            httpErrorsTotal: 0,
            requestsByStatus: { 200: 24 },
            seatHoldsSucceeded: 1,
            seatHoldsFailed: 0,
            socketConnections: 1,
            redisAdapterEnabled: true,
            validHeldSeats: 1,
            queue: null,
          });
        if (path === '/admin/users')
          return json(list([{ ...user, isActive: true, createdAt: now }]));
        if (path === '/admin/organizations')
          return json(
            list([
              {
                ...event.organization,
                slug: 'qa-org',
                status: 'APPROVED',
                rejectionReason: null,
                createdAt: now,
              },
            ]),
          );
        if (path === '/check-in/events')
          return json({ items: [{ ...event, totalTickets: 2, checkedIn: 1 }] });
        if (path.endsWith('/stats'))
          return json({
            eventId: event.id,
            revision: 1,
            serverTime: now,
            totalTickets: 2,
            checkedIn: 1,
            remaining: 1,
            cancelled: 0,
            hourly: [],
          });
        if (path === '/health')
          return json({
            status: 'ok',
            service: 'tixflow-api',
            timestamp: now,
            uptimeSeconds: 60,
            dependencies: { postgres: 'up', redis: 'up' },
          });
        if (path.endsWith('/staff') || path.endsWith('/history')) return json([]);
        return json({ message: `QA unavailable: ${path}` }, 503);
      });
      const page = await context.newPage();
      page.setDefaultNavigationTimeout(180000);
      page.setDefaultTimeout(30000);
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const routes =
        role === null
          ? [
              '/events',
              `/events/${event.slug}`,
              '/artists',
              '/artists/qa-artist',
              '/community',
              '/about',
              '/guide',
              '/contributors',
              '/login',
              '/register',
              '/system',
            ]
          : role === 'CUSTOMER'
            ? [
                '/profile',
                '/notifications',
                '/my-tickets',
                `/my-tickets/${ticket.id}`,
                `/events/${event.slug}/booking`,
                `/checkout/${order.id}`,
                '/payment/failed',
                `/payment/success?paymentId=${id(11)}`,
                `/payment/failed?paymentId=${id(12)}`,
                `/events/${event.slug}/booking?qa=waiting`,
              ]
            : role === 'ORGANIZER'
              ? [
                  '/organizer',
                  '/organizer/events',
                  '/organizer/events/new',
                  `/organizer/events/${event.id}`,
                  '/organizer/analytics',
                ]
              : role === 'ADMIN'
                ? [
                    '/admin',
                    '/admin/events',
                    `/admin/events/${event.id}`,
                    '/admin/users',
                    '/admin/organizations',
                    '/admin/monitoring',
                  ]
                : ['/staff', `/staff/events/${event.id}/scan`];
      for (const path of routes) {
        if (process.env.SITE_QA_PATH && !path.includes(process.env.SITE_QA_PATH)) continue;
        waiting = path.includes('qa=waiting');
        const response = await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
        if (response.status() !== 200) throw Error(`${path}: HTTP ${response.status()}`);
        await page.locator('h1').first().waitFor({ state: 'visible' });
        await page.evaluate(() => document.fonts.ready);
        const layout = await page.evaluate(() => ({
          width: innerWidth,
          document: document.documentElement.scrollWidth,
          background: getComputedStyle(document.body).backgroundColor,
          font: getComputedStyle(document.body).fontFamily,
          headingTop: document.querySelector('h1')?.getBoundingClientRect().top,
        }));
        if (layout.document > width + 1)
          throw Error(`${width} ${path}: overflow ${JSON.stringify(layout)}`);
        if (layout.background !== 'rgb(9, 11, 19)' || !layout.font.includes('Be Vietnam Pro'))
          throw Error(`${path}: shared theme absent ${JSON.stringify(layout)}`);
        if (role === null || role === 'CUSTOMER') {
          await expect(page.locator('.tf-nav')).toBeVisible();
          const clipped = await page
            .locator('.tf-nav-shell')
            .evaluate((el) => el.scrollWidth > el.clientWidth + 1);
          if (clipped) throw Error(`${width} ${path}: navbar controls are clipped`);
          if (layout.headingTop < 95) throw Error(`${path}: heading overlaps fixed header`);
        } else await expect(page.locator('.workspace-header')).toBeVisible();
        if (path === '/events') {
          await expect(page.getByRole('link', { name: event.title, exact: true })).toBeVisible();
          await page.getByRole('button', { name: 'Open menu', exact: true }).click();
          await expect(page.getByRole('dialog')).toBeVisible();
          await page.keyboard.press('Escape');
          await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeFocused();
          failEvents = true;
          await page.reload({ waitUntil: 'networkidle' });
          await expect(page.getByRole('heading', { name: 'Chưa thể tải dữ liệu' })).toBeVisible();
          failEvents = false;
          await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
          await expect(page.getByRole('link', { name: event.title, exact: true })).toBeVisible();
        }
        if (path === '/login') {
          await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
          await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
          await expect(page.locator('#password')).toHaveAttribute('aria-invalid', 'true');
        }
        if (width <= 360 && role === 'CUSTOMER') {
          await page.getByRole('button', { name: 'Open menu', exact: true }).click();
          await expect(
            page
              .getByRole('navigation', { name: 'All pages' })
              .getByRole('link', { name: 'Notifications', exact: true }),
          ).toBeVisible();
          await page.keyboard.press('Escape');
        }
        if (path.endsWith('/booking')) {
          const seat = page.getByRole('button', { name: 'Ghế A1: Còn trống', exact: true });
          await seat.click();
          await expect(seat).toHaveAttribute('aria-pressed', 'true');
        }
        if (path.startsWith('/checkout/')) {
          await page.getByRole('button', { name: 'Hủy đơn hàng', exact: true }).click();
          await expect(page.getByRole('dialog')).toBeVisible();
          await page.keyboard.press('Escape');
          await expect(page.getByRole('dialog')).toBeHidden();
        }
        if (path === `/my-tickets/${ticket.id}`) {
          const qr = page.getByRole('img', { name: `Mã QR vé ${ticket.code}` });
          await expect(qr).toBeVisible();
          if (
            (await qr.evaluate((el) => getComputedStyle(el).backgroundColor)) !==
            'rgb(255, 255, 255)'
          )
            throw Error('Ticket QR needs white backing');
        }
        if (path === '/organizer/events' && width === 390) {
          await page.getByRole('button', { name: 'Mở điều hướng dashboard' }).click();
          await expect(page.getByRole('dialog')).toBeVisible();
          await page.keyboard.press('Escape');
        }
        if (errors.length) throw Error(`${path}: ${errors.join('\n')}`);
        const name = `${width}-${path.replace(/[^a-z0-9]/gi, '-').replace(/^-/, '')}`;
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: join(output, `${name}.png`) });
        results.push({ width, role: role || 'public', path, passed: true });
        console.log(JSON.stringify(results.at(-1)));
      }
      if (blocked.length) throw Error(`Unexpected mutations: ${blocked.join(', ')}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
  await fs.writeFile(join(output, 'results.json'), JSON.stringify(results, null, 2));
}
