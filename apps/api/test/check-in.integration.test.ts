import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { bookingFixture } from './booking-fixture';
describe('Atomic staff admission, scoped analytics and admin access', () => {
  let f: Awaited<ReturnType<typeof bookingFixture>>;
  beforeAll(async () => {
    f = await bookingFixture(5);
    await f.db.user.update({ where: { id: f.ids[2]! }, data: { role: 'STAFF' } });
    await f.db.user.update({ where: { id: f.ids[3]! }, data: { role: 'ADMIN' } });
  });
  afterAll(async () => {
    await f?.close();
  });
  async function paid() {
    const e = await f.event(1);
    await f.db.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: e.organizationId, userId: f.ids[5]! } },
      create: { organizationId: e.organizationId, userId: f.ids[5]! },
      update: {},
    });
    await f.db.eventStaffAssignment.create({ data: { eventId: e.id, userId: f.ids[2]! } });
    const h = await f.hold(e.id, [e.seats[0]!.id]).expect(201);
    const o = await f
      .http()
      .post('/api/v1/orders')
      .set(f.headers())
      .send({ holdId: h.body.id, idempotencyKey: randomUUID() })
      .expect(201);
    const p = await f
      .http()
      .post('/api/v1/payments/create')
      .set(f.headers())
      .send({ orderId: o.body.id, idempotencyKey: randomUUID() })
      .expect(201);
    await f
      .http()
      .post(`/api/v1/payments/${p.body.id}/simulate`)
      .set(f.headers())
      .send({ outcome: 'success' })
      .expect(200);
    const t = await f.db.ticket.findFirstOrThrow({ where: { eventId: e.id } });
    return { e, t, body: { eventId: e.id, credential: t.code } };
  }
  it('requires assigned STAFF and verify does not consume a ticket', async () => {
    const x = await paid();
    await f.http().post('/api/v1/check-in/verify').send(x.body).expect(401);
    await f.http().post('/api/v1/check-in/verify').set(f.headers()).send(x.body).expect(403);
    const v = await f
      .http()
      .post('/api/v1/check-in/verify')
      .set(f.headers(2))
      .send(x.body)
      .expect(201);
    expect(v.body.outcome).toBe('VALID');
    expect(await f.db.checkIn.count({ where: { ticketId: x.t.id } })).toBe(0);
  });
  it.each([20, 100])('%i concurrent confirmations admit exactly once', async (n) => {
    const x = await paid();
    const replies = await Promise.all(
      Array.from({ length: n }, () =>
        f.http().post('/api/v1/check-in/confirm').set(f.headers(2)).send(x.body),
      ),
    );
    expect(replies.filter((r) => r.status === 201)).toHaveLength(1);
    expect(replies.filter((r) => r.status === 409)).toHaveLength(n - 1);
    expect(await f.db.checkIn.count({ where: { ticketId: x.t.id } })).toBe(1);
    expect(
      await f.db.auditLog.count({ where: { entityId: x.t.id, action: 'TICKET_CHECKED_IN' } }),
    ).toBe(1);
    const stats = await f
      .http()
      .get(`/api/v1/check-in/events/${x.e.id}/stats`)
      .set(f.headers(2))
      .expect(200);
    expect(stats.body.checkedIn).toBe(1);
    expect(stats.body.remaining).toBe(0);
  });
  it('rejects a forged QR and wrong event without consumption', async () => {
    const x = await paid(),
      other = await f.event();
    await f.db.eventStaffAssignment.create({ data: { eventId: other.id, userId: f.ids[2]! } });
    const invalid = await f
      .http()
      .post('/api/v1/check-in/verify')
      .set(f.headers(2))
      .send({ ...x.body, credential: `tf1.${x.t.id}.${'a'.repeat(43)}` })
      .expect(201);
    expect(invalid.body.outcome).toBe('INVALID');
    const wrong = await f
      .http()
      .post('/api/v1/check-in/verify')
      .set(f.headers(2))
      .send({ ...x.body, eventId: other.id })
      .expect(201);
    expect(wrong.body.outcome).toBe('WRONG_EVENT');
    expect(wrong.body.ticket).toBeNull();
    await f
      .http()
      .post('/api/v1/check-in/confirm')
      .set(f.headers(2))
      .send({ ...x.body, eventId: other.id })
      .expect(422);
  });
  it('blocks cancelled tickets and revoked assignment', async () => {
    const x = await paid();
    await f.db.ticket.update({ where: { id: x.t.id }, data: { status: 'CANCELLED' } });
    await f.http().post('/api/v1/check-in/confirm').set(f.headers(2)).send(x.body).expect(422);
    await f.db.eventStaffAssignment.deleteMany({ where: { eventId: x.e.id, userId: f.ids[2]! } });
    await f.http().get(`/api/v1/check-in/events/${x.e.id}/stats`).set(f.headers(2)).expect(403);
    await f.http().post('/api/v1/check-in/confirm').set(f.headers(2)).send(x.body).expect(403);
  });
  it('reports exact paid revenue, no other organizer data, Vietnam boundaries', async () => {
    const x = await paid();
    await f.db.order.update({
      where: { holdId: (await f.db.order.findFirstOrThrow({ where: { eventId: x.e.id } })).holdId },
      data: { paidAt: new Date('2026-09-30T17:00:00Z') },
    });
    const r = await f
      .http()
      .get(`/api/v1/organizer/analytics?eventId=${x.e.id}&from=2026-10-01&to=2026-10-01`)
      .set(f.headers(5))
      .expect(200);
    expect(r.body.revenueVnd).toBe(1200000);
    expect(r.body.paidOrders).toBe(1);
    expect(r.body.soldTickets).toBe(1);
    expect(r.body.revenueByDay).toEqual([{ date: '2026-10-01', revenueVnd: 1200000, orders: 1 }]);
    await f.db.organizationMember.deleteMany({
      where: { userId: f.ids[5]!, organizationId: x.e.organizationId },
    });
    await f
      .http()
      .get(`/api/v1/organizer/analytics?eventId=${x.e.id}`)
      .set(f.headers(5))
      .expect(403);
  });
  it('admin lock revokes sessions and cannot target ADMIN; unlock does not restore old JWT', async () => {
    await f.http().get('/api/v1/admin/dashboard').set(f.headers()).expect(403);
    await f
      .http()
      .patch(`/api/v1/admin/users/${f.ids[3]}/access`)
      .set(f.headers(3))
      .send({ isActive: false, reason: 'Protect admin account' })
      .expect(409);
    await f
      .http()
      .patch(`/api/v1/admin/users/${f.ids[4]}/access`)
      .set(f.headers(3))
      .send({ isActive: false, reason: 'Integration account lock' })
      .expect(200);
    await f.http().get('/api/v1/auth/me').set(f.headers(4)).expect(401);
    await f
      .http()
      .patch(`/api/v1/admin/users/${f.ids[4]}/access`)
      .set(f.headers(3))
      .send({ isActive: true, reason: 'Integration account unlock' })
      .expect(200);
    await f.http().get('/api/v1/auth/me').set(f.headers(4)).expect(401);
    const d = await f.http().get('/api/v1/admin/dashboard').set(f.headers(3)).expect(200);
    expect(d.body.revenueVnd).toBeGreaterThan(0);
    const m = await f.http().get('/api/v1/admin/monitoring').set(f.headers(3)).expect(200);
    expect(m.body.httpRequestsTotal).toBeGreaterThan(0);
    expect(m.body.queue).toBeNull();
  });
  it('concurrent organization reviews have one winner and one audit', async () => {
    const x = await paid();
    await f.db.organization.update({
      where: { id: x.e.organizationId },
      data: { status: 'PENDING' },
    });
    const results = await Promise.all(
      ['APPROVED', 'REJECTED'].map((decision) =>
        f
          .http()
          .patch(`/api/v1/admin/organizations/${x.e.organizationId}/review`)
          .set(f.headers(3))
          .send({ decision, reason: 'Integration review decision' }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(
      await f.db.auditLog.count({
        where: { entityType: 'Organization', entityId: x.e.organizationId },
      }),
    ).toBe(1);
  });
});
