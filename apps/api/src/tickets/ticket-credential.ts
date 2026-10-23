import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { Environment } from '../config/environment';
export function ticketKey(env: Environment) {
  return (
    env.TICKET_SIGNING_KEY ??
    createHmac('sha256', env.JWT_SECRET).update('tixflow-ticket-key-v1').digest('hex')
  );
}
export function ticketCredential(id: string, key: string) {
  return `tf1.${id}.${createHmac('sha256', key)
    .update('tixflow:ticket:v1:' + id)
    .digest('base64url')}`;
}
export const credentialHash = (credential: string) =>
  createHash('sha256').update(credential).digest('hex');
export function verifyTicketCredential(value: string, key: string): string | null {
  const parts = value.split('.');
  if (
    parts.length !== 3 ||
    parts[0] !== 'tf1' ||
    !z.uuid().safeParse(parts[1]).success ||
    !/^[A-Za-z0-9_-]{43}$/.test(parts[2]!)
  )
    return null;
  const expected = Buffer.from(ticketCredential(parts[1]!, key));
  const actual = Buffer.from(value);
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? parts[1]! : null;
}
