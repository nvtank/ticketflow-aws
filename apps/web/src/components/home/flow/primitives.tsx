import Image from 'next/image';
import { imageBlur } from './image-placeholders';
import { TransitionLink } from './route-transition';
import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
export function FlowImage({
  src,
  alt = '',
  priority = false,
  className = '',
  sizes = '(max-width: 700px) 100vw, 65vw',
}: {
  src: string;
  alt?: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  return (
    <div className={`tf-image ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        placeholder={!priority && imageBlur(src) ? 'blur' : 'empty'}
        blurDataURL={!priority ? imageBlur(src) : undefined}
        sizes={sizes}
        unoptimized={src.startsWith('http')}
      />
    </div>
  );
}
export function FlowLink({
  href,
  children,
  outline = false,
}: {
  href: string;
  children: ReactNode;
  outline?: boolean;
}) {
  return (
    <TransitionLink
      href={href}
      className={`tf-button ${outline ? 'tf-button-outline' : ''}`}
      data-magnetic
    >
      {children}
      <ArrowUpRight size={19} aria-hidden="true" />
    </TransitionLink>
  );
}
export function SectionLabel({ index, children }: { index: string; children: ReactNode }) {
  return (
    <div className="tf-label">
      <span className="tf-dot" />
      {index} / {children}
    </div>
  );
}
export function FlowMark() {
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <path
        d="M8 27H40C58 27 58 53 40 53H8M72 13H40C4 13 4 67 40 67H72"
        stroke="currentColor"
        strokeWidth="9"
      />
      <path d="M57 1L73 13L57 25M23 55L7 67L23 79" stroke="currentColor" strokeWidth="7" />
    </svg>
  );
}
