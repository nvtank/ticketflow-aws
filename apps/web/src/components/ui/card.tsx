import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn('min-w-0 rounded-[20px] border bg-card p-5 sm:p-6', className)}
      {...props}
    />
  );
}
