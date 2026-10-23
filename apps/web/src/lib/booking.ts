import { z } from 'zod';
export const bookingSeatStatus = z.enum([
  'AVAILABLE',
  'HELD_BY_ME',
  'HELD_BY_OTHERS',
  'SOLD',
  'UNAVAILABLE',
]);
export const holdSchema = z.object({
  id: z.uuid(),
  eventId: z.uuid(),
  seatIds: z.array(z.uuid()),
  state: z.enum(['ACTIVE', 'EXPIRED', 'RELEASED']),
  expiresAt: z.iso.datetime(),
  serverTime: z.iso.datetime(),
  orderId: z.uuid().nullable(),
});
export const bookingSchema = z.object({
  eventId: z.uuid(),
  revision: z.number().int().nonnegative(),
  serverTime: z.iso.datetime(),
  salesStartAt: z.iso.datetime(),
  salesEndAt: z.iso.datetime(),
  maxTicketsPerOrder: z.number().int().positive(),
  activeHold: holdSchema.nullable(),
  seats: z.array(
    z.object({
      id: z.uuid(),
      sectionId: z.uuid(),
      code: z.string(),
      rowLabel: z.string(),
      columnNumber: z.number(),
      status: bookingSeatStatus,
      priceVnd: z.number().int().nonnegative(),
    }),
  ),
});
export const orderSchema = z.object({
  id: z.uuid(),
  eventId: z.uuid(),
  holdId: z.uuid(),
  status: z.enum([
    'PENDING_PAYMENT',
    'PAID',
    'EXPIRED',
    'CANCELLED',
    'PAYMENT_FAILED',
    'REFUND_REQUIRED',
  ]),
  totalVnd: z.number().int().nonnegative(),
  feeVnd: z.number().int().nonnegative(),
  expiresAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  serverTime: z.iso.datetime(),
  event: z.object({
    title: z.string(),
    slug: z.string(),
    startsAt: z.iso.datetime(),
    venueName: z.string(),
  }),
  items: z.array(
    z.object({
      seatId: z.uuid(),
      code: z.string(),
      section: z.string(),
      priceVnd: z.number().int().nonnegative(),
    }),
  ),
});
export const inventoryHintSchema = z.object({
  eventId: z.uuid(),
  seatIds: z.array(z.uuid()),
  revision: z.number().int().nonnegative(),
  occurredAt: z.iso.datetime(),
});
export type BookingData = z.infer<typeof bookingSchema>;
export function newerBookingSnapshot(old: unknown, next: unknown) {
  const a = bookingSchema.safeParse(old),
    b = bookingSchema.safeParse(next);
  if (
    a.success &&
    b.success &&
    (a.data.revision > b.data.revision ||
      (a.data.revision === b.data.revision && a.data.serverTime > b.data.serverTime))
  )
    return old;
  return next;
}
export const orderStatusLabel = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  EXPIRED: 'Hết hạn',
  CANCELLED: 'Đã hủy',
  PAYMENT_FAILED: 'Thanh toán thất bại',
  REFUND_REQUIRED: 'Cần hoàn tiền',
};
