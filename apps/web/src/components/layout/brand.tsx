import Link from 'next/link';
import { AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="TixFlow · Trang chủ"
      className={cn(
        'inline-flex items-center gap-2.5 text-2xl font-extrabold tracking-tight',
        light ? 'text-white' : 'text-foreground',
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white">
        <AudioLines className="size-6" aria-hidden="true" />
      </span>
      TixFlow<span className="-ml-2 text-primary">.</span>
    </Link>
  );
}
