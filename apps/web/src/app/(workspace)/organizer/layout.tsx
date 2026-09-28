import { UserRole } from '@tixflow/shared';
import { AuthGate } from '@/components/auth/auth-gate';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate roles={[UserRole.ORGANIZER]}>
      <DashboardShell role={UserRole.ORGANIZER}>{children}</DashboardShell>
    </AuthGate>
  );
}
