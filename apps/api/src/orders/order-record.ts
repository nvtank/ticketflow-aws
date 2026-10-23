import type { OrderView } from '@tixflow/shared';
import type { Prisma } from '../generated/prisma/client';
export const orderInclude = {
  event: { include: { venue: true } },
  items: { include: { seat: { include: { section: true } } }, orderBy: { seatId: 'asc' } },
} satisfies Prisma.OrderInclude;
export type OrderRecord = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
export const toOrderView = (order: OrderRecord, now: Date): OrderView => ({
  id: order.id,
  eventId: order.eventId,
  holdId: order.holdId,
  status: order.status === 'PENDING_PAYMENT' && order.expiresAt <= now ? 'EXPIRED' : order.status,
  totalVnd: order.totalVnd,
  feeVnd: 0,
  expiresAt: order.expiresAt.toISOString(),
  createdAt: order.createdAt.toISOString(),
  serverTime: now.toISOString(),
  event: {
    title: order.event.title,
    slug: order.event.slug,
    startsAt: order.event.startsAt.toISOString(),
    venueName: order.event.venue.name,
  },
  items: order.items.map((i) => ({
    seatId: i.seatId,
    code: i.seat.code,
    section: i.seat.section.name,
    priceVnd: i.priceVnd,
  })),
});
