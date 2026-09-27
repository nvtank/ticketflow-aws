import { UserRole } from '@tixflow/shared';
import { AuthGate } from '@/components/auth/auth-gate';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate roles={[UserRole.STAFF]}>
      <DashboardShell role={UserRole.STAFF}>{children}</DashboardShell>
    </AuthGate>
  );
}
