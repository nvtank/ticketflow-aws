import 'reflect-metadata';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { bookingFixture } from './booking-fixture';
import type * as Room from '../src/waiting-room/waiting-room.service';
const require = createRequire(import.meta.url);
const { WaitingRoomService } =
  require('../dist/waiting-room/waiting-room.service.js') as typeof Room;
describe('Real Redis admission and PostgreSQL gate', () => {
  let f: Awaited<ReturnType<typeof bookingFixture>>, room: Room.WaitingRoomService;
  const events: string[] = [];
  beforeAll(async () => {
    f = await bookingFixture(101);
    room = f.app.get(WaitingRoomService);
  });
  afterAll(async () => {
    for (const id of events) await room.redis.del(...room.keys(id));
    await f?.close();
  });
  async function event(capacity = 1) {
    const e = await f.event();
    events.push(e.id);
    await f.db.event.update({
      where: { id: e.id },
      data: { waitingRoomEnabled: true, waitingRoomCapacity: capacity },
    });
    return e;
  }
  const join = (id: string, user = 0) =>
    f.http().post(`/api/v1/events/${id}/waiting-room/join`).set(f.headers(user));
  const status = (id: string, user = 0) =>
    f.http().get(`/api/v1/events/${id}/waiting-room`).set(f.headers(user));
  const leave = (id: string, user = 0) =>
    f.http().delete(`/api/v1/events/${id}/waiting-room`).set(f.headers(user));
  const hold = (id: string, seatId: string, token: string, user = 0) =>
    f
      .http()
      .post(`/api/v1/events/${id}/holds`)
      .set(f.headers(user))
      .send({ seatIds: [seatId], idempotencyKey: randomUUID(), admissionToken: token });
  it('100 simultaneous users receive exactly five leases; refresh preserves position and lease', async () => {
    const e = await event(5);
    const replies = await Promise.all(Array.from({ length: 100 }, (_, i) => join(e.id, i)));
    expect(replies.map((r) => r.status).filter((s) => s !== 201)).toEqual([]);
    expect(replies.filter((r) => r.body.state === 'ADMITTED')).toHaveLength(5);
    expect(replies.filter((r) => r.body.state === 'WAITING')).toHaveLength(95);
    expect(await room.redis.zcard(room.keys(e.id)[1]!)).toBe(5);
    for (const i of [0, 99]) {
      const refreshed = await join(e.id, i).expect(201);
      expect(refreshed.body.state).toBe(replies[i]!.body.state);
      expect(refreshed.body.position).toBe(replies[i]!.body.position);
      expect(refreshed.body.expiresAt).toBe(replies[i]!.body.expiresAt);
      expect(refreshed.body.admissionToken).toBe(replies[i]!.body.admissionToken);
    }
    expect(await f.db.waitingRoomSession.count({ where: { eventId: e.id } })).toBe(100);
  }, 60000);
  it('releasing a lease promotes FIFO and admits no extra session', async () => {
    const e = await event();
    await join(e.id, 0).expect(201);
    await join(e.id, 1).expect(201);
    await join(e.id, 2).expect(201);
    const before = await status(e.id, 1).expect(200);
    expect(before.body.position).toBe(1);
    await leave(e.id, 0).expect(200);
    expect((await status(e.id, 1)).body.state).toBe('ADMITTED');
    expect((await status(e.id, 2)).body.position).toBe(1);
    expect(await room.redis.zcard(room.keys(e.id)[1]!)).toBe(1);
  });
  it('rejects absent, forged, stolen and expired admission before hold creation', async () => {
    const e = await event(),
      a = await join(e.id).expect(201),
      token = a.body.admissionToken as string;
    await f.hold(e.id, [e.seats[0]!.id]).expect(403);
    await hold(e.id, e.seats[0]!.id, token, 1).expect(403);
    await hold(e.id, e.seats[0]!.id, token + 'x').expect(403);
    const meta = JSON.parse((await room.redis.hget(room.keys(e.id)[3]!, f.ids[0]!))!) as {
      expiresAt: number;
    };
    meta.expiresAt = Date.now() - 1;
    await room.redis.hset(room.keys(e.id)[3]!, f.ids[0]!, JSON.stringify(meta));
    await hold(e.id, e.seats[0]!.id, token).expect(409);
    expect(await f.db.seatHold.count({ where: { eventId: e.id } })).toBe(0);
  });
  it('expired active lease promotes next user and a rejoin cannot reuse the old token', async () => {
    const e = await event(),
      a = await join(e.id);
    await join(e.id, 1);
    const keys = room.keys(e.id),
      past = Date.now() - 1;
    const meta = JSON.parse((await room.redis.hget(keys[3]!, f.ids[0]!))!) as { expiresAt: number };
    meta.expiresAt = past;
    await room.redis.hset(keys[3]!, f.ids[0]!, JSON.stringify(meta));
    await room.redis.zadd(keys[1]!, past, f.ids[0]!);
    await room.redis.zadd(keys[4]!, past, f.ids[0]!);
    expect((await status(e.id, 1)).body.state).toBe('ADMITTED');
    await leave(e.id, 1);
    const fresh = await join(e.id);
    expect(fresh.body.admissionToken).not.toBe(a.body.admissionToken);
    await hold(e.id, e.seats[0]!.id, a.body.admissionToken).expect(409);
  });
  it('lease permits a real hold and its order survives admission expiry', async () => {
    const e = await event(),
      a = await join(e.id),
      h = await hold(e.id, e.seats[0]!.id, a.body.admissionToken).expect(201);
    await leave(e.id);
    await f
      .http()
      .post('/api/v1/orders')
      .set(f.headers())
      .send({ holdId: h.body.id, idempotencyKey: randomUUID() })
      .expect(201);
  });
  it('disabled gate permits normal reservation; invalid configuration and other organizations are rejected', async () => {
    const e = await f.event();
    expect((await status(e.id)).body.state).toBe('DISABLED');
    await f.hold(e.id, [e.seats[0]!.id]).expect(201);
    const path = `/api/v1/events/${e.id}/waiting-room/settings`;
    await f.http().patch(path).set(f.headers()).send({ enabled: true, capacity: 1 }).expect(403);
    await f.http().patch(path).set(f.headers(101)).send({ enabled: true, capacity: 1 }).expect(403);
    await f.db.organizationMember.create({
      data: { organizationId: e.organizationId, userId: f.ids[101]! },
    });
    await f.http().patch(path).set(f.headers(101)).send({ enabled: true, capacity: 0 }).expect(400);
    await f.http().patch(path).set(f.headers(101)).send({ enabled: true, capacity: 2 }).expect(200);
    expect(
      await f.db.auditLog.count({ where: { entityId: e.id, action: 'WAITING_ROOM_CONFIGURED' } }),
    ).toBe(1);
  });
  it('only the owner can read a notification and marking read is idempotent', async () => {
    const n = await f.db.notification.create({
      data: { userId: f.ids[0]!, title: 'Receipt', message: 'Real persisted receipt' },
    });
    await f.http().patch(`/api/v1/notifications/${n.id}/read`).set(f.headers(1)).expect(404);
    const inbox = await f.http().get('/api/v1/notifications/me').set(f.headers()).expect(200);
    expect(inbox.body.unread).toBe(1);
    await f.http().patch(`/api/v1/notifications/${n.id}/read`).set(f.headers()).expect(200);
    const stamp = (await f.db.notification.findUniqueOrThrow({ where: { id: n.id } })).readAt;
    await f.http().patch(`/api/v1/notifications/${n.id}/read`).set(f.headers()).expect(200);
    expect((await f.db.notification.findUniqueOrThrow({ where: { id: n.id } })).readAt).toEqual(
      stamp,
    );
  });
});
