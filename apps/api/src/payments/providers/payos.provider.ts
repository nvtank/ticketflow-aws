import { BadGatewayException, BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PayOS } from '@payos/node';
import { z } from 'zod';
import { ENVIRONMENT } from '../../config/configuration.module';
import type { Environment } from '../../config/environment';
import { PaymentProvider } from '../payment-provider';
import type { CreatePaymentInput, PaymentSession, VerifiedPaymentEvent } from '../payment-provider';
const dataSchema = z
  .object({
    orderCode: z.number().int().positive().safe(),
    amount: z.number().int().nonnegative(),
    description: z.string(),
    accountNumber: z.string(),
    reference: z.string().min(1).max(120),
    transactionDateTime: z.string(),
    currency: z.string(),
    paymentLinkId: z.string().min(1).max(100),
    code: z.string(),
    desc: z.string(),
  })
  .passthrough();
const webhookSchema = z.object({
  code: z.string(),
  desc: z.string(),
  success: z.boolean(),
  data: dataSchema,
  signature: z.string().regex(/^[a-fA-F0-9]{64}$/),
});
@Injectable()
export class PayOSPaymentProvider extends PaymentProvider {
  readonly name = 'payos' as const;
  private readonly client: PayOS;
  constructor(@Inject(ENVIRONMENT) private readonly env: Environment) {
    super();
    this.client = new PayOS({
      clientId: env.PAYOS_CLIENT_ID,
      apiKey: env.PAYOS_API_KEY,
      checksumKey: env.PAYOS_CHECKSUM_KEY,
      baseURL: 'https://api-merchant.payos.vn',
      timeout: 8000,
      maxRetries: 0,
      logLevel: 'off',
    });
  }
  async createPayment(input: CreatePaymentInput): Promise<PaymentSession> {
    const origin = this.env.PAYMENT_RETURN_ORIGIN;
    try {
      const link = await this.client.paymentRequests.create({
        orderCode: input.orderCode,
        amount: input.amountVnd,
        description: 'TF' + input.orderId.replaceAll('-', '').slice(0, 7).toUpperCase(),
        items: input.items,
        expiredAt: Math.floor(input.expiresAt.getTime() / 1000),
        returnUrl: `${origin}/payment/success?paymentId=${input.paymentId}`,
        cancelUrl: `${origin}/payment/failed?paymentId=${input.paymentId}`,
      });
      const url = new URL(link.checkoutUrl);
      if (
        link.orderCode !== input.orderCode ||
        link.amount !== input.amountVnd ||
        link.currency !== 'VND' ||
        url.protocol !== 'https:' ||
        url.hostname !== 'pay.payos.vn'
      )
        throw new Error('Unexpected provider session');
      return {
        reference: link.paymentLinkId,
        orderCode: link.orderCode,
        amountVnd: link.amount,
        checkoutUrl: url.href,
      };
    } catch {
      // Stable order code recovers an earlier successful create after timeout/retry.
      try {
        const link = await this.client.paymentRequests.get(input.orderCode);
        if (
          link.orderCode !== input.orderCode ||
          link.amount !== input.amountVnd ||
          !/^[a-zA-Z0-9-]{1,100}$/.test(link.id)
        )
          throw new Error('Mismatched provider session');
        return {
          reference: link.id,
          orderCode: link.orderCode,
          amountVnd: link.amount,
          checkoutUrl: `https://pay.payos.vn/web/${link.id}`,
        };
      } catch {
        throw new BadGatewayException('Chưa thể tạo liên kết PayOS. Hãy thử lại cùng đơn hàng.');
      }
    }
  }
  async verifyWebhook(payload: unknown): Promise<VerifiedPaymentEvent> {
    const parsed = webhookSchema.safeParse(payload);
    if (!parsed.success) throw new BadRequestException('Dữ liệu webhook không hợp lệ.');
    try {
      // Preserve every signed data field: do not strip fields before SDK verification.
      const data = await this.client.webhooks.verify(parsed.data);
      return {
        provider: this.name,
        eventId: `transfer:${data.reference}`,
        reference: data.paymentLinkId,
        orderCode: data.orderCode,
        amountVnd: data.amount,
        currency: data.currency,
        status: data.code === '00' ? 'SUCCEEDED' : 'PENDING',
      };
    } catch {
      throw new BadRequestException('Chữ ký PayOS không hợp lệ.');
    }
  }
  async getPaymentStatus(orderCode: number): Promise<VerifiedPaymentEvent> {
    try {
      // The official SDK verifies the response signature as well as TLS/authentication.
      const link = await this.client.paymentRequests.get(orderCode);
      if (
        link.orderCode !== orderCode ||
        !Number.isSafeInteger(link.amountPaid) ||
        link.amountPaid < 0
      )
        throw new Error('Unexpected provider status');
      const status =
        link.status === 'PAID'
          ? 'SUCCEEDED'
          : link.status === 'CANCELLED' || link.status === 'EXPIRED'
            ? 'CANCELLED'
            : link.status === 'FAILED'
              ? 'FAILED'
              : 'PENDING';
      // Any money on a terminated link requires review, not silent cancellation.
      const effective = link.amountPaid > 0 && status !== 'PENDING' ? 'SUCCEEDED' : status;
      return {
        provider: this.name,
        eventId: `status:${link.id}:${link.status}:${link.amountPaid}`,
        reference: link.id,
        orderCode,
        amountVnd: link.amountPaid,
        currency: 'VND',
        status: effective,
      };
    } catch {
      throw new BadGatewayException('Chưa thể xác minh trạng thái với PayOS. Vui lòng thử lại.');
    }
  }
}
