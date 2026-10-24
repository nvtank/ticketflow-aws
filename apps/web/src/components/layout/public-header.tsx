'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Menu, Search, Bell, Ticket } from 'lucide-react';
import { useState } from 'react';
import { m } from 'motion/react';
import { Brand } from './brand';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuthState } from '@/stores/auth';
import { roleHome } from '@/lib/auth-session';
import { publicNavigation } from '@/lib/site';

export function PublicHeader() {
  const pathname = usePathname();
  const user = useAuthState((state) => state.user);
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/95 backdrop-blur-xl">
      <div className="hidden border-b bg-[#f4f2fc] md:block">
        <div className="container flex h-8 items-center justify-between text-[10px] font-medium tracking-wide">
          <span className="text-slate-600">
            Một tấm vé. Vạn trải nghiệm. <span className="ml-2 text-primary">Find your flow ↗</span>
          </span>
          <div className="flex gap-5">
            <Link href="/guide" className="text-slate-600 hover:text-primary">
              Hướng dẫn đặt vé
            </Link>
            <Link href="/organizer" className="inline-flex items-center gap-1 text-primary">
              Dành cho nhà tổ chức
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
      <div className="container flex h-[76px] items-center justify-between gap-4">
        <Brand />
        <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 lg:flex">
          {publicNavigation.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative rounded-full px-4 py-2.5 text-[13px] font-medium transition-colors hover:text-primary',
                  active ? 'text-primary' : 'text-slate-600',
                )}
              >
                {active && (
                  <m.span
                    layoutId="public-nav-active"
                    className="absolute inset-0 rounded-full bg-indigo-50"
                    transition={{ type: 'spring', bounce: 0.1, duration: 0.4 }}
                  />
                )}
                <span className="relative">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/events#search"
            aria-label="Tìm kiếm sự kiện"
            className="rounded-full p-2.5 text-slate-600 hover:bg-muted"
          >
            <Search className="size-5" />
          </Link>
          {user && (
            <Link
              href="/notifications"
              aria-label="Thông báo"
              className="rounded-full p-2.5 text-slate-600 hover:bg-muted"
            >
              <Bell className="size-5" />
            </Link>
          )}
          <Button asChild className="hidden max-w-44 rounded-full sm:inline-flex">
            <Link href={user ? roleHome(user.role) : '/login'}>
              <span className="truncate">{user ? user.name : 'Đăng nhập'}</span>
              <ArrowUpRight />
            </Link>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="rounded-full p-2.5 hover:bg-muted lg:hidden" aria-label="Mở menu">
                <Menu className="size-6" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[90dvh] overflow-y-auto">
              <DialogTitle className="text-xl font-bold">Khám phá TixFlow</DialogTitle>
              <DialogDescription className="mt-2 text-sm text-muted-foreground">
                Đi theo đam mê. Tìm khoảnh khắc của bạn.
              </DialogDescription>
              <nav aria-label="Điều hướng trên di động" className="mt-6 flex flex-col gap-1">
                {[
                  { href: '/', label: 'Trang chủ' },
                  ...publicNavigation,
                  { href: '/contributors', label: 'Đội ngũ đóng góp' },
                  { href: '/guide', label: 'Hướng dẫn đặt vé' },
                  ...(user ? [{ href: '/my-tickets', label: 'Vé của tôi' }] : []),
                  { href: '/organizer', label: 'Dành cho nhà tổ chức' },
                  {
                    href: user ? roleHome(user.role) : '/login',
                    label: user ? 'Tài khoản của tôi' : 'Đăng nhập',
                  },
                ].map(({ href, label }) => (
                  <DialogClose asChild key={href}>
                    <Link
                      href={href}
                      aria-current={pathname === href ? 'page' : undefined}
                      className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium hover:bg-indigo-50 hover:text-primary"
                    >
                      {label}
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </DialogClose>
                ))}
              </nav>
              <p className="mt-5 flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
                <Ticket className="size-4 text-primary" />
                Mỗi đam mê đều xứng đáng có một chỗ ngồi.
              </p>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
