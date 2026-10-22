import type { Metadata } from 'next';
import { UserRole } from '@tixflow/shared';
import { DashboardOverview } from '@/components/dashboard-overview';

export const metadata: Metadata = { title: 'Nhân viên soát vé' };
export default function StaffPage() {
  return <DashboardOverview role={UserRole.STAFF} />;
}
