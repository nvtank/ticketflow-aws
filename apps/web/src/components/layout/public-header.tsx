'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Menu, Search, Bell } from 'lucide-react';
import { useState } from 'react';
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

const links = [
  { href: '/', label: 'Trang chủ' },
  { href: '/events', label: 'Khám phá sự kiện' },
  { href: '/#categories', label: 'Danh mục' },
];

export function PublicHeader() {
  const pathname = usePathname();
  const user = useAuthState((state) => state.user);
  const dark = pathname === '/';
  const [open, setOpen] = useState(false);
  return (
    <header
      className={cn(
        'relative z-30 border-b',
        dark ? 'border-white/10 bg-[#0b1020] text-white' : 'border-border bg-white',
      )}
    >
      <div className="container flex h-20 items-center justify-between gap-6">
        <Brand light={dark} />
        <nav aria-label="Điều hướng chính" className="hidden items-center gap-7 lg:flex">
          {[
            ...links,
            ...(user?.role === 'CUSTOMER' ? [{ href: '/my-tickets', label: 'Vé của tôi' }] : []),
          ].map(({ href, label }) => (
            <Link
              key={`${href}:${label}`}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              className={cn(
                'text-sm font-medium transition-colors hover:text-indigo-400',
                pathname === href
                  ? dark
                    ? 'text-white'
                    : 'text-primary'
                  : dark
                    ? 'text-slate-400'
                    : 'text-muted-foreground',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {user && (
            <Link
              href="/notifications"
              aria-label="Thông báo"
              className="rounded-xl p-2.5 hover:bg-muted"
            >
              <Bell className="size-5" />
            </Link>
          )}
          <Link
            href="/events#search"
            aria-label="Tìm kiếm sự kiện"
            className={cn('rounded-xl p-2.5', dark ? 'hover:bg-white/10' : 'hover:bg-muted')}
          >
            <Search className="size-5" />
          </Link>
          <Link
            href="/organizer"
            className={cn(
              'hidden items-center gap-1.5 text-sm font-medium xl:inline-flex',
              dark ? 'text-slate-300' : 'text-muted-foreground',
            )}
          >
            Dành cho nhà tổ chức
            <ArrowUpRight className="size-4" />
          </Link>
          <span className="mx-1 hidden h-5 w-px bg-current opacity-15 sm:block" />
          <Button asChild className="hidden sm:inline-flex">
            <Link href={user ? roleHome(user.role) : '/login'}>
              {user ? user.name : 'Đăng nhập'}
            </Link>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button
                className={cn(
                  'rounded-xl p-2 lg:hidden',
                  dark ? 'hover:bg-white/10' : 'hover:bg-muted',
                )}
                aria-label="Mở menu"
              >
                <Menu className="size-6" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle className="text-lg font-bold">Khám phá TixFlow</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Kết nối với những trải nghiệm bạn yêu thích.
              </DialogDescription>
              <nav aria-label="Điều hướng trên di động" className="mt-6 flex flex-col gap-2">
                {[
                  ...links,
                  ...(user?.role === 'CUSTOMER'
                    ? [{ href: '/my-tickets', label: 'Vé của tôi' }]
                    : []),
                  { href: '/organizer', label: 'Dành cho nhà tổ chức' },
                  { href: '/system', label: 'Trạng thái hệ thống' },
                  {
                    href: user ? roleHome(user.role) : '/login',
                    label: user ? 'Tài khoản của tôi' : 'Đăng nhập',
                  },
                ].map(({ href, label }) => (
                  <DialogClose asChild key={`${href}:${label}`}>
                    <Link href={href} className="rounded-xl px-4 py-3 font-medium hover:bg-muted">
                      {label}
                    </Link>
                  </DialogClose>
                ))}
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
