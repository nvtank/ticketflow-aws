import { NotFoundException } from '@nestjs/common';
import type { Prisma, SeatHold } from '../generated/prisma/client';
export async function databaseNow(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  return rows[0]!.now;
}
export async function lockBookingEvent(tx: Prisma.TransactionClient, id: string) {
  const rows = await tx.$queryRaw<
    { id: string }[]
  >`SELECT "id" FROM "Event" WHERE "id"=${id}::uuid FOR KEY SHARE`;
  if (!rows.length) throw new NotFoundException('Không tìm thấy sự kiện.');
  return tx.event.findUniqueOrThrow({
    where: { id },
    include: { organization: { select: { status: true } } },
  });
}
export async function lockCustomer(tx: Prisma.TransactionClient, eventId: string, userId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${eventId.toLowerCase() + ':' + userId.toLowerCase()}, 0))::text`;
}
export async function lockSeats(tx: Prisma.TransactionClient, eventId: string, ids: string[]) {
  // One row at a time in stable UUID order also handles overlapping groups consistently.
  for (const id of [...ids].sort())
    await tx.$queryRaw`SELECT "id" FROM "Seat" WHERE "eventId"=${eventId}::uuid AND "id"=${id}::uuid FOR UPDATE`;
}
export async function lockHold(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT "id" FROM "SeatHold" WHERE "id"=${id}::uuid FOR UPDATE`;
  return tx.seatHold.findUniqueOrThrow({
    where: { id },
    include: { order: { select: { id: true } } },
  });
}
export const toHoldView = (hold: SeatHold & { order?: { id: string } | null }, now: Date) => ({
  id: hold.id,
  eventId: hold.eventId,
  seatIds: hold.requestedSeatIds,
  expiresAt: hold.expiresAt.toISOString(),
  serverTime: now.toISOString(),
  state:
    hold.expiresAt <= now
      ? ('EXPIRED' as const)
      : hold.releasedAt
        ? ('RELEASED' as const)
        : ('ACTIVE' as const),
  orderId: hold.order?.id ?? null,
});
