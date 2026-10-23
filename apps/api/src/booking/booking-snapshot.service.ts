import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { BookingSnapshot, BookingSeatStatus } from '@tixflow/shared';
import { DatabaseService } from '../database/database.service';
import { databaseNow, toHoldView } from './booking-record';
@Injectable()
export class BookingSnapshotService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  async get(eventId: string, userId: string): Promise<BookingSnapshot> {
    return this.db.$transaction(
      async (tx) => {
        const event = await tx.event.findFirst({
          where: { id: eventId, status: 'PUBLISHED', organization: { status: 'APPROVED' } },
        });
        if (!event) throw new NotFoundException('Sự kiện chưa công bố hoặc không tồn tại.');
        const now = await databaseNow(tx);
        const seats = await tx.seat.findMany({
          where: { eventId },
          orderBy: [{ rowLabel: 'asc' }, { columnNumber: 'asc' }],
          include: {
            hold: { select: { userId: true, expiresAt: true, releasedAt: true } },
            section: { include: { ticketType: true } },
          },
        });
        const own = await tx.seatHold.findFirst({
          where: {
            eventId,
            userId,
            releasedAt: null,
            expiresAt: { gt: now },
            seats: { some: { status: 'HELD' } },
          },
          include: { order: { select: { id: true } } },
          orderBy: { createdAt: 'desc' },
        });
        return {
          eventId,
          revision: event.inventoryRevision,
          serverTime: now.toISOString(),
          salesStartAt: event.salesStartAt.toISOString(),
          salesEndAt: event.salesEndAt.toISOString(),
          maxTicketsPerOrder: event.maxTicketsPerOrder,
          activeHold: own ? toHoldView(own, now) : null,
          seats: seats.map((s) => {
            let status: BookingSeatStatus = s.status === 'HELD' ? 'HELD_BY_OTHERS' : s.status;
            if (s.status === 'HELD' && s.hold) {
              status =
                s.hold.expiresAt <= now || s.hold.releasedAt
                  ? 'AVAILABLE'
                  : s.hold.userId === userId
                    ? 'HELD_BY_ME'
                    : 'HELD_BY_OTHERS';
            }
            return {
              id: s.id,
              sectionId: s.sectionId,
              code: s.code,
              rowLabel: s.rowLabel,
              columnNumber: s.columnNumber,
              status,
              priceVnd: s.section.ticketType.priceVnd,
            };
          }),
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
}
