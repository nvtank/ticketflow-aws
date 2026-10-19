import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
export function admissionCredential(sessionId: string, nonce: string, key: string) {
  return `wa1.${sessionId}.${nonce}.${createHmac('sha256', key).update(`tixflow-admission:${sessionId}:${nonce}`).digest('base64url')}`;
}
export function parseAdmissionCredential(raw: string, key: string) {
  const parts = raw.split('.');
  if (
    parts.length !== 4 ||
    parts[0] !== 'wa1' ||
    !z.uuid().safeParse(parts[1]).success ||
    !/^[a-f0-9]{32}$/.test(parts[2]!) ||
    !/^[A-Za-z0-9_-]{43}$/.test(parts[3]!)
  )
    return null;
  const expected = Buffer.from(admissionCredential(parts[1]!, parts[2]!, key)),
    actual = Buffer.from(raw);
  return expected.length === actual.length && timingSafeEqual(expected, actual)
    ? { sessionId: parts[1]!, nonce: parts[2]! }
    : null;
}
