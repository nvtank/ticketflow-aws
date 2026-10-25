import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Reveal } from '@/components/motion/reveal';
import { SectionLabel, WorldLink } from './primitives';

export function EditorialHero({
  eyebrow,
  title,
  description,
  image,
  alt,
  action,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  image: string;
  alt: string;
  action?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <section className="editorial-hero">
      <div className="container editorial-hero-grid">
        <Reveal className="editorial-hero-copy">
          <nav aria-label="Đường dẫn" className="editorial-breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span aria-hidden="true">/</span>
            <span>{eyebrow}</span>
          </nav>
          <SectionLabel>{eyebrow}</SectionLabel>
          <h1>{title}</h1>
          <p className="editorial-description">{description}</p>
          {action && <WorldLink href={action.href}>{action.label}</WorldLink>}
          {children}
        </Reveal>
        <Reveal className="editorial-hero-media">
          <Image
            src={image}
            alt={alt}
            fill
            priority
            sizes="(min-width: 1024px) 40vw, 90vw"
            className="object-cover"
          />
          <div className="editorial-media-shade" />
          <span className="editorial-media-mark">TIKFLOW / LIVE EXPERIENCES</span>
          <span className="editorial-media-cross" aria-hidden="true">
            +
          </span>
        </Reveal>
      </div>
    </section>
  );
}
