import { PublicEventDetail } from '@/components/events/event-detail';
export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicEventDetail slug={slug} />;
}
