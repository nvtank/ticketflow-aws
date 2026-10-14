export type ProviderName = 'payos' | 'mock';
export type VerifiedPaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
export interface CreatePaymentInput {
  paymentId: string;
  orderId: string;
  orderCode: number;
  amountVnd: number;
  expiresAt: Date;
  items: { name: string; quantity: number; price: number }[];
}
export interface PaymentSession {
  reference: string;
  orderCode: number;
  amountVnd: number;
  checkoutUrl: string;
}
export interface VerifiedPaymentEvent {
  provider: ProviderName;
  eventId: string;
  reference: string;
  orderCode: number;
  amountVnd: number;
  currency: string;
  transactionReferences?: string[];
  status: VerifiedPaymentStatus;
}
export abstract class PaymentProvider {
  abstract readonly name: ProviderName | 'disabled';
  abstract createPayment(input: CreatePaymentInput): Promise<PaymentSession>;
  abstract verifyWebhook(payload: unknown): Promise<VerifiedPaymentEvent>;
  abstract getPaymentStatus(orderCode: number): Promise<VerifiedPaymentEvent>;
}
