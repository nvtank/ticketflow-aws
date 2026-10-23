import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { Environment } from '../../config/environment';
import type { DatabaseService } from '../../database/database.service';
import { PaymentProvider } from '../payment-provider';
import type { CreatePaymentInput, VerifiedPaymentEvent } from '../payment-provider';
export const mockEventSchema = z.object({
  provider: z.literal('mock'),
  eventId: z.string().min(1).max(150),
  reference: z.string().min(1).max(150),
  orderCode: z.number().int().positive().safe(),
  amountVnd: z.number().int().nonnegative(),
  currency: z.string(),
  status: z.enum(['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED']),
});
export function signMockEvent(input: VerifiedPaymentEvent, key: string) {
  const data = mockEventSchema.parse(input);
  return {
    data,
    signature: createHmac('sha256', key)
      .update('tixflow-mock-payment:' + JSON.stringify(data))
      .digest('hex'),
  };
}
export class MockPaymentProvider extends PaymentProvider {
  readonly name = 'mock' as const;
  constructor(
    private readonly env: Environment,
    private readonly db: DatabaseService,
  ) {
    super();
    if (env.NODE_ENV === 'production') throw new Error('Mock payments are disabled in production.');
  }
  async createPayment(input: CreatePaymentInput) {
    return {
      reference: `mock:${input.paymentId}`,
      orderCode: input.orderCode,
      amountVnd: input.amountVnd,
      checkoutUrl: `${this.env.PAYMENT_RETURN_ORIGIN}/dev-payments/${input.paymentId}`,
    };
  }
  async verifyWebhook(payload: unknown): Promise<VerifiedPaymentEvent> {
    const p = z
      .object({ data: mockEventSchema, signature: z.string().regex(/^[a-f0-9]{64}$/) })
      .safeParse(payload);
    if (!p.success) throw new BadRequestException('Webhook mô phỏng không hợp lệ.');
    const expected = signMockEvent(p.data.data, this.env.JWT_SECRET).signature;
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(p.data.signature)))
      throw new BadRequestException('Chữ ký mô phỏng không hợp lệ.');
    return p.data.data;
  }
  async getPaymentStatus(orderCode: number): Promise<VerifiedPaymentEvent> {
    const p = await this.db.payment.findUnique({ where: { providerOrderCode: BigInt(orderCode) } });
    if (!p || p.provider !== 'mock')
      throw new NotFoundException('Không tìm thấy thanh toán mô phỏng.');
    const rows = await this.db.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    const due = p.mockDueAt && p.mockDueAt <= rows[0]!.now;
    const status =
      due && ['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(p.mockOutcome ?? '')
        ? (p.mockOutcome as 'SUCCEEDED' | 'FAILED' | 'CANCELLED')
        : 'PENDING';
    return {
      provider: this.name,
      eventId: `mock:${p.id}:${status}`,
      reference: `mock:${p.id}`,
      orderCode,
      amountVnd: p.amountVnd,
      currency: 'VND',
      status,
    };
  }
}
