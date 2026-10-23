import 'reflect-metadata';
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';
import type * as Policy from '../src/booking/booking-policy';
const require = createRequire(import.meta.url);
const { validateSelection, assertSale, holdExpiry, holdState } =
  require('../dist/booking/booking-policy.js') as typeof Policy;
const now = new Date('2026-10-04T02:00:00Z');
const event = {
  status: 'PUBLISHED',
  salesStartAt: new Date(now.getTime() - 1000),
  salesEndAt: new Date(now.getTime() + 600000),
  startsAt: new Date(now.getTime() + 700000),
  organization: { status: 'APPROVED' },
  waitingRoomEnabled: false,
};
describe('Reservation policy', () => {
  it('normalizes and orders seat IDs before locking', () =>
    expect(validateSelection(['B', 'a'], 4)).toEqual(['a', 'b']));
  it.each([[], ['a', 'a'], ['A', 'a'], ['a', 'b', 'c', 'd', 'e']].map((ids) => ({ ids })))(
    'rejects empty, duplicate or excessive groups: %j',
    ({ ids }) => expect(() => validateSelection(ids, 4)).toThrow(),
  );
  it('permits an open sale', () => expect(() => assertSale(event, now)).not.toThrow());
  it.each([
    { status: 'DRAFT' },
    { salesStartAt: new Date(now.getTime() + 1) },
    { salesEndAt: now },
    { startsAt: now },
    { organization: { status: 'REJECTED' } },
    { waitingRoomEnabled: true },
  ])('rejects an ineligible sale: %j', (overrides) =>
    expect(() => assertSale({ ...event, ...overrides }, now)).toThrow(),
  );
  it('uses the original five minute TTL', () =>
    expect(holdExpiry(now, event.salesEndAt).getTime() - now.getTime()).toBe(300000));
  it('caps expiry at the end of sales', () =>
    expect(holdExpiry(now, new Date(now.getTime() + 1000)).getTime() - now.getTime()).toBe(1000));
  it('treats exact expiry as expired', () =>
    expect(holdState({ expiresAt: now, releasedAt: null }, now)).toBe('EXPIRED'));
  it('distinguishes voluntary release from an active hold', () => {
    expect(holdState({ expiresAt: event.salesEndAt, releasedAt: now }, now)).toBe('RELEASED');
    expect(holdState({ expiresAt: event.salesEndAt, releasedAt: null }, now)).toBe('ACTIVE');
  });
});
