import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel = 'Khám phá thêm',
  light = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  light?: boolean;
}) {
  return (
    <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-2xl">
        <p className={cn('eyebrow', light && 'text-primary')}>{eyebrow}</p>
        <h2 className="section-title mt-3">{title}</h2>
        {description && (
          <p
            className={cn(
              'mt-4 max-w-xl text-sm leading-7 text-muted-foreground',
              light && 'text-slate-300',
            )}
          >
            {description}
          </p>
        )}
      </div>
      {href && (
        <Link href={href} className={cn('text-link', light && 'text-white')}>
          {linkLabel}
          <ArrowUpRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="page-intro">
      <div className="container relative">
        <nav aria-label="Đường dẫn" className="mb-9 flex gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Trang chủ
          </Link>
          <span aria-hidden="true">/</span>
          <span>{eyebrow}</span>
        </nav>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display-title mt-4 max-w-4xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground">{description}</p>
        {children}
      </div>
    </section>
  );
}
