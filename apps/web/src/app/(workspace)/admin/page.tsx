import type { Metadata } from 'next';
import { UserRole } from '@tixflow/shared';
import { DashboardOverview } from '@/components/dashboard-overview';

export const metadata: Metadata = { title: 'Quản trị hệ thống' };
export default function AdminPage() {
  return <DashboardOverview role={UserRole.ADMIN} />;
}
