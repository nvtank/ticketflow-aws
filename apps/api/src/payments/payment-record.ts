import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Prisma, Payment } from '../generated/prisma/client';
import type { PaymentView } from '@tixflow/shared';
import {
  databaseNow,
  lockBookingEvent,
  lockCustomer,
  lockHold,
  lockSeats,
} from '../booking/booking-record';
export async function lockPaymentOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  userId?: string,
) {
  const initial = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!initial) throw new NotFoundException('Không tìm thấy đơn hàng.');
  if (userId && initial.userId !== userId)
    throw new ForbiddenException('Bạn không sở hữu đơn hàng này.');
  const event = await lockBookingEvent(tx, initial.eventId);
  await lockCustomer(tx, initial.eventId, initial.userId);
  await lockSeats(
    tx,
    initial.eventId,
    initial.items.map((i) => i.seatId),
  );
  const hold = await lockHold(tx, initial.holdId);
  await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id"=${orderId}::uuid FOR UPDATE`;
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  });
  return { order, hold, event, now: await databaseNow(tx) };
}
export function paymentView(
  payment: Payment & { order: { status: PaymentView['orderStatus'] } },
  now: Date,
): PaymentView {
  return {
    id: payment.id,
    orderId: payment.orderId,
    provider: payment.provider === 'payos' ? 'payos' : 'mock',
    status: payment.status,
    orderStatus:
      payment.order.status === 'PENDING_PAYMENT' && payment.expiresAt && payment.expiresAt <= now
        ? 'EXPIRED'
        : payment.order.status,
    amountVnd: payment.amountVnd,
    checkoutUrl: payment.checkoutUrl,
    expiresAt: (payment.expiresAt ?? now).toISOString(),
    serverTime: now.toISOString(),
  };
}
