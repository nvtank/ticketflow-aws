import { randomUUID } from 'node:crypto';
import { io, type Socket } from 'socket.io-client';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import type { EventRoomAck, InventoryUpdate } from '@tixflow/shared';
import { bookingFixture } from './booking-fixture';
const sockets: Socket[] = [];
function connect(url: string, token: string, origin = 'http://localhost:3000') {
  const socket = io(url, {
    transports: ['websocket'],
    auth: { token },
    extraHeaders: { Origin: origin },
    forceNew: true,
    reconnection: false,
  });
  sockets.push(socket);
  return new Promise<Socket>((resolve, reject) => {
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}
function join(socket: Socket, eventId: string) {
  return new Promise<EventRoomAck>((resolve, reject) =>
    socket
      .timeout(4000)
      .emit('event:join', { eventId }, (error: Error | null, result: EventRoomAck) =>
        error ? reject(error) : resolve(result),
      ),
  );
}
function next(socket: Socket, name: string) {
  return new Promise<InventoryUpdate>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('No committed realtime event received.')),
      4000,
    );
    socket.once(name, (data: InventoryUpdate) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}
describe('Socket.IO rooms and real Redis adapter', () => {
  let f: Awaited<ReturnType<typeof bookingFixture>>,
    g: Awaited<ReturnType<typeof bookingFixture>>,
    url: string;
  beforeAll(async () => {
    f = await bookingFixture(3);
    g = await bookingFixture(1);
    url = await g.app.getUrl();
  });
  afterAll(async () => {
    for (const socket of sockets) {
      socket.removeAllListeners();
      socket.disconnect();
    }
    await g?.close();
    await f?.close();
  });
  it('rejects invalid JWTs and unapproved browser origins', async () => {
    await expect(connect(url, 'invalid-token')).rejects.toBeDefined();
    await expect(connect(url, f.tokens[0]!, 'https://evil.example')).rejects.toBeDefined();
  });
  it('rejects unpublished events and arbitrary private room names', async () => {
    const event = await f.event();
    await f.db.event.update({ where: { id: event.id }, data: { status: 'DRAFT' } });
    const a = await connect(url, f.tokens[0]!);
    expect((await join(a, event.id)).ok).toBe(false);
    const b = await connect(url, f.tokens[1]!);
    expect((await join(b, `user:${f.ids[0]}`)).ok).toBe(false);
  });
  it('delivers only committed changes across two API instances using Redis', async () => {
    const e = await f.event(3),
      viewer = await connect(url, f.tokens[0]!),
      outsider = await connect(url, f.tokens[1]!);
    expect((await join(viewer, e.id)).ok).toBe(true);
    let unrelated = 0;
    outsider.on('seat:held', () => unrelated++);
    const emitted = next(viewer, 'seat:held');
    const held = await f.hold(e.id, [e.seats[0]!.id], 0).expect(201);
    const payload = await emitted;
    expect(payload.eventId).toBe(e.id);
    expect(payload.seatIds).toEqual([e.seats[0]!.id]);
    expect(payload.revision).toBe(1);
    expect(JSON.stringify(payload)).not.toContain(held.body.id);
    expect(JSON.stringify(payload)).not.toContain(f.ids[0]);
    expect((await f.db.seat.findUniqueOrThrow({ where: { id: e.seats[0]!.id } })).holdId).toBe(
      held.body.id,
    );
    let rolledBack = 0;
    viewer.on('seat:held', () => rolledBack++);
    await f.hold(e.id, [e.seats[1]!.id, e.seats[0]!.id], 1).expect(409);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(rolledBack).toBe(0);
    expect(unrelated).toBe(0);
    const released = next(viewer, 'seat:released');
    await f.http().delete(`/api/v1/holds/${held.body.id}`).set(f.headers()).expect(200);
    expect((await released).revision).toBe(2);
  });
  it('resynchronizes a snapshot after a disconnected client misses changes', async () => {
    const e = await f.event(1),
      a = await connect(url, f.tokens[0]!);
    await join(a, e.id);
    a.disconnect();
    await f.hold(e.id, [e.seats[0]!.id], 1).expect(201);
    const b = await connect(url, f.tokens[0]!);
    const ack = await join(b, e.id);
    expect(ack.revision).toBe(1);
    const state = await g
      .http()
      .get(`/api/v1/events/${e.id}/booking-state`)
      .set(f.headers())
      .expect(200);
    expect(state.body.seats[0].status).toBe('HELD_BY_OTHERS');
  });
  it('keeps order updates in the owners user room and exposes measured counters', async () => {
    const e = await f.event(1),
      owner = await connect(url, f.tokens[0]!),
      other = await connect(url, f.tokens[1]!);
    let leaked = 0;
    other.on('order:updated', () => leaked++);
    const held = await f.hold(e.id, [e.seats[0]!.id]).expect(201);
    const pending = new Promise<{ orderId: string }>((resolve) =>
      owner.once('order:updated', resolve),
    );
    const result = await f
      .http()
      .post('/api/v1/orders')
      .set(f.headers())
      .send({ holdId: held.body.id, idempotencyKey: randomUUID() })
      .expect(201);
    expect((await pending).orderId).toBe(result.body.id);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(leaked).toBe(0);
    const metrics = await g.http().get('/api/v1/metrics').expect(200);
    expect(metrics.body.socketConnections).toBeGreaterThan(0);
    expect(metrics.body.redisAdapterEnabled).toBe(true);
    expect(metrics.body.validHeldSeats).toBeGreaterThan(0);
  });
});
