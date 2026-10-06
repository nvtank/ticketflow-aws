import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import type { InventoryUpdate } from '@tixflow/shared';
import { DatabaseService } from '../database/database.service';
import { ENVIRONMENT } from '../config/configuration.module';
import type { Environment } from '../config/environment';
import {
  databaseNow,
  lockBookingEvent,
  lockCustomer,
  lockHold,
  lockSeats,
  toHoldView,
} from './booking-record';
import { InventoryPublisher } from './inventory-publisher';
@Injectable()
export class HoldLifecycleService implements OnModuleInit, OnApplicationShutdown {
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;
  private readonly logger = new Logger(HoldLifecycleService.name);
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(InventoryPublisher) private readonly publisher: InventoryPublisher,
    @Inject(ENVIRONMENT) private readonly environment: Environment,
  ) {}
  onModuleInit() {
    const interval = this.environment.HOLD_RECONCILE_INTERVAL_MS;
    if (interval) {
      this.timer = setInterval(() => {
        void this.reconcile().catch(() =>
          this.logger.warn('Hold reconciliation failed; next scan will retry.'),
        );
      }, interval);
      this.timer.unref();
    }
  }
  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }
  async release(id: string, userId?: string) {
    const initial = await this.db.seatHold.findUnique({ where: { id } });
    if (!initial) throw new NotFoundException('Không tìm thấy lượt giữ ghế.');
    if (userId && initial.userId !== userId)
      throw new ForbiddenException('Bạn không sở hữu lượt giữ ghế này.');
    const result = await this.db.$transaction(
      async (tx) => {
        await lockBookingEvent(tx, initial.eventId);
        await lockCustomer(tx, initial.eventId, initial.userId);
        await lockSeats(tx, initial.eventId, initial.requestedSeatIds);
        const hold = await lockHold(tx, id),
          now = await databaseNow(tx);
        const expired = hold.expiresAt <= now;
        // Calls without an owner are reconciliation only, never early release.
        if (hold.releasedAt || (!userId && !expired))
          return { view: toHoldView(hold, now), change: null, orders: [] };
        const candidates = await tx.seat.findMany({
          where: { holdId: id, status: 'HELD', id: { in: hold.requestedSeatIds } },
          select: { id: true },
        });
        const ids = candidates.map((s) => s.id);
        await tx.seat.updateMany({
          where: { holdId: id, status: 'HELD', id: { in: hold.requestedSeatIds } },
          data: { status: 'AVAILABLE', holdId: null },
        });
        const updatedHold = await tx.seatHold.update({
          where: { id },
          data: { releasedAt: now },
          include: { order: { select: { id: true } } },
        });
        const orders = await tx.order.findMany({
          where: { holdId: id, status: 'PENDING_PAYMENT' },
          select: { id: true },
        });
        await tx.order.updateMany({
          where: { holdId: id, status: 'PENDING_PAYMENT' },
          data: { status: expired ? 'EXPIRED' : 'CANCELLED' },
        });
        let change: InventoryUpdate | null = null;
        if (ids.length) {
          const event = await tx.event.update({
            where: { id: hold.eventId },
            data: { inventoryRevision: { increment: 1 } },
            select: { inventoryRevision: true },
          });
          change = {
            eventId: hold.eventId,
            seatIds: ids,
            revision: event.inventoryRevision,
            occurredAt: now.toISOString(),
          };
        }
        await tx.auditLog.create({
          data: {
            actorId: userId ?? null,
            action: expired ? 'HOLD_EXPIRED' : 'HOLD_RELEASED',
            entityType: 'SeatHold',
            entityId: id,
            metadata: { eventId: hold.eventId, seatIds: ids },
          },
        });
        return {
          view: toHoldView(updatedHold, now),
          change,
          orders: orders.map((o) => ({
            orderId: o.id,
            eventId: hold.eventId,
            status: expired ? ('EXPIRED' as const) : ('CANCELLED' as const),
          })),
        };
      },
      { maxWait: 15000, timeout: 15000 },
    );
    if (result.change) this.publisher.publish('seat:released', result.change);
    for (const order of result.orders) this.publisher.orderChanged(initial.userId, order);
    return result.view;
  }
  async reconcile() {
    if (this.running) return 0;
    this.running = true;
    try {
      const expired = await this.db.$queryRaw<
        { id: string }[]
      >`SELECT "id" FROM "SeatHold" WHERE "releasedAt" IS NULL AND "expiresAt"<=clock_timestamp() ORDER BY "expiresAt", "id" LIMIT 100`;
      for (const hold of expired) await this.release(hold.id);
      return expired.length;
    } finally {
      this.running = false;
    }
  }
}
