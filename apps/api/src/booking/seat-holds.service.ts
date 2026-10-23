import { WaitingRoomService } from '../waiting-room/waiting-room.service';
import { Prisma } from '../generated/prisma/client';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { InventoryUpdate } from '@tixflow/shared';
import { DatabaseService } from '../database/database.service';
import type { CreateHoldDto } from './booking.dto';
import { assertSale, holdExpiry, validateSelection } from './booking-policy';
import {
  databaseNow,
  lockBookingEvent,
  lockCustomer,
  lockSeats,
  toHoldView,
} from './booking-record';
import { InventoryPublisher } from './inventory-publisher';
import { BookingMetrics } from './booking-metrics';
@Injectable()
export class SeatHoldsService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(InventoryPublisher) private readonly publisher: InventoryPublisher,
    @Inject(BookingMetrics) private readonly metrics: BookingMetrics,
    @Inject(WaitingRoomService) private readonly waiting: WaitingRoomService,
  ) {}
  async create(eventId: string, userId: string, input: CreateHoldDto) {
    eventId = eventId.toLowerCase();
    input = { ...input, idempotencyKey: input.idempotencyKey.toLowerCase() };
    try {
      const admissionExpiresAt = await this.waiting.authorize(
        eventId,
        userId,
        input.admissionToken,
      );
      const result = await this.db.$transaction(
        async (tx) => {
          const event = await lockBookingEvent(tx, eventId);
          await lockCustomer(tx, eventId, userId);
          const ids = validateSelection(input.seatIds, event.maxTicketsPerOrder);
          const existing = await tx.seatHold.findUnique({
            where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } },
            include: { order: { select: { id: true } } },
          });
          if (existing) {
            if (
              existing.eventId !== eventId ||
              JSON.stringify(existing.requestedSeatIds) !== JSON.stringify(ids)
            )
              throw new ConflictException('Mã thử lại đã được dùng cho nhóm ghế khác.');
            return { hold: toHoldView(existing, await databaseNow(tx)), change: null };
          }
          await lockSeats(tx, eventId, ids);
          const now = await databaseNow(tx);
          assertSale(event, now, !!admissionExpiresAt && admissionExpiresAt > now);
          const active = await tx.seatHold.count({
            where: {
              eventId,
              userId,
              releasedAt: null,
              expiresAt: { gt: now },
              seats: { some: { status: 'HELD' } },
            },
          });
          if (active)
            throw new ConflictException(
              'Bạn đang có một lượt giữ ghế. Hãy tiếp tục hoặc hủy lượt đó.',
            );
          const hold = await tx.seatHold.create({
            data: {
              eventId,
              userId,
              requestedSeatIds: ids,
              idempotencyKey: input.idempotencyKey,
              expiresAt: holdExpiry(now, event.salesEndAt),
            },
          });
          const changed = await tx.seat.updateMany({
            where: {
              eventId,
              id: { in: ids },
              OR: [
                { status: 'AVAILABLE' },
                {
                  status: 'HELD',
                  hold: {
                    is: { OR: [{ expiresAt: { lte: now } }, { releasedAt: { not: null } }] },
                  },
                },
              ],
            },
            data: { status: 'HELD', holdId: hold.id },
          });
          if (changed.count !== ids.length)
            throw new ConflictException('Một hoặc nhiều ghế vừa được giữ/mua. Hãy chọn lại.');
          const updated = await tx.event.update({
            where: { id: eventId },
            data: { inventoryRevision: { increment: 1 } },
            select: { inventoryRevision: true },
          });
          await tx.auditLog.create({
            data: {
              actorId: userId,
              action: 'SEATS_HELD',
              entityType: 'SeatHold',
              entityId: hold.id,
              metadata: { eventId, seatIds: ids },
            },
          });
          const change: InventoryUpdate = {
            eventId,
            seatIds: ids,
            revision: updated.inventoryRevision,
            occurredAt: now.toISOString(),
          };
          return { hold: toHoldView(hold, now), change };
        },
        { maxWait: 15000, timeout: 15000 },
      );
      if (result.change) {
        this.metrics.record(true);
        this.publisher.publish('seat:held', result.change);
      }
      return result.hold;
    } catch (error) {
      this.metrics.record(false);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Mã thử lại đã được dùng cho lượt giữ ghế khác.');
      throw error;
    }
  }
  async get(id: string, userId: string) {
    return this.db.$transaction(async (tx) => {
      const hold = await tx.seatHold.findUnique({
        where: { id },
        include: { order: { select: { id: true } } },
      });
      if (!hold) throw new NotFoundException('Không tìm thấy lượt giữ ghế.');
      if (hold.userId !== userId)
        throw new ForbiddenException('Bạn không sở hữu lượt giữ ghế này.');
      return toHoldView(hold, await databaseNow(tx));
    });
  }
}
