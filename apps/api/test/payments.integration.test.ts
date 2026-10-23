import type * as PayOSModule from '../src/payments/providers/payos.provider';
import type * as EnvironmentModule from '../src/config/environment';
import type * as CredentialModule from '../src/tickets/ticket-credential';
import { createRequire } from 'node:module';
import { createHmac, randomInt, randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { bookingFixture } from './booking-fixture';
const require = createRequire(import.meta.url);
const { PayOSPaymentProvider } =
  require('../dist/payments/providers/payos.provider.js') as typeof PayOSModule;
const { parseEnvironment } = require('../dist/config/environment.js') as typeof EnvironmentModule;
const { verifyTicketCredential, ticketKey } =
  require('../dist/tickets/ticket-credential.js') as typeof CredentialModule;
const checksum = 'a'.repeat(64);
const env = parseEnvironment({
  ...process.env,
  PAYMENT_PROVIDER: 'payos',
  PAYOS_CLIENT_ID: 'fixture-client',
  PAYOS_API_KEY: 'fixture-api',
  PAYOS_CHECKSUM_KEY: checksum,
});
describe('Verified PayOS callbacks with real PostgreSQL and Redis', () => {
  let f: Awaited<ReturnType<typeof bookingFixture>>;
  beforeAll(async () => {
    f = await bookingFixture(4, new PayOSPaymentProvider(env));
  });
  afterAll(async () => {
    await f?.close();
  });
  async function payment(count = 2) {
    const event = await f.event(count);
    const held = await f
      .hold(
        event.id,
        event.seats.map((s) => s.id),
      )
      .expect(201);
    const order = await f
      .http()
      .post('/api/v1/orders')
      .set(f.headers())
      .send({ holdId: held.body.id, idempotencyKey: randomUUID() })
      .expect(201);
    const p = await f.db.payment.create({
      data: {
        orderId: order.body.id,
        provider: 'payos',
        providerOrderCode: BigInt(randomInt(100000000000, 9000000000000)),
        providerReference: randomUUID().replaceAll('-', ''),
        amountVnd: order.body.totalVnd,
        expiresAt: new Date(order.body.expiresAt),
      },
    });
    return { event, holdId: held.body.id, orderId: order.body.id, p };
  }
  function callback(
    p: Awaited<ReturnType<typeof payment>>['p'],
    extra: Record<string, unknown> = {},
  ) {
    const data = {
      orderCode: Number(p.providerOrderCode),
      amount: p.amountVnd,
      description: 'Fixture',
      accountNumber: 'fixture-account',
      reference: `ref-${p.id}`,
      transactionDateTime: '2026-10-23 15:00:00',
      currency: 'VND',
      paymentLinkId: p.providerReference,
      code: '00',
      desc: 'success',
      ...extra,
    };
    const signed = Object.keys(data)
      .sort()
      .map((key) => `${key}=${data[key as keyof typeof data]}`)
      .join('&');
    return {
      code: '00',
      desc: 'success',
      success: true,
      data,
      signature: createHmac('sha256', checksum).update(signed).digest('hex'),
    };
  }
  it('rejects unsigned, malformed and tampered callbacks without selling seats', async () => {
    const x = await payment();
    await f.http().post('/api/v1/payments/webhook').send({}).expect(400);
    const body = callback(x.p);
    body.data.amount++;
    await f.http().post('/api/v1/payments/webhook').send(body).expect(400);
    expect(await f.db.ticket.count({ where: { eventId: x.event.id } })).toBe(0);
    expect((await f.db.order.findUniqueOrThrow({ where: { id: x.orderId } })).status).toBe(
      'PENDING_PAYMENT',
    );
  });
  it('concurrent duplicate callbacks issue exactly one ticket per item and one audit', async () => {
    const x = await payment();
    const body = callback(x.p);
    const results = await Promise.all(
      Array.from({ length: 20 }, () => f.http().post('/api/v1/payments/webhook').send(body)),
    );
    expect(results.map((r) => r.status)).toEqual(Array(20).fill(200));
    expect(await f.db.ticket.count({ where: { eventId: x.event.id } })).toBe(2);
    expect(await f.db.webhookEvent.count({ where: { paymentId: x.p.id } })).toBe(1);
    expect(
      await f.db.auditLog.count({ where: { entityId: x.p.id, action: 'PAYMENT_SUCCEEDED' } }),
    ).toBe(1);
    expect(
      await f.db.seat.count({ where: { eventId: x.event.id, status: 'SOLD', holdId: null } }),
    ).toBe(2);
    expect((await f.db.order.findUniqueOrThrow({ where: { id: x.orderId } })).status).toBe('PAID');
    await f.lifecycle.reconcile();
    expect(await f.db.seat.count({ where: { eventId: x.event.id, status: 'SOLD' } })).toBe(2);
    const tickets = await f
      .http()
      .get('/api/v1/tickets/me?page=1&pageSize=50')
      .set(f.headers())
      .expect(200);
    const ticket = tickets.body.items.find((t: { eventId: string }) => t.eventId === x.event.id);
    expect(
      verifyTicketCredential(ticket.qrCredential, ticketKey(parseEnvironment(process.env))),
    ).toBe(ticket.id);
    const own = await f.http().get(`/api/v1/tickets/${ticket.id}`).set(f.headers()).expect(200);
    expect(own.headers['cache-control']).toBe('no-store');
    await f.http().get(`/api/v1/tickets/${ticket.id}`).set(f.headers(1)).expect(403);
    await f.http().get(`/api/v1/payments/${x.p.id}/status`).set(f.headers(1)).expect(403);
  });
  it('records a second distinct bank transfer for review while preserving already issued tickets', async () => {
    const x = await payment();
    await f.http().post('/api/v1/payments/webhook').send(callback(x.p)).expect(200);
    await f
      .http()
      .post('/api/v1/payments/webhook')
      .send(callback(x.p, { reference: `extra-${x.p.id}` }))
      .expect(200);
    expect((await f.db.payment.findUniqueOrThrow({ where: { id: x.p.id } })).status).toBe(
      'REFUND_REQUIRED',
    );
    expect((await f.db.order.findUniqueOrThrow({ where: { id: x.orderId } })).status).toBe('PAID');
    expect(await f.db.ticket.count({ where: { eventId: x.event.id, status: 'VALID' } })).toBe(2);
    expect(
      await f.db.auditLog.count({
        where: { entityId: x.p.id, action: 'PAYMENT_EXTRA_TRANSFER_REVIEW' },
      }),
    ).toBe(1);
  });
  it('rejects changed content reusing a transaction reference', async () => {
    const x = await payment();
    await f.http().post('/api/v1/payments/webhook').send(callback(x.p)).expect(200);
    await f
      .http()
      .post('/api/v1/payments/webhook')
      .send(callback(x.p, { amount: x.p.amountVnd + 1 }))
      .expect(409);
    expect(await f.db.ticket.count({ where: { eventId: x.event.id } })).toBe(2);
  });
  it('never trusts unsigned outer success/code fields over signed payment data', async () => {
    const x = await payment();
    await f
      .http()
      .post('/api/v1/payments/webhook')
      .send(callback(x.p, { code: '99' }))
      .expect(200);
    expect(await f.db.ticket.count({ where: { eventId: x.event.id } })).toBe(0);
  });
  it.each([{ amount: 1 }, { currency: 'USD' }])(
    'records refund review on a verified amount/currency mismatch %o',
    async (extra) => {
      const x = await payment();
      await f.http().post('/api/v1/payments/webhook').send(callback(x.p, extra)).expect(200);
      expect((await f.db.order.findUniqueOrThrow({ where: { id: x.orderId } })).status).toBe(
        'REFUND_REQUIRED',
      );
      expect((await f.db.payment.findUniqueOrThrow({ where: { id: x.p.id } })).status).toBe(
        'REFUND_REQUIRED',
      );
      expect(await f.db.ticket.count({ where: { eventId: x.event.id } })).toBe(0);
      expect(await f.db.seat.count({ where: { eventId: x.event.id, status: 'AVAILABLE' } })).toBe(
        2,
      );
    },
  );
  it('late payment after expiry and another customer reclaim cannot sell that customer seats', async () => {
    const x = await payment();
    await f.db.seatHold.update({
      where: { id: x.holdId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await f.db.order.update({
      where: { id: x.orderId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const next = await f
      .hold(
        x.event.id,
        x.event.seats.map((s) => s.id),
        1,
      )
      .expect(201);
    await f.http().post('/api/v1/payments/webhook').send(callback(x.p)).expect(200);
    expect((await f.db.order.findUniqueOrThrow({ where: { id: x.orderId } })).status).toBe(
      'REFUND_REQUIRED',
    );
    expect(await f.db.ticket.count({ where: { eventId: x.event.id } })).toBe(0);
    expect(
      await f.db.seat.count({
        where: { eventId: x.event.id, holdId: next.body.id, status: 'HELD' },
      }),
    ).toBe(2);
  });
  it('late payment cannot change seats already SOLD by a newer paid order', async () => {
    const x = await payment();
    await f.db.seatHold.update({
      where: { id: x.holdId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await f.db.order.update({
      where: { id: x.orderId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const next = await f
      .hold(
        x.event.id,
        x.event.seats.map((s) => s.id),
        1,
      )
      .expect(201);
    const order = await f
      .http()
      .post('/api/v1/orders')
      .set(f.headers(1))
      .send({ holdId: next.body.id, idempotencyKey: randomUUID() })
      .expect(201);
    const other = await f.db.payment.create({
      data: {
        orderId: order.body.id,
        provider: 'payos',
        providerOrderCode: BigInt(randomInt(100000000000, 9000000000000)),
        providerReference: randomUUID(),
        amountVnd: order.body.totalVnd,
        expiresAt: new Date(order.body.expiresAt),
      },
    });
    await f.http().post('/api/v1/payments/webhook').send(callback(other)).expect(200);
    await f.http().post('/api/v1/payments/webhook').send(callback(x.p)).expect(200);
    expect((await f.db.order.findUniqueOrThrow({ where: { id: x.orderId } })).status).toBe(
      'REFUND_REQUIRED',
    );
    expect(await f.db.ticket.count({ where: { eventId: x.event.id } })).toBe(2);
    expect(await f.db.ticket.count({ where: { orderItem: { orderId: order.body.id } } })).toBe(2);
    expect(await f.db.seat.count({ where: { eventId: x.event.id, status: 'SOLD' } })).toBe(2);
  });
  it('rolls back inventory, settlement and webhook when ticket uniqueness fails; retries safely after repair', async () => {
    const x = await payment(1),
      seatId = x.event.seats[0]!.id;
    const hold = await f.db.seatHold.create({
      data: {
        eventId: x.event.id,
        userId: f.ids[1]!,
        requestedSeatIds: [seatId],
        expiresAt: new Date(Date.now() - 1000),
        releasedAt: new Date(),
      },
    });
    const oldOrder = await f.db.order.create({
      data: {
        eventId: x.event.id,
        userId: f.ids[1]!,
        holdId: hold.id,
        status: 'PAID',
        idempotencyKey: randomUUID(),
        expiresAt: hold.expiresAt,
        totalVnd: 1200000,
      },
    });
    const item = await f.db.orderItem.create({
      data: { orderId: oldOrder.id, eventId: x.event.id, seatId, priceVnd: 1200000 },
    });
    const inconsistent = await f.db.ticket.create({
      data: {
        orderItemId: item.id,
        eventId: x.event.id,
        seatId,
        code: randomUUID(),
        qrTokenHash: 'e'.repeat(64),
      },
    });
    await f.http().post('/api/v1/payments/webhook').send(callback(x.p)).expect(500);
    expect((await f.db.seat.findUniqueOrThrow({ where: { id: seatId } })).status).toBe('HELD');
    expect((await f.db.order.findUniqueOrThrow({ where: { id: x.orderId } })).status).toBe(
      'PENDING_PAYMENT',
    );
    expect((await f.db.payment.findUniqueOrThrow({ where: { id: x.p.id } })).status).toBe(
      'PENDING',
    );
    expect(await f.db.webhookEvent.count({ where: { paymentId: x.p.id } })).toBe(0);
    await f.db.ticket.delete({ where: { id: inconsistent.id } });
    await f.http().post('/api/v1/payments/webhook').send(callback(x.p)).expect(200);
    expect(await f.db.ticket.count({ where: { eventId: x.event.id } })).toBe(1);
  });
  it('rejects changing provider on an existing order without calling PayOS', async () => {
    const x = await payment();
    await f.db.payment.update({ where: { id: x.p.id }, data: { provider: 'mock' } });
    await f
      .http()
      .post('/api/v1/payments/create')
      .set(f.headers())
      .send({ orderId: x.orderId, idempotencyKey: randomUUID() })
      .expect(409);
    expect(await f.db.payment.count({ where: { orderId: x.orderId } })).toBe(1);
  });
  it('callback after explicit cancellation requires refund and creates no tickets', async () => {
    const x = await payment();
    await f.http().delete(`/api/v1/orders/${x.orderId}`).set(f.headers()).expect(200);
    await f.http().post('/api/v1/payments/webhook').send(callback(x.p)).expect(200);
    expect((await f.db.order.findUniqueOrThrow({ where: { id: x.orderId } })).status).toBe(
      'REFUND_REQUIRED',
    );
    expect(await f.db.ticket.count({ where: { eventId: x.event.id } })).toBe(0);
  });
  it('signed webhook with a different link reference is rejected', async () => {
    const x = await payment();
    await f
      .http()
      .post('/api/v1/payments/webhook')
      .send(callback(x.p, { paymentLinkId: 'different-link' }))
      .expect(400);
    expect(await f.db.ticket.count({ where: { eventId: x.event.id } })).toBe(0);
  });
  it('acknowledges signed provider verification samples without issuing tickets', async () => {
    const x = await payment();
    const result = await f
      .http()
      .post('/api/v1/payments/webhook')
      .send(callback(x.p, { orderCode: 123 }))
      .expect(200);
    expect(result.body).toEqual({ accepted: true, ignored: true });
  });
  it('callback racing order cancellation has exactly one valid terminal outcome', async () => {
    const x = await payment();
    const [paid, cancel] = await Promise.all([
      f.http().post('/api/v1/payments/webhook').send(callback(x.p)),
      f.http().delete(`/api/v1/orders/${x.orderId}`).set(f.headers()),
    ]);
    expect(paid.status).toBe(200);
    expect([200, 409]).toContain(cancel.status);
    const order = await f.db.order.findUniqueOrThrow({ where: { id: x.orderId } });
    const count = await f.db.ticket.count({ where: { eventId: x.event.id } });
    expect(['PAID', 'REFUND_REQUIRED']).toContain(order.status);
    expect(count).toBe(order.status === 'PAID' ? 2 : 0);
    expect(await f.db.seat.count({ where: { eventId: x.event.id, status: 'SOLD' } })).toBe(count);
  });
});

describe('Development mock payment uses real order/finalization services', () => {
  let f: Awaited<ReturnType<typeof bookingFixture>>;
  beforeAll(async () => {
    f = await bookingFixture(3);
  });
  afterAll(async () => {
    await f?.close();
  });
  async function prepare() {
    const e = await f.event(1);
    const held = await f.hold(e.id, [e.seats[0]!.id]).expect(201);
    const order = await f
      .http()
      .post('/api/v1/orders')
      .set(f.headers())
      .send({ holdId: held.body.id, idempotencyKey: randomUUID() })
      .expect(201);
    return { e, order: order.body };
  }
  it('creates one stable session for concurrent retries without extending expiry', async () => {
    const x = await prepare(),
      key = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        f
          .http()
          .post('/api/v1/payments/create')
          .set(f.headers())
          .send({ orderId: x.order.id, idempotencyKey: key }),
      ),
    );
    expect(results.every((r) => r.status === 201)).toBe(true);
    expect(new Set(results.map((r) => r.body.id)).size).toBe(1);
    expect(results[0]!.body.expiresAt).toBe(x.order.expiresAt);
    expect(await f.db.payment.count({ where: { orderId: x.order.id } })).toBe(1);
  });
  it('binds a payment retry key to one order', async () => {
    const a = await prepare(),
      b = await prepare(),
      key = randomUUID();
    await f
      .http()
      .post('/api/v1/payments/create')
      .set(f.headers())
      .send({ orderId: a.order.id, idempotencyKey: key })
      .expect(201);
    await f
      .http()
      .post('/api/v1/payments/create')
      .set(f.headers())
      .send({ orderId: b.order.id, idempotencyKey: key })
      .expect(409);
    expect(await f.db.payment.count({ where: { orderId: b.order.id } })).toBe(0);
  });
  it.each(['failed', 'cancelled', 'duplicate'])(
    'handles local %s through authoritative finalization',
    async (outcome) => {
      const x = await prepare();
      const p = await f
        .http()
        .post('/api/v1/payments/create')
        .set(f.headers())
        .send({ orderId: x.order.id, idempotencyKey: randomUUID() })
        .expect(201);
      await f
        .http()
        .post(`/api/v1/payments/${p.body.id}/simulate`)
        .set(f.headers(1))
        .send({ outcome })
        .expect(403);
      const done = await f
        .http()
        .post(`/api/v1/payments/${p.body.id}/simulate`)
        .set(f.headers())
        .send({ outcome })
        .expect(200);
      expect(done.body.status).toBe(
        outcome === 'duplicate' ? 'SUCCEEDED' : outcome === 'failed' ? 'FAILED' : 'CANCELLED',
      );
      expect(await f.db.ticket.count({ where: { eventId: x.e.id } })).toBe(
        outcome === 'duplicate' ? 1 : 0,
      );
    },
  );
  it('waits for the scheduled mock result rather than accepting a frontend return', async () => {
    const x = await prepare();
    const p = await f
      .http()
      .post('/api/v1/payments/create')
      .set(f.headers())
      .send({ orderId: x.order.id, idempotencyKey: randomUUID() })
      .expect(201);
    await f
      .http()
      .post(`/api/v1/payments/${p.body.id}/simulate`)
      .set(f.headers())
      .send({ outcome: 'delayed' })
      .expect(200);
    let status = await f
      .http()
      .get(`/api/v1/payments/${p.body.id}/status`)
      .set(f.headers())
      .expect(200);
    expect(status.body.status).toBe('PENDING');
    expect(await f.db.ticket.count({ where: { eventId: x.e.id } })).toBe(0);
    await f.db.payment.update({
      where: { id: p.body.id },
      data: { mockDueAt: new Date(Date.now() - 1000), reconciledAt: null },
    });
    status = await f
      .http()
      .get(`/api/v1/payments/${p.body.id}/status`)
      .set(f.headers())
      .expect(200);
    expect(status.body.status).toBe('SUCCEEDED');
    expect(await f.db.ticket.count({ where: { eventId: x.e.id } })).toBe(1);
  });
});
