import type { Metadata } from 'next';
import { UserRole } from '@tixflow/shared';
import { DashboardOverview } from '@/components/dashboard-overview';

export const metadata: Metadata = { title: 'Nhà tổ chức' };
export default function OrganizerPage() {
  return <DashboardOverview role={UserRole.ORGANIZER} />;
}
