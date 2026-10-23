import 'reflect-metadata';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import type * as Policy from '../src/events/event-policy';
const require = createRequire(import.meta.url);
const { validateDates, assertEditable, validateSections, rowLabel } =
  require('../dist/events/event-policy.js') as typeof Policy;
const now = new Date('2026-01-01T00:00:00Z');
const dates = {
  startsAt: '2026-02-01T00:00:00Z',
  endsAt: '2026-02-02T00:00:00Z',
  salesStartAt: '2026-01-01T00:00:00Z',
  salesEndAt: '2026-01-30T00:00:00Z',
};
describe('Event lifecycle and grid policy', () => {
  it('accepts a future event with an ordered sales window', () =>
    expect(() => validateDates(dates, now)).not.toThrow());
  it.each([
    { startsAt: '2025-01-01T00:00:00Z' },
    { endsAt: dates.startsAt },
    { salesEndAt: dates.salesStartAt },
    { salesEndAt: dates.endsAt },
    { startsAt: 'not-a-date' },
  ])('rejects an invalid event/sales window: %o', (override) =>
    expect(() => validateDates({ ...dates, ...override }, now)).toThrow(),
  );
  it.each(['PENDING_APPROVAL', 'PUBLISHED', 'CANCELLED', 'COMPLETED'])(
    'freezes edits in %s',
    (status) => expect(() => assertEditable(status)).toThrow(),
  );
  it.each(['DRAFT', 'REJECTED'])('permits edit in %s', (status) =>
    expect(() => assertEditable(status)).not.toThrow(),
  );
  it('labels rows beyond Z without duplicate seat codes', () =>
    expect([rowLabel(0), rowLabel(25), rowLabel(26), rowLabel(51), rowLabel(52)]).toEqual([
      'A',
      'Z',
      'AA',
      'AZ',
      'BA',
    ]));
  const section = { name: 'VIP', ticketName: 'VIP', priceVnd: 1200000, rows: 2, columns: 20 };
  it('rejects duplicate trimmed section names', () =>
    expect(() => validateSections([section, { ...section, name: ' vip ' }])).toThrow());
  it('rejects different prices for a shared ticket type', () =>
    expect(() =>
      validateSections([section, { ...section, name: 'VIP 2', priceVnd: 1 }]),
    ).toThrow());
  it('bounds generation to 2000 seats', () =>
    expect(() =>
      validateSections([
        { ...section, rows: 26, columns: 40 },
        { ...section, name: 'Other', rows: 26, columns: 40 },
      ]),
    ).toThrow());
});
