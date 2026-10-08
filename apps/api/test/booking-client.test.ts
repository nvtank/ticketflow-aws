import { describe, it, expect } from 'vitest';
import { newerBookingSnapshot } from '../../web/src/lib/booking';
const snapshot = {
  eventId: '00000000-0000-4000-8000-000000000001',
  revision: 5,
  serverTime: '2026-10-04T02:00:00.000Z',
  salesStartAt: '2026-10-03T02:00:00.000Z',
  salesEndAt: '2026-10-05T02:00:00.000Z',
  maxTicketsPerOrder: 4,
  activeHold: null,
  seats: [],
};
describe('Client snapshot reconciliation', () => {
  it('rejects a stale revision even when its response arrives later', () =>
    expect(
      newerBookingSnapshot(snapshot, {
        ...snapshot,
        revision: 4,
        serverTime: '2026-10-04T02:01:00.000Z',
      }),
    ).toBe(snapshot));
  it('uses the newest server time for effective expiry at an unchanged revision', () => {
    expect(
      newerBookingSnapshot(snapshot, { ...snapshot, serverTime: '2026-10-04T01:59:00.000Z' }),
    ).toBe(snapshot);
    const next = { ...snapshot, serverTime: '2026-10-04T02:01:00.000Z' };
    expect(newerBookingSnapshot(snapshot, next)).toBe(next);
  });
});
