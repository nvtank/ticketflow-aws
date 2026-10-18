import type * as PaymentProviderModule from '../src/payments/payment-provider';
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type * as App from '../src/app.module';
import type * as Bootstrap from '../src/bootstrap';
import type * as Env from '../src/config/environment';
import type * as DB from '../src/database/database.service';
import type * as Provider from '../src/auth/auth-provider';
import type * as Lifecycle from '../src/booking/hold-lifecycle.service';
const require = createRequire(import.meta.url);
const { AppModule } = require('../dist/app.module.js') as typeof App;
const { configureApplication } = require('../dist/bootstrap.js') as typeof Bootstrap;
const { parseEnvironment } = require('../dist/config/environment.js') as typeof Env;
const { DatabaseService } = require('../dist/database/database.service.js') as typeof DB;
const { AuthProvider } = require('../dist/auth/auth-provider.js') as typeof Provider;
const { HoldLifecycleService } =
  require('../dist/booking/hold-lifecycle.service.js') as typeof Lifecycle;
export async function bookingFixture(
  customerCount = 101,
  providerOverride?: PaymentProviderModule.PaymentProvider,
) {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.port !== '55432' ||
    url.pathname !== '/tixflow_test'
  )
    throw new Error('Requires isolated local test PostgreSQL.');
  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (providerOverride) {
    const { PaymentProvider } =
      require('../dist/payments/payment-provider.js') as typeof PaymentProviderModule;
    builder.overrideProvider(PaymentProvider).useValue(providerOverride);
  }
  const module = await builder.compile();
  const app = module.createNestApplication({ logger: false });
  configureApplication(app, parseEnvironment(process.env));
  await app.listen(0, '127.0.0.1');
  const db = app.get(DatabaseService),
    prefix = randomUUID(),
    ids = Array.from({ length: customerCount + 1 }, () => randomUUID());
  await db.user.createMany({
    data: ids.map((id, index) => ({
      id,
      email: `${prefix}-${index}@booking.local`,
      name: `Fixture ${index}`,
      passwordHash: 'fixture-no-password-login',
      role: index === customerCount ? 'ORGANIZER' : 'CUSTOMER',
    })),
  });
  const sessions = ids.map((userId) => ({
    id: randomUUID(),
    userId,
    expiresAt: new Date(Date.now() + 3600000),
  }));
  await db.userSession.createMany({ data: sessions });
  const tokens = await Promise.all(
    sessions.map(async (s) => (await app.get(AuthProvider).issue(s.userId, s.id)).accessToken),
  );
  const org = await db.organization.create({
    data: { name: prefix, slug: prefix, status: 'APPROVED' },
  });
  const events: string[] = [],
    venues: string[] = [];
  const http = () => request(app.getHttpServer());
  const headers = (user = 0) => ({ Authorization: `Bearer ${tokens[user]}` });
  async function event(count = 4) {
    const venue = await db.venue.create({
      data: { name: prefix, address: '123 Fixture', city: 'Đà Nẵng' },
    });
    venues.push(venue.id);
    const e = await db.event.create({
      data: {
        organizationId: org.id,
        venueId: venue.id,
        slug: `booking-${randomUUID()}`,
        title: 'Booking fixture',
        description: 'Real database reservation test',
        category: 'MUSIC',
        status: 'PUBLISHED',
        startsAt: new Date(Date.now() + 86400000 * 2),
        endsAt: new Date(Date.now() + 86400000 * 3),
        salesStartAt: new Date(Date.now() - 86400000),
        salesEndAt: new Date(Date.now() + 86400000),
        ticketPolicy: 'Fixture policy',
      },
    });
    events.push(e.id);
    const type = await db.ticketType.create({
      data: { eventId: e.id, name: 'VIP', priceVnd: 1200000 },
    });
    const section = await db.eventSection.create({
      data: { eventId: e.id, ticketTypeId: type.id, name: 'VIP', rowCount: 1, columnCount: count },
    });
    await db.seat.createMany({
      data: Array.from({ length: count }, (_, index) => ({
        eventId: e.id,
        sectionId: section.id,
        code: `A${String(index + 1).padStart(2, '0')}`,
        rowLabel: 'A',
        columnNumber: index + 1,
      })),
    });
    return {
      ...e,
      seats: await db.seat.findMany({ where: { eventId: e.id }, orderBy: { code: 'asc' } }),
    };
  }
  const hold = (eventId: string, seatIds: string[], user = 0, key = randomUUID()) =>
    http()
      .post(`/api/v1/events/${eventId}/holds`)
      .set(headers(user))
      .send({ seatIds, idempotencyKey: key });
  async function close() {
    const holds = await db.seatHold.findMany({
        where: { eventId: { in: events } },
        select: { id: true },
      }),
      orders = await db.order.findMany({
        where: { eventId: { in: events } },
        select: { id: true },
      });
    const payments = await db.payment.findMany({
      where: { orderId: { in: orders.map((o) => o.id) } },
      select: { id: true },
    });
    const entityIds = [
      ...events,
      ...holds.map((h) => h.id),
      ...orders.map((o) => o.id),
      ...payments.map((p) => p.id),
      ...(
        await db.ticket.findMany({ where: { eventId: { in: events } }, select: { id: true } })
      ).map((t) => t.id),
      org.id,
    ];
    await db.webhookEvent.deleteMany({ where: { paymentId: { in: payments.map((p) => p.id) } } });
    await db.checkIn.deleteMany({ where: { ticket: { eventId: { in: events } } } });
    await db.ticket.deleteMany({ where: { eventId: { in: events } } });
    await db.payment.deleteMany({ where: { id: { in: payments.map((p) => p.id) } } });
    await db.notification.deleteMany({ where: { userId: { in: ids } } });
    await db.auditLog.deleteMany({
      where: { OR: [{ actorId: { in: ids } }, { entityId: { in: entityIds } }] },
    });
    await db.orderItem.deleteMany({ where: { eventId: { in: events } } });
    await db.order.deleteMany({ where: { eventId: { in: events } } });
    await db.seat.updateMany({
      where: { eventId: { in: events } },
      data: { status: 'AVAILABLE', holdId: null },
    });
    await db.seatHold.deleteMany({ where: { eventId: { in: events } } });
    await db.seat.deleteMany({ where: { eventId: { in: events } } });
    await db.eventSection.deleteMany({ where: { eventId: { in: events } } });
    await db.ticketType.deleteMany({ where: { eventId: { in: events } } });
    await db.eventStaffAssignment.deleteMany({ where: { eventId: { in: events } } });
    await db.event.deleteMany({ where: { id: { in: events } } });
    await db.venue.deleteMany({ where: { id: { in: venues } } });
    await db.organization.delete({ where: { id: org.id } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  }
  return {
    app,
    db,
    ids,
    tokens,
    sessions,
    event,
    hold,
    http,
    headers,
    close,
    customerCount,
    lifecycle: app.get(HoldLifecycleService),
  };
}
