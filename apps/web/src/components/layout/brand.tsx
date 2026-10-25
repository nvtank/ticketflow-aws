import Link from 'next/link';
import { cn } from '@/lib/utils';
import { FlowMark } from '@/components/home/flow/primitives';

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="TikFlow · Trang chủ"
      className={cn('site-brand', light && 'site-brand-light')}
    >
      <FlowMark />
      <span>
        tikflow<sup>®</sup>
      </span>
    </Link>
  );
}
