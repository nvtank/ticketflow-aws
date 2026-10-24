import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bookingFixture } from './booking-fixture';

describe('Published artist discovery and verified booking reviews', () => {
  let f: Awaited<ReturnType<typeof bookingFixture>>;
  const artistIds: string[] = [];
  let eventId: string;
  let reviewId: string;
  let ticketId: string;
  beforeAll(async () => {
    f = await bookingFixture(3);
  });
  afterAll(async () => {
    if (f) {
      await f.db.artist.deleteMany({ where: { id: { in: artistIds } } });
      await f.close();
    }
  });
  it('serves searchable demo artist profiles and only public event relationships', async () => {
    const published = await f.event(),
      draft = await f.event();
    await f.db.event.update({ where: { id: draft.id }, data: { status: 'DRAFT' } });
    const a = await f.db.artist.create({
      data: {
        slug: `demo-${randomUUID()}`,
        name: `Demo ${randomUUID()}`,
        genre: 'Fixture genre',
        tagline: 'Fixture tagline',
        biography: 'Labelled test profile',
        isPublished: true,
        isDemo: true,
        events: { create: [{ eventId: published.id }, { eventId: draft.id }] },
      },
    });
    artistIds.push(a.id);
    const found = await f
      .http()
      .get('/api/v1/artists')
      .query({ q: a.name, genre: a.genre, pageSize: 1 })
      .expect(200);
    expect(found.body.items).toHaveLength(1);
    expect(found.body.items[0]).toMatchObject({ id: a.id, isDemo: true, upcomingEvents: 1 });
    expect(found.body.pagination.total).toBe(1);
    const detail = await f.http().get(`/api/v1/artists/${a.slug}`).expect(200);
    expect(detail.body.events.map((e: { id: string }) => e.id)).toEqual([published.id]);
    expect(
      (await f.http().get('/api/v1/artists').query({ eventId: draft.id }).expect(200)).body.items,
    ).toHaveLength(0);
    await f.db.artist.update({ where: { id: a.id }, data: { isPublished: false } });
    await f.http().get(`/api/v1/artists/${a.slug}`).expect(404);
    expect(
      (await f.http().get('/api/v1/artists').query({ q: a.name }).expect(200)).body.items,
    ).toHaveLength(0);
    await f.http().get('/api/v1/artists?pageSize=200').expect(400);
  });
  it('rejects anonymous writes, invalid ratings and users without a paid ticket', async () => {
    const e = await f.event();
    const route = `/api/v1/events/${e.id}/review`;
    await f.http().put(route).send({ rating: 5, comment: 'No authentication' }).expect(401);
    await f
      .http()
      .put(route)
      .set(f.headers())
      .send({ rating: 6, comment: 'Invalid rating input' })
      .expect(400);
    await f
      .http()
      .put(route)
      .set(f.headers(1))
      .send({ rating: 4, comment: 'Cannot forge a verified purchase' })
      .expect(403);
    expect(await f.db.eventReview.count({ where: { eventId: e.id } })).toBe(0);
    const context = await f
      .http()
      .get(`/api/v1/events/${e.id}/review-context`)
      .set(f.headers(1))
      .expect(200);
    expect(context.body).toEqual({ eligible: false, review: null });
    await f.http().get('/api/v1/reviews?rating=0').expect(400);
  });
  it('publishes, updates and aggregates a review after actual mock settlement', async () => {
    const e = await f.event(1);
    eventId = e.id;
    const hold = await f.hold(e.id, [e.seats[0]!.id]).expect(201);
    const order = await f
      .http()
      .post('/api/v1/orders')
      .set(f.headers())
      .send({ holdId: hold.body.id, idempotencyKey: randomUUID() })
      .expect(201);
    const payment = await f
      .http()
      .post('/api/v1/payments/create')
      .set(f.headers())
      .send({ orderId: order.body.id, idempotencyKey: randomUUID() })
      .expect(201);
    await f
      .http()
      .post(`/api/v1/payments/${payment.body.id}/simulate`)
      .set(f.headers())
      .send({ outcome: 'success' })
      .expect(200);
    ticketId = (await f.db.ticket.findFirstOrThrow({ where: { eventId } })).id;
    const created = await f
      .http()
      .put(`/api/v1/events/${eventId}/review`)
      .set(f.headers())
      .send({ rating: 5, comment: '  Chọn ghế và nhận vé thuận tiện.  ' })
      .expect(200);
    reviewId = created.body.id;
    expect(created.body.comment).toBe('Chọn ghế và nhận vé thuận tiện.');
    expect(created.body).not.toHaveProperty('ticketId');
    expect(created.body.author).not.toHaveProperty('email');
    const updated = await f
      .http()
      .put(`/api/v1/events/${eventId}/review`)
      .set(f.headers())
      .send({ rating: 4, comment: 'Đã cập nhật cảm nhận về việc đặt vé.' })
      .expect(200);
    expect(updated.body.id).toBe(reviewId);
    const list = await f.http().get('/api/v1/reviews').query({ eventId, rating: 4 }).expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.summary).toMatchObject({ count: 1, average: 4 });
    await f.db.event.update({ where: { id: eventId }, data: { status: 'COMPLETED' } });
    await f.http().get(`/api/v1/events/${eventId}`).expect(200);
    expect(
      (await f.http().get('/api/v1/reviews').query({ eventId }).expect(200)).body.items,
    ).toHaveLength(1);
    expect(await f.db.eventReview.count({ where: { eventId } })).toBe(1);
    expect(
      await f.db.auditLog.count({ where: { entityId: reviewId, action: 'REVIEW_SAVED' } }),
    ).toBe(2);
  });
  it('serializes concurrent review updates into one author/event record', async () => {
    const responses = await Promise.all(
      [4, 5].map((rating) =>
        f
          .http()
          .put(`/api/v1/events/${eventId}/review`)
          .set(f.headers())
          .send({ rating, comment: `Concurrent update ${rating}, real transaction.` }),
      ),
    );
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    expect(await f.db.eventReview.count({ where: { eventId, authorId: f.ids[0] } })).toBe(1);
    expect(new Set(responses.map((r) => r.body.id)).size).toBe(1);
  });
  it('prevents another author deleting a review or exposing purchase credentials', async () => {
    await f.http().delete(`/api/v1/reviews/${reviewId}`).set(f.headers(1)).expect(404);
    expect(await f.db.eventReview.count({ where: { id: reviewId } })).toBe(1);
    const context = await f
      .http()
      .get(`/api/v1/events/${eventId}/review-context`)
      .set(f.headers())
      .expect(200);
    expect(context.body.eligible).toBe(true);
    expect(context.body.review.id).toBe(reviewId);
    expect(JSON.stringify(context.body)).not.toContain(ticketId);
  });
  it('hides revoked tickets and refuses editing an ineligible review', async () => {
    await f.db.ticket.update({ where: { id: ticketId }, data: { status: 'CANCELLED' } });
    const list = await f.http().get('/api/v1/reviews').query({ eventId }).expect(200);
    expect(list.body.items).toHaveLength(0);
    expect(list.body.summary).toMatchObject({ count: 0, average: null });
    await f
      .http()
      .put(`/api/v1/events/${eventId}/review`)
      .set(f.headers())
      .send({ rating: 5, comment: 'Cancelled ticket is not eligible.' })
      .expect(403);
    expect(
      (await f.http().get(`/api/v1/events/${eventId}/review-context`).set(f.headers()).expect(200))
        .body.eligible,
    ).toBe(false);
  });
  it('lets the author remove their review with an audit trail', async () => {
    await f.http().delete(`/api/v1/reviews/${reviewId}`).set(f.headers()).expect(200);
    expect(await f.db.eventReview.count({ where: { id: reviewId } })).toBe(0);
    expect(
      await f.db.auditLog.count({ where: { entityId: reviewId, action: 'REVIEW_DELETED' } }),
    ).toBe(1);
  });
});
