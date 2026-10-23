import { ServiceUnavailableException } from '@nestjs/common';
import { PaymentProvider } from '../payment-provider';
import type { PaymentSession, VerifiedPaymentEvent } from '../payment-provider';
export class DisabledPaymentProvider extends PaymentProvider {
  readonly name = 'disabled' as const;
  async createPayment(): Promise<PaymentSession> {
    throw new ServiceUnavailableException('Thanh toán chưa được cấu hình.');
  }
  async verifyWebhook(): Promise<VerifiedPaymentEvent> {
    throw new ServiceUnavailableException('Thanh toán chưa được cấu hình.');
  }
  async getPaymentStatus(): Promise<VerifiedPaymentEvent> {
    throw new ServiceUnavailableException('Thanh toán chưa được cấu hình.');
  }
}
