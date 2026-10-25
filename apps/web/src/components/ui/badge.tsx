import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Badge({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary',
        className,
      )}
      {...props}
    />
  );
}
