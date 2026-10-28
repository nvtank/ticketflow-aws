'use client';

import { usePathname } from 'next/navigation';
import { FlowNavigation } from '@/components/home/flow/navigation';

export function PublicHeader() {
  const pathname = usePathname();
  return <FlowNavigation interior={pathname !== '/'} />;
}
