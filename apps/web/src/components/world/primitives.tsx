import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('world-label', className)}>
      <span aria-hidden="true" />
      {children}
    </p>
  );
}

export function DisplayHeading({
  children,
  as: Tag = 'h2',
  className,
}: {
  children: ReactNode;
  as?: 'h1' | 'h2';
  className?: string;
}) {
  return <Tag className={cn('world-heading', className)}>{children}</Tag>;
}

export function WorldLink({
  children,
  secondary = false,
  className,
  ...props
}: ComponentProps<typeof Link> & { secondary?: boolean }) {
  return (
    <Link
      {...props}
      className={cn('world-button', secondary && 'world-button-secondary', className)}
    >
      <span>{children}</span>
      <ArrowUpRight aria-hidden="true" />
    </Link>
  );
}

export function SectionContainer({ children, className, ...props }: ComponentProps<'section'>) {
  return (
    <section {...props} className={cn('world-section', className)}>
      <div className="container">{children}</div>
    </section>
  );
}
