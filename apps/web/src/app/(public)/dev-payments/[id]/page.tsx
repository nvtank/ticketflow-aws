import { MockPayment } from '@/components/booking/mock-payment';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MockPayment id={id} />;
}
