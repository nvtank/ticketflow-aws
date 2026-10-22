import { UserRole } from '@tixflow/shared';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role={UserRole.ORGANIZER}>{children}</DashboardShell>;
}
