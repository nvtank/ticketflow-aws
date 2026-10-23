import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { bookingFixture } from './booking-fixture';
describe('Atomic reservations and checkout with PostgreSQL and Redis', () => {
  let f: Awaited<ReturnType<typeof bookingFixture>>;
  beforeAll(async () => {
    f = await bookingFixture();
  });
  afterAll(async () => {
    await f?.close();
  });
  it('requires authentication, customer role and validated UUID inputs', async () => {
    const e = await f.event();
    await f
      .http()
      .post(`/api/v1/events/${e.id}/holds`)
      .send({ seatIds: [e.seats[0]!.id], idempotencyKey: randomUUID() })
      .expect(401);
    await f.hold(e.id, [e.seats[0]!.id], f.customerCount).expect(403);
    await f.hold(e.id, []).expect(400);
    await f.hold(e.id, [e.seats[0]!.id, e.seats[0]!.id]).expect(400);
    await f.hold(e.id, ['invalid']).expect(400);
  });
  it.each([20, 100])(
    '%i simultaneous HTTP requests produce one valid hold for one seat',
    async (count) => {
      const e = await f.event(1),
        seat = e.seats[0]!;
      const results = await Promise.all(
        Array.from({ length: count }, (_, user) => f.hold(e.id, [seat.id], user)),
      );
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(results.filter((r) => r.status === 409)).toHaveLength(count - 1);
      expect(await f.db.seatHold.count({ where: { eventId: e.id } })).toBe(1);
      const stored = await f.db.seat.findUniqueOrThrow({ where: { id: seat.id } });
      expect(stored.status).toBe('HELD');
      expect(stored.holdId).toBe(results.find((r) => r.status === 201)!.body.id);
    },
  );
  it('rolls back all seats when any requested seat is unavailable', async () => {
    const e = await f.event(3);
    await f.hold(e.id, [e.seats[1]!.id], 1).expect(201);
    await f.hold(e.id, [e.seats[0]!.id, e.seats[1]!.id], 0).expect(409);
    expect((await f.db.seat.findUniqueOrThrow({ where: { id: e.seats[0]!.id } })).status).toBe(
      'AVAILABLE',
    );
    expect(await f.db.seatHold.count({ where: { eventId: e.id } })).toBe(1);
  });
  it('serializes overlapping groups supplied in opposite order', async () => {
    const e = await f.event(3);
    const results = await Promise.all([
      f.hold(e.id, [e.seats[1]!.id, e.seats[0]!.id], 0),
      f.hold(e.id, [e.seats[2]!.id, e.seats[1]!.id], 1),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await f.db.seat.count({ where: { eventId: e.id, status: 'HELD' } })).toBe(2);
  });
  it('enforces the event limit and one active hold per customer under concurrency', async () => {
    const e = await f.event(6);
    await f
      .hold(
        e.id,
        e.seats.slice(0, 5).map((s) => s.id),
      )
      .expect(400);
    const results = await Promise.all([
      f.hold(e.id, [e.seats[0]!.id]),
      f.hold(e.id.toUpperCase(), [e.seats[1]!.id]),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await f.db.seatHold.count({ where: { eventId: e.id } })).toBe(1);
  });
  it('handles duplicate retry keys without creating another hold or extending expiry', async () => {
    const e = await f.event(),
      key = randomUUID(),
      ids = e.seats.slice(0, 2).map((s) => s.id);
    const a = await f.hold(e.id, ids, 0, key).expect(201);
    const b = await f.hold(e.id, [...ids].reverse(), 0, key).expect(201);
    expect(b.body.id).toBe(a.body.id);
    expect(b.body.expiresAt).toBe(a.body.expiresAt);
    expect(new Date(a.body.expiresAt).getTime() - new Date(a.body.serverTime).getTime()).toBe(
      300000,
    );
    await f.hold(e.id, [e.seats[2]!.id], 0, key).expect(409);
  });
  it('handles a concurrent retry key reused across events as one hold and one conflict', async () => {
    const a = await f.event(1),
      b = await f.event(1),
      key = randomUUID();
    const results = await Promise.all([
      f.hold(a.id, [a.seats[0]!.id], 0, key),
      f.hold(b.id, [b.seats[0]!.id], 0, key),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await f.db.seatHold.count({ where: { userId: f.ids[0], idempotencyKey: key } })).toBe(1);
    expect(
      await f.db.seat.count({ where: { eventId: { in: [a.id, b.id] }, status: 'HELD' } }),
    ).toBe(1);
  });
  it('rejects closed sales and caps TTL at sale end', async () => {
    const e = await f.event();
    await f.db.event.update({
      where: { id: e.id },
      data: { salesEndAt: new Date(Date.now() + 60000) },
    });
    const h = await f.hold(e.id, [e.seats[0]!.id]).expect(201);
    expect(new Date(h.body.expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(60000);
    await f.db.event.update({
      where: { id: e.id },
      data: { salesEndAt: new Date(Date.now() - 1000) },
    });
    await f.hold(e.id, [e.seats[1]!.id], 1).expect(409);
  });
  it('lets another user reclaim expired seats before reconciliation', async () => {
    const e = await f.event(1);
    const a = await f.hold(e.id, [e.seats[0]!.id], 0).expect(201);
    await f.db.seatHold.update({
      where: { id: a.body.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const b = await f.hold(e.id, [e.seats[0]!.id], 1).expect(201);
    await f.lifecycle.reconcile();
    expect((await f.db.seat.findUniqueOrThrow({ where: { id: e.seats[0]!.id } })).holdId).toBe(
      b.body.id,
    );
    await f
      .http()
      .post('/api/v1/orders')
      .set(f.headers(0))
      .send({ holdId: a.body.id, idempotencyKey: randomUUID() })
      .expect(409);
  });
  it('rejects another owner and makes release idempotent', async () => {
    const e = await f.event();
    const h = await f.hold(e.id, [e.seats[0]!.id]).expect(201);
    await f.http().get(`/api/v1/holds/${h.body.id}`).set(f.headers(1)).expect(403);
    await f.http().delete(`/api/v1/holds/${h.body.id}`).set(f.headers(1)).expect(403);
    await f.http().delete(`/api/v1/holds/${h.body.id}`).set(f.headers()).expect(200);
    await f.http().delete(`/api/v1/holds/${h.body.id}`).set(f.headers()).expect(200);
    expect((await f.db.seat.findUniqueOrThrow({ where: { id: e.seats[0]!.id } })).status).toBe(
      'AVAILABLE',
    );
  });
  it('recovers my hold on reload without exposing any other holder identity', async () => {
    const e = await f.event();
    const h = await f.hold(e.id, [e.seats[0]!.id]).expect(201);
    const mine = await f
      .http()
      .get(`/api/v1/events/${e.id}/booking-state`)
      .set(f.headers())
      .expect(200);
    expect(mine.body.activeHold.id).toBe(h.body.id);
    expect(mine.body.seats[0].status).toBe('HELD_BY_ME');
    const other = await f
      .http()
      .get(`/api/v1/events/${e.id}/booking-state`)
      .set(f.headers(1))
      .expect(200);
    expect(other.body.activeHold).toBeNull();
    expect(other.body.seats[0].status).toBe('HELD_BY_OTHERS');
    expect(JSON.stringify(other.body)).not.toContain(f.ids[0]);
    expect(JSON.stringify(other.body)).not.toContain(h.body.id);
  });
  it('creates one server-priced order on retries and preserves original expiry', async () => {
    const e = await f.event();
    const h = await f
        .hold(
          e.id,
          e.seats.slice(0, 2).map((s) => s.id),
        )
        .expect(201),
      key = randomUUID();
    const results = await Promise.all(
      [0, 1].map(() =>
        f
          .http()
          .post('/api/v1/orders')
          .set(f.headers())
          .send({ holdId: h.body.id, idempotencyKey: key }),
      ),
    );
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    expect(results[0]!.body.id).toBe(results[1]!.body.id);
    expect(results[0]!.body.totalVnd).toBe(2400000);
    expect(results[0]!.body.expiresAt).toBe(h.body.expiresAt);
    expect(await f.db.order.count({ where: { eventId: e.id } })).toBe(1);
    await f
      .http()
      .post('/api/v1/orders')
      .set(f.headers())
      .send({ holdId: h.body.id, idempotencyKey: key, totalVnd: 1 })
      .expect(400);
    await f.http().get(`/api/v1/orders/${results[0]!.body.id}`).set(f.headers(1)).expect(403);
    await f.http().get('/api/v1/orders/me').set(f.headers()).expect(200);
    await f.http().delete(`/api/v1/orders/${results[0]!.body.id}`).set(f.headers()).expect(200);
    expect(await f.db.seat.count({ where: { eventId: e.id, status: 'AVAILABLE' } })).toBe(4);
  });
  it('expires pending orders and never releases SOLD inventory', async () => {
    const e = await f.event(2);
    const h = await f.hold(e.id, [e.seats[0]!.id]).expect(201);
    const o = await f
      .http()
      .post('/api/v1/orders')
      .set(f.headers())
      .send({ holdId: h.body.id, idempotencyKey: randomUUID() })
      .expect(201);
    await f.db.seatHold.update({
      where: { id: h.body.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await f.db.order.update({
      where: { id: o.body.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await f.lifecycle.reconcile();
    expect((await f.db.order.findUniqueOrThrow({ where: { id: o.body.id } })).status).toBe(
      'EXPIRED',
    );
    const sold = await f.hold(e.id, [e.seats[1]!.id], 1).expect(201);
    await f.db.seat.update({
      where: { id: e.seats[1]!.id },
      data: { status: 'SOLD', holdId: null },
    });
    await f.db.seatHold.update({
      where: { id: sold.body.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await f.lifecycle.reconcile();
    expect((await f.db.seat.findUniqueOrThrow({ where: { id: e.seats[1]!.id } })).status).toBe(
      'SOLD',
    );
    await f.hold(e.id, [e.seats[1]!.id], 2).expect(409);
  });
});
