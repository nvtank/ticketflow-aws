import { BookingPage } from '@/components/booking/booking-page';
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BookingPage slug={slug} />;
}
