import { OrganizerEventManager } from '@/components/events/organizer-event-manager';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrganizerEventManager id={id} />;
}
