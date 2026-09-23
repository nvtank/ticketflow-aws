import { UserRole } from '@tixflow/shared';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role={UserRole.STAFF}>{children}</DashboardShell>;
}
