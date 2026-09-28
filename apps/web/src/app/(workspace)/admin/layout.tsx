import { UserRole } from '@tixflow/shared';
import { AuthGate } from '@/components/auth/auth-gate';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate roles={[UserRole.ADMIN]}>
      <DashboardShell role={UserRole.ADMIN}>{children}</DashboardShell>
    </AuthGate>
  );
}
