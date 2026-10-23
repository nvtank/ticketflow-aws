import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import { PaymentProvider } from './payment-provider';
import { lockPaymentOrder, paymentView } from './payment-record';
import { databaseNow } from '../booking/booking-record';
@Injectable()
export class PaymentSessionsService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(PaymentProvider) private readonly provider: PaymentProvider,
  ) {}
  async owned(id: string, userId: string) {
    const payment = await this.db.payment.findUnique({ where: { id }, include: { order: true } });
    if (!payment) throw new NotFoundException('Không tìm thấy thanh toán.');
    if (payment.order.userId !== userId)
      throw new ForbiddenException('Bạn không sở hữu thanh toán này.');
    return payment;
  }
  async view(id: string, userId: string) {
    const payment = await this.owned(id, userId);
    return this.db.$transaction(async (tx) => paymentView(payment, await databaseNow(tx)));
  }
  async create(orderId: string, key: string, userId: string) {
    if (!['mock', 'payos'].includes(this.provider.name))
      throw new ServiceUnavailableException('Thanh toán chưa được cấu hình.');
    let prepared;
    try {
      prepared = await this.db.$transaction(
        async (tx) => {
          const { order, hold, event, now } = await lockPaymentOrder(tx, orderId, userId);
          const retried = await tx.payment.findUnique({ where: { idempotencyKey: key } });
          if (retried && (retried.orderId !== orderId || retried.provider !== this.provider.name))
            throw new ConflictException('Mã thử lại đã dùng cho thanh toán khác.');
          const existing = await tx.payment.findFirst({ where: { orderId } });
          if (existing && existing.provider !== this.provider.name)
            throw new ConflictException('Đơn đã có phiên thanh toán qua nhà cung cấp khác.');
          if (
            order.status !== 'PENDING_PAYMENT' ||
            order.expiresAt <= now ||
            hold.releasedAt ||
            hold.expiresAt <= now
          )
            throw new ConflictException('Đơn không còn đủ điều kiện thanh toán.');
          if (event.status !== 'PUBLISHED' || event.organization.status !== 'APPROVED')
            throw new ConflictException('Sự kiện không còn mở bán.');
          const payment =
            existing ??
            (await tx.payment.create({
              data: {
                orderId,
                provider: this.provider.name,
                providerReference: `pending:${orderId}`,
                providerOrderCode: BigInt(randomInt(100000000000, 9000000000000)),
                idempotencyKey: key,
                amountVnd: order.totalVnd,
                expiresAt: order.expiresAt,
              },
            }));
          return { payment, order };
        },
        { maxWait: 15000, timeout: 15000 },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Mã thanh toán đã được sử dụng. Thử lại cùng đơn hàng.');
      throw error;
    }
    const { payment, order } = prepared;
    if (!payment.checkoutUrl && payment.status === 'PENDING') {
      // PayOS network request must never hold PostgreSQL locks.
      const session = await this.provider.createPayment({
        paymentId: payment.id,
        orderId,
        orderCode: Number(payment.providerOrderCode),
        amountVnd: payment.amountVnd,
        expiresAt: order.expiresAt,
        items: order.items.map((i) => ({
          name: `Ve ${i.seatId.slice(0, 8)}`,
          quantity: 1,
          price: i.priceVnd,
        })),
      });
      if (
        session.orderCode !== Number(payment.providerOrderCode) ||
        session.amountVnd !== payment.amountVnd
      )
        throw new ConflictException('Thông tin liên kết thanh toán không khớp.');
      await this.db.payment.updateMany({
        where: {
          id: payment.id,
          OR: [
            { providerReference: payment.providerReference },
            { providerReference: session.reference },
          ],
        },
        data: { providerReference: session.reference, checkoutUrl: session.checkoutUrl },
      });
    }
    return this.view(payment.id, userId);
  }
}
