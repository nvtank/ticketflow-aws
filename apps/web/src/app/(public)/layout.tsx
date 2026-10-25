'use client';

import { usePathname } from 'next/navigation';
import { FlowRouteTransition } from '@/components/home/flow/route-transition';
import { PublicFooter } from '@/components/layout/public-footer';
import { PublicHeader } from '@/components/layout/public-header';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <FlowRouteTransition />
      <PublicHeader />
      <main id="main-content" className={pathname === '/' ? undefined : 'site-main'}>
        {children}
      </main>
      <PublicFooter />
    </>
  );
}
