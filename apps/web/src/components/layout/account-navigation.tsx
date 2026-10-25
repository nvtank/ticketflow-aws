'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Ticket, UserRound, ArrowUpRight } from 'lucide-react';
import { useAuthState } from '@/stores/auth';
import { cn } from '@/lib/utils';
export function AccountNavigation() {
  const pathname = usePathname();
  const role = useAuthState((state) => state.user?.role);
  const links = [
    { href: '/profile', label: 'Hồ sơ & đơn hàng', icon: UserRound },
    ...(role === 'CUSTOMER' ? [{ href: '/my-tickets', label: 'Vé của tôi', icon: Ticket }] : []),
    { href: '/notifications', label: 'Thông báo', icon: Bell },
  ];
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b pb-5">
      <nav aria-label="Tài khoản của bạn" className="flex flex-wrap gap-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href || pathname.startsWith(href + '/') ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-medium transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-primary/15 text-primary'
                : 'bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </Link>
        ))}
      </nav>
      <Link href="/events" className="text-link">
        Khám phá sự kiện
        <ArrowUpRight className="size-4" />
      </Link>
    </div>
  );
}
