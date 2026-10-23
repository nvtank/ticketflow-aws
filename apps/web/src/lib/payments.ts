import { z } from 'zod';
import { orderSchema } from './booking';
export const paymentConfigSchema = z.object({
  provider: z.enum(['disabled', 'payos', 'mock']),
  available: z.boolean(),
});
export const paymentSchema = z.object({
  id: z.uuid(),
  orderId: z.uuid(),
  provider: z.enum(['payos', 'mock']),
  status: z.enum(['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUND_REQUIRED']),
  orderStatus: orderSchema.shape.status,
  amountVnd: z.number().int().nonnegative(),
  checkoutUrl: z.url().nullable(),
  expiresAt: z.iso.datetime(),
  serverTime: z.iso.datetime(),
});
export const ticketSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  status: z.enum(['VALID', 'USED', 'CANCELLED']),
  eventId: z.uuid(),
  orderId: z.uuid(),
  seatCode: z.string(),
  section: z.string(),
  priceVnd: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  event: z.object({
    title: z.string(),
    slug: z.string(),
    startsAt: z.iso.datetime(),
    venueName: z.string(),
    address: z.string(),
  }),
  qrCredential: z.string().nullable(),
});
export const ticketStatusLabel = { VALID: 'Vé hợp lệ', USED: 'Đã sử dụng', CANCELLED: 'Đã hủy' };
export function verifiedCheckoutUrl(value: string, provider: 'payos' | 'mock') {
  const url = new URL(value);
  if (
    provider === 'payos' &&
    url.protocol === 'https:' &&
    url.hostname === 'pay.payos.vn' &&
    !url.username &&
    !url.password
  )
    return url.href;
  if (
    provider === 'mock' &&
    url.origin === window.location.origin &&
    url.pathname.startsWith('/dev-payments/')
  )
    return url.href;
  throw new Error('Liên kết thanh toán không hợp lệ.');
}
