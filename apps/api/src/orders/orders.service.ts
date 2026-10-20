import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import type { CreateOrderDto } from '../booking/booking.dto';
import {
  databaseNow,
  lockBookingEvent,
  lockCustomer,
  lockHold,
  lockSeats,
} from '../booking/booking-record';
import { assertSale } from '../booking/booking-policy';
import { HoldLifecycleService } from '../booking/hold-lifecycle.service';
import { InventoryPublisher } from '../booking/inventory-publisher';
import { orderInclude, toOrderView } from './order-record';
import { pagination } from '../events/event-record';
import type { PageDto } from '../events/events.dto';
@Injectable()
export class OrdersService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(HoldLifecycleService) private readonly lifecycle: HoldLifecycleService,
    @Inject(InventoryPublisher) private readonly publisher: InventoryPublisher,
  ) {}
  async create(userId: string, input: CreateOrderDto) {
    input = { ...input, idempotencyKey: input.idempotencyKey.toLowerCase() };
    const initial = await this.db.seatHold.findUnique({ where: { id: input.holdId } });
    if (!initial) throw new NotFoundException('Không tìm thấy lượt giữ ghế.');
    if (initial.userId !== userId)
      throw new ForbiddenException('Bạn không sở hữu lượt giữ ghế này.');
    try {
      const result = await this.db.$transaction(
        async (tx) => {
          const event = await lockBookingEvent(tx, initial.eventId);
          await lockCustomer(tx, event.id, userId);
          await lockSeats(tx, event.id, initial.requestedSeatIds);
          const hold = await lockHold(tx, initial.id),
            now = await databaseNow(tx);
          const existing = await tx.order.findUnique({
            where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } },
            include: orderInclude,
          });
          if (existing) {
            if (existing.holdId !== hold.id)
              throw new ConflictException('Mã thử lại đã dùng cho lượt giữ ghế khác.');
            return { view: toOrderView(existing, now), created: false };
          }
          assertSale(event, now, true);
          if (hold.userId !== userId || hold.releasedAt || hold.expiresAt <= now)
            throw new ConflictException('Lượt giữ ghế đã hết hạn hoặc đã hủy.');
          if (hold.order)
            throw new ConflictException('Lượt giữ ghế đã có đơn hàng. Hãy mở đơn hiện tại.');
          const seats = await tx.seat.findMany({
            where: {
              id: { in: hold.requestedSeatIds },
              eventId: event.id,
              status: 'HELD',
              holdId: hold.id,
            },
            include: { section: { include: { ticketType: true } } },
          });
          if (!seats.length || seats.length !== hold.requestedSeatIds.length)
            throw new ConflictException('Ghế không còn thuộc lượt giữ này.');
          const order = await tx.order.create({
            data: {
              userId,
              eventId: event.id,
              holdId: hold.id,
              idempotencyKey: input.idempotencyKey,
              expiresAt: hold.expiresAt,
              totalVnd: seats.reduce((sum, s) => sum + s.section.ticketType.priceVnd, 0),
              items: {
                create: seats.map((s) => ({
                  seatId: s.id,
                  priceVnd: s.section.ticketType.priceVnd,
                })),
              },
            },
            include: orderInclude,
          });
          await tx.auditLog.create({
            data: {
              actorId: userId,
              action: 'ORDER_CREATED',
              entityType: 'Order',
              entityId: order.id,
              metadata: { holdId: hold.id, totalVnd: order.totalVnd },
            },
          });
          return { view: toOrderView(order, now), created: true };
        },
        { maxWait: 15000, timeout: 15000 },
      );
      if (result.created)
        this.publisher.orderChanged(userId, {
          orderId: result.view.id,
          eventId: result.view.eventId,
          status: result.view.status,
        });
      return result.view;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Đơn hàng hoặc mã thử lại đã tồn tại.');
      throw error;
    }
  }
  async get(id: string, userId: string) {
    return this.db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: orderInclude });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
      if (order.userId !== userId) throw new ForbiddenException('Bạn không sở hữu đơn hàng này.');
      return toOrderView(order, await databaseNow(tx));
    });
  }
  async list(userId: string, q: PageDto) {
    return this.db.$transaction(async (tx) => {
      const now = await databaseNow(tx);
      const items = await tx.order.findMany({
        where: { userId },
        include: orderInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      });
      const total = await tx.order.count({ where: { userId } });
      return {
        items: items.map((o) => toOrderView(o, now)),
        pagination: pagination(q.page, q.pageSize, total),
      };
    });
  }
  async cancel(id: string, userId: string) {
    const order = await this.get(id, userId);
    if (!['PENDING_PAYMENT', 'EXPIRED', 'CANCELLED'].includes(order.status))
      throw new ConflictException('Không thể hủy đơn đã thanh toán.');
    await this.lifecycle.release(order.holdId, userId);
    return this.get(id, userId);
  }
}
