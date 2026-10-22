import 'reflect-metadata';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { it, expect, describe } from 'vitest';
import type * as Credential from '../src/waiting-room/waiting-credential';
import type * as Policy from '../src/booking/booking-policy';
import type * as Env from '../src/config/environment';
const require = createRequire(import.meta.url);
const { admissionCredential, parseAdmissionCredential } =
  require('../dist/waiting-room/waiting-credential.js') as typeof Credential;
const { assertSale } = require('../dist/booking/booking-policy.js') as typeof Policy;
const { parseEnvironment } = require('../dist/config/environment.js') as typeof Env;
describe('Admission credential boundaries', () => {
  const key = 'a'.repeat(64),
    sid = randomUUID(),
    nonce = 'b'.repeat(32);
  it('validates the exact signed session and nonce', () =>
    expect(parseAdmissionCredential(admissionCredential(sid, nonce, key), key)).toEqual({
      sessionId: sid,
      nonce,
    }));
  it('rejects token modification, wrong key and replay into another session', () => {
    const t = admissionCredential(sid, nonce, key);
    expect(parseAdmissionCredential(t.replace(sid, randomUUID()), key)).toBeNull();
    expect(parseAdmissionCredential(t.replace(nonce, 'c'.repeat(32)), key)).toBeNull();
    expect(parseAdmissionCredential(t, 'wrong-key')).toBeNull();
  });
  it.each(['', 'wa1.x.y.z', 'tf1.invalid', 'wa1.' + 'x'.repeat(512)])(
    'rejects malformed credential %s',
    (raw) => expect(parseAdmissionCredential(raw, key)).toBeNull(),
  );
  it('still refuses a closed sale even with admission', () => {
    const now = new Date(),
      e = {
        status: 'DRAFT',
        organization: { status: 'APPROVED' },
        salesStartAt: new Date(0),
        salesEndAt: new Date(Date.now() + 60000),
        startsAt: new Date(Date.now() + 120000),
        waitingRoomEnabled: true,
      };
    expect(() => assertSale(e, now, true)).toThrow();
    expect(() => assertSale({ ...e, status: 'PUBLISHED' }, now, true)).not.toThrow();
    expect(() => assertSale({ ...e, status: 'PUBLISHED' }, now)).toThrow();
  });
  it.each(['0', '1801'])('rejects unsafe admission duration %s', (value) =>
    expect(() =>
      parseEnvironment({ ...process.env, WAITING_ROOM_ADMISSION_SECONDS: value }),
    ).toThrow(),
  );
});
