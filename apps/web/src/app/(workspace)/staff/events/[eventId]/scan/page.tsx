import { StaffScanner } from '@/components/staff/staff-scanner';
export default async function Page({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <StaffScanner eventId={eventId} />;
}
