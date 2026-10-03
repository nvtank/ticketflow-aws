import { AdminEventReview } from '@/components/events/admin-event-review';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminEventReview id={id} />;
}
