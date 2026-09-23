import { UserRole } from '@tixflow/shared';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role={UserRole.ADMIN}>{children}</DashboardShell>;
}
