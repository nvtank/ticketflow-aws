import { CheckoutPanel } from '@/components/booking/checkout-panel';
export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <CheckoutPanel id={orderId} />;
}
