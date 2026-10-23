import { describe, it, expect } from 'vitest';
import { admissionOutcome } from '../src/check-in/check-in.policy';
import { reportRange, reportNumber } from '../src/analytics/reporting-policy';
describe('Admission and reporting policies', () => {
  it.each([
    ['VALID', 'VALID'],
    ['USED', 'ALREADY_USED'],
    ['CANCELLED', 'CANCELLED'],
  ])('maps %s to %s', (status, outcome) =>
    expect(admissionOutcome({ eventId: 'one', status }, 'one', true)).toBe(outcome),
  );
  it('rejects wrong event, unknown ticket and closed event', () => {
    expect(admissionOutcome({ eventId: 'other', status: 'VALID' }, 'one', true)).toBe(
      'WRONG_EVENT',
    );
    expect(admissionOutcome(null, 'one', true)).toBe('INVALID');
    expect(admissionOutcome(null, 'one', false)).toBe('EVENT_UNAVAILABLE');
  });
  it('uses inclusive Vietnam dates and a half-open UTC range', () => {
    const r = reportRange('2026-10-01', '2026-10-01', new Date());
    expect(r.start.toISOString()).toBe('2026-09-30T17:00:00.000Z');
    expect(r.end.toISOString()).toBe('2026-10-01T17:00:00.000Z');
  });
  it.each([
    ['2026-02-30', '2026-03-01'],
    ['2026-10-20', '2026-10-01'],
    ['2024-01-01', '2026-01-01'],
  ])('rejects invalid or excessive date range %s %s', (a, b) =>
    expect(() => reportRange(a, b, new Date())).toThrow(),
  );
  it('refuses aggregate money outside exact JS integer range', () => {
    expect(reportNumber(1200000n)).toBe(1200000);
    expect(() => reportNumber(9007199254740992n)).toThrow();
  });
});
