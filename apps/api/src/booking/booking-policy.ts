import { BadRequestException, ConflictException } from '@nestjs/common';
import { DEFAULT_HOLD_SECONDS } from '@tixflow/shared';
export function validateSelection(ids: string[], maximum: number) {
  ids = ids.map((id) => id.toLowerCase());
  if (!ids.length || ids.length > maximum || new Set(ids).size !== ids.length)
    throw new BadRequestException(`Chọn từ 1 đến ${maximum} ghế khác nhau.`);
  return [...ids].sort();
}
export function assertSale(
  event: {
    status: string;
    salesStartAt: Date;
    salesEndAt: Date;
    startsAt: Date;
    organization: { status: string };
    waitingRoomEnabled: boolean;
  },
  now: Date,
) {
  if (
    event.status !== 'PUBLISHED' ||
    event.organization.status !== 'APPROVED' ||
    event.salesStartAt > now ||
    event.salesEndAt <= now ||
    event.startsAt <= now
  )
    throw new ConflictException('Sự kiện chưa mở bán hoặc đã ngừng bán vé.');
  if (event.waitingRoomEnabled)
    throw new ConflictException('Sự kiện đang dùng phòng chờ; admission control chưa khả dụng.');
}
export const holdExpiry = (now: Date, salesEnd: Date) =>
  new Date(Math.min(now.getTime() + DEFAULT_HOLD_SECONDS * 1000, salesEnd.getTime()));
export const holdState = (hold: { expiresAt: Date; releasedAt: Date | null }, now: Date) =>
  hold.expiresAt <= now
    ? ('EXPIRED' as const)
    : hold.releasedAt
      ? ('RELEASED' as const)
      : ('ACTIVE' as const);
