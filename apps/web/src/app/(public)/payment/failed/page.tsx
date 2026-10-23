import { PaymentResult } from '@/components/booking/payment-result';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string }>;
}) {
  const { paymentId } = await searchParams;
  return <PaymentResult id={paymentId ?? null} />;
}
