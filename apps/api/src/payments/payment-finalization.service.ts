import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { InventoryUpdate, OrderStatus } from '@tixflow/shared';
import { DatabaseService } from '../database/database.service';
import { ENVIRONMENT } from '../config/configuration.module';
import type { Environment } from '../config/environment';
import { InventoryPublisher } from '../booking/inventory-publisher';
import { HoldLifecycleService } from '../booking/hold-lifecycle.service';
import { credentialHash, ticketCredential, ticketKey } from '../tickets/ticket-credential';
import { lockPaymentOrder } from './payment-record';
import type { VerifiedPaymentEvent } from './payment-provider';
@Injectable()
export class PaymentFinalizationService {
  private readonly logger = new Logger(PaymentFinalizationService.name);
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(ENVIRONMENT) private readonly env: Environment,
    @Inject(InventoryPublisher) private readonly publisher: InventoryPublisher,
    @Inject(HoldLifecycleService) private readonly lifecycle: HoldLifecycleService,
  ) {}
  async finalize(input: VerifiedPaymentEvent) {
    const initial = await this.db.payment.findUnique({
      where: { providerOrderCode: BigInt(input.orderCode) },
    });
    // PayOS webhook registration sends a signed sample unrelated to any order.
    if (!initial || initial.provider !== input.provider) return { accepted: true, ignored: true };
    const digest = createHash('sha256')
      .update(
        JSON.stringify({
          reference: input.reference,
          orderCode: input.orderCode,
          amountVnd: input.amountVnd,
          currency: input.currency,
          transactionReferences: input.transactionReferences ?? [],
          status: input.status,
        }),
      )
      .digest('hex');
    const result = await this.db.$transaction(
      async (tx) => {
        // Serialize a provider event across different orders as well as callback retries.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.provider + ':' + input.eventId}, 71))::text`;
        const { order, hold, event, now } = await lockPaymentOrder(tx, initial.orderId);
        await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id"=${initial.id}::uuid FOR UPDATE`;
        const payment = await tx.payment.findUniqueOrThrow({ where: { id: initial.id } });
        const seen = await tx.webhookEvent.findUnique({
          where: {
            provider_providerEventId: { provider: input.provider, providerEventId: input.eventId },
          },
        });
        if (seen) {
          if (seen.payloadHash !== digest || seen.paymentId !== payment.id)
            throw new ConflictException('Mã giao dịch đã được xử lý với nội dung khác.');
          return {
            change: null,
            changed: false,
            release: false,
            userId: order.userId,
            holdId: hold.id,
            orderId: order.id,
            eventId: event.id,
            status: order.status,
          };
        }
        if (
          !payment.providerReference.startsWith('pending:') &&
          payment.providerReference !== input.reference
        )
          throw new BadRequestException('Liên kết thanh toán không khớp đơn hàng.');
        await tx.payment.update({
          where: { id: payment.id },
          data: { providerReference: input.reference, reconciledAt: now },
        });
        let outcome = 'PENDING',
          changed = false,
          release = false;
        let status: OrderStatus = order.status;
        let change: InventoryUpdate | null = null;
        if (input.status !== 'PENDING') {
          if (order.status === 'PAID' || payment.status === 'REFUND_REQUIRED') {
            // A status query and its webhook may represent the same settlement.
            outcome = 'ALREADY_TERMINAL';
            if (
              order.status === 'PAID' &&
              input.status === 'SUCCEEDED' &&
              payment.status !== 'REFUND_REQUIRED' &&
              (input.amountVnd !== payment.amountVnd ||
                input.currency !== 'VND' ||
                input.transactionReferences?.some(
                  (ref) => !payment.settledReferences.includes(ref),
                ))
            ) {
              // Extra money does not revoke existing tickets or issue additional tickets.
              await tx.payment.update({
                where: { id: payment.id },
                data: { status: 'REFUND_REQUIRED' },
              });
              await tx.auditLog.create({
                data: {
                  action: 'PAYMENT_EXTRA_TRANSFER_REVIEW',
                  entityType: 'Payment',
                  entityId: payment.id,
                  metadata: {
                    orderId: order.id,
                    receivedVnd: input.amountVnd,
                    currency: input.currency,
                  },
                },
              });
              outcome = 'EXTRA_TRANSFER_REVIEW';
            }
          } else if (input.status === 'SUCCEEDED') {
            const seats = await tx.seat.findMany({
              where: { id: { in: order.items.map((i) => i.seatId) }, eventId: event.id },
            });
            const eligible =
              input.amountVnd === order.totalVnd &&
              input.amountVnd === payment.amountVnd &&
              input.currency === 'VND' &&
              order.status === 'PENDING_PAYMENT' &&
              order.expiresAt > now &&
              hold.expiresAt > now &&
              !hold.releasedAt &&
              event.status === 'PUBLISHED' &&
              event.organization.status === 'APPROVED' &&
              order.items.length > 0 &&
              seats.length === order.items.length &&
              seats.every((s) => s.status === 'HELD' && s.holdId === hold.id);
            if (!eligible) {
              status = 'REFUND_REQUIRED';
              outcome = 'REFUND_REQUIRED';
              changed = true;
              release = true;
              await tx.payment.update({
                where: { id: payment.id },
                data: { status: 'REFUND_REQUIRED' },
              });
              await tx.order.update({ where: { id: order.id }, data: { status } });
              await tx.auditLog.create({
                data: {
                  action: 'PAYMENT_REFUND_REQUIRED',
                  entityType: 'Payment',
                  entityId: payment.id,
                  metadata: {
                    orderId: order.id,
                    expectedVnd: order.totalVnd,
                    receivedVnd: input.amountVnd,
                    currency: input.currency,
                  },
                },
              });
            } else {
              const updated = await tx.seat.updateMany({
                where: {
                  id: { in: order.items.map((i) => i.seatId) },
                  status: 'HELD',
                  holdId: hold.id,
                },
                data: { status: 'SOLD', holdId: null },
              });
              if (updated.count !== order.items.length)
                throw new ConflictException('Quyền giữ ghế đã thay đổi.');
              for (const item of order.items) {
                const id = randomUUID();
                await tx.ticket.create({
                  data: {
                    id,
                    orderItemId: item.id,
                    seatId: item.seatId,
                    eventId: item.eventId,
                    code: 'TF-' + randomUUID().replaceAll('-', '').toUpperCase(),
                    qrVersion: 1,
                    qrTokenHash: credentialHash(ticketCredential(id, ticketKey(this.env))),
                  },
                });
              }
              await tx.seatHold.update({ where: { id: hold.id }, data: { releasedAt: now } });
              await tx.order.update({
                where: { id: order.id },
                data: { status: 'PAID', paidAt: now },
              });
              await tx.payment.update({
                where: { id: payment.id },
                data: { status: 'SUCCEEDED', settledReferences: input.transactionReferences ?? [] },
              });
              const revision = await tx.event.update({
                where: { id: event.id },
                data: { inventoryRevision: { increment: 1 } },
                select: { inventoryRevision: true },
              });
              change = {
                eventId: event.id,
                seatIds: order.items.map((i) => i.seatId),
                revision: revision.inventoryRevision,
                occurredAt: now.toISOString(),
              };
              await tx.auditLog.create({
                data: {
                  action: 'PAYMENT_SUCCEEDED',
                  entityType: 'Payment',
                  entityId: payment.id,
                  metadata: { orderId: order.id, totalVnd: order.totalVnd },
                },
              });
              await tx.notification.create({
                data: {
                  userId: order.userId,
                  title: 'Vé đã được phát hành',
                  message: `Thanh toán thành công. ${order.items.length} vé đã có trong Vé của tôi.`,
                },
              });
              status = 'PAID';
              outcome = 'PAID';
              changed = true;
            }
          } else if (payment.status !== 'SUCCEEDED') {
            await tx.payment.update({ where: { id: payment.id }, data: { status: input.status } });
            if (order.status === 'PENDING_PAYMENT') {
              status = input.status === 'FAILED' ? 'PAYMENT_FAILED' : 'CANCELLED';
              changed = true;
              release = true;
              await tx.order.update({ where: { id: order.id }, data: { status } });
            }
            outcome = input.status;
          }
        }
        await tx.webhookEvent.create({
          data: {
            provider: input.provider,
            providerEventId: input.eventId,
            payloadHash: digest,
            paymentId: payment.id,
            outcome,
            processedAt: now,
          },
        });
        return {
          change,
          changed,
          release,
          userId: order.userId,
          holdId: hold.id,
          orderId: order.id,
          eventId: event.id,
          status,
        };
      },
      { maxWait: 15000, timeout: 15000 },
    );
    if (result.change) this.publisher.publish('seat:sold', result.change);
    if (result.changed)
      this.publisher.orderChanged(result.userId, {
        orderId: result.orderId,
        eventId: result.eventId,
        status: result.status,
      });
    if (result.release)
      await this.lifecycle
        .release(result.holdId, result.userId)
        .catch(() => this.logger.warn('Payment finalized; hold release will reconcile at expiry.'));
    return { accepted: true, ignored: false };
  }
}
