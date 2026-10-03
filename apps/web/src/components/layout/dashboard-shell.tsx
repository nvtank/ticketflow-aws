'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import type { UserRole } from '@tixflow/shared';
import { Brand } from './brand';
import { LogoutButton } from '@/components/auth/logout-button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useNavigation } from '@/stores/navigation';
import { cn } from '@/lib/utils';

const roleDetails = {
  ORGANIZER: { title: 'Nhà tổ chức', base: '/organizer', icon: Ticket },
  STAFF: { title: 'Nhân viên soát vé', base: '/staff', icon: Users },
  ADMIN: { title: 'Quản trị hệ thống', base: '/admin', icon: ShieldCheck },
} as const;

export type DashboardRole = Exclude<UserRole, 'CUSTOMER'>;

export function DashboardShell({
  role,
  children,
}: {
  role: DashboardRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useNavigation();
  const details = roleDetails[role];
  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-7">
        <Brand />
        <p className="mt-3 text-xs text-muted-foreground">
          Không gian {details.title.toLowerCase()}
        </p>
      </div>
      <nav aria-label="Điều hướng dashboard" className="flex-1 space-y-2 p-4">
        {[
          { href: details.base, label: 'Tổng quan', icon: LayoutDashboard },
          ...(role === 'ORGANIZER'
            ? [{ href: '/organizer/events', label: 'Quản lý sự kiện', icon: Ticket }]
            : role === 'ADMIN'
              ? [{ href: '/admin/events', label: 'Phê duyệt sự kiện', icon: Ticket }]
              : []),
          { href: '/profile', label: 'Hồ sơ của tôi', icon: Users },
          { href: '/system', label: 'Trạng thái hệ thống', icon: Activity },
          { href: '/events', label: 'Khám phá sự kiện', icon: ArrowUpRight },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            onClick={() => setSidebarOpen(false)}
            key={href}
            href={href}
            aria-current={pathname === href ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium',
              pathname === href
                ? 'bg-indigo-50 text-primary'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="m-4 rounded-xl bg-slate-50 p-4">
        <div className="mb-3">
          <LogoutButton />
        </div>
        <p className="text-xs font-semibold">TixFlow Workspace</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Tài khoản đã được xác thực. Quyền thao tác được kiểm tra tại máy chủ.
        </p>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen border-r bg-white lg:block">{sidebar}</aside>
      <div className="min-w-0">
        <header className="flex min-h-20 items-center justify-between gap-4 border-b bg-white px-5 md:px-9">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 hover:bg-muted lg:hidden"
              aria-label="Mở điều hướng dashboard"
            >
              <Menu className="size-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
              <span className="hidden text-muted-foreground sm:block">TixFlow</span>
              <ChevronRight className="hidden size-4 text-muted-foreground sm:block" />
              <span className="font-medium">{details.title}</span>
            </nav>
          </div>
          <Badge className="text-[10px] sm:text-xs">Tài khoản được xác minh</Badge>
        </header>
        <main id="main-content" className="mx-auto max-w-7xl px-5 py-8 md:px-9 md:py-10">
          {children}
        </main>
      </div>
      <Dialog open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <DialogContent className="top-0 left-0 h-dvh w-[min(85vw,320px)] max-w-none translate-x-0 translate-y-0 rounded-none p-0">
          <DialogTitle className="sr-only">Điều hướng {details.title}</DialogTitle>
          <DialogDescription className="sr-only">Menu của không gian làm việc.</DialogDescription>
          {sidebar}
        </DialogContent>
      </Dialog>
    </div>
  );
}
