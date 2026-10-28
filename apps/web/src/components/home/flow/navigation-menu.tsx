'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { DialogClose, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { FlowMark } from './primitives';

type MenuGroup = { title: string; items: { href: string; label: string }[] };

export function NavigationMenu({ groups }: { groups: MenuGroup[] }) {
  const pathname = usePathname();
  const scope = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const reduced = matchMedia('(prefers-reduced-motion: reduce)');
      if (reduced.matches) return;
      const panel = scope.current?.closest<HTMLElement>('.tf-site-menu');
      if (!panel) return;
      // This portaled scene owns its timeline; it never enters the header's context.
      const timeline = gsap
        .timeline()
        .fromTo(
          panel,
          { y: -12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.24, ease: 'power3.out' },
          0,
        )
        .from(
          '[data-menu-title]',
          { yPercent: 20, opacity: 0, duration: 0.3, stagger: 0.03, ease: 'power4.out' },
          0.04,
        )
        .from(
          '[data-menu-item]',
          { y: 8, opacity: 0, duration: 0.24, stagger: 0.012, ease: 'power3.out' },
          0.08,
        )
        .from('.tf-menu-bottom', { y: 8, opacity: 0, duration: 0.24, ease: 'power3.out' }, 0.12);
      const preference = () => {
        if (reduced.matches) timeline.progress(1).kill();
      };
      reduced.addEventListener('change', preference);
      return () => reduced.removeEventListener('change', preference);
    },
    { scope },
  );
  return (
    <div className="tf-menu-scene" ref={scope}>
      <div className="tf-menu-meta">
        <span>
          <i /> YOUR NEXT WAY IN
        </span>
        <span>TIKFLOW / DIRECTORY</span>
      </div>
      <DialogTitle className="tf-menu-headline">
        <span>
          <span data-menu-title>GO SOMEWHERE.</span>
        </span>
        <span>
          <em data-menu-title>UNFORGETTABLE.</em>
        </span>
      </DialogTitle>
      <DialogDescription>Events, community and everything you need.</DialogDescription>
      <nav className="tf-menu-links" aria-label="All pages">
        {groups.map((group, groupIndex) => (
          <section key={group.title} aria-label={group.title}>
            <h3 data-menu-item>
              <span>0{groupIndex + 1}</span> / {group.title}
            </h3>
            {group.items.map((link, index) => (
              <DialogClose asChild key={link.href}>
                <Link
                  href={link.href}
                  aria-current={
                    pathname === link.href || pathname.startsWith(`${link.href}/`)
                      ? 'page'
                      : undefined
                  }
                  data-menu-item
                >
                  <span className="tf-menu-link-index" aria-hidden="true">
                    0{index + 1}
                  </span>
                  <span>{link.label}</span>
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </DialogClose>
            ))}
          </section>
        ))}
      </nav>
      <div className="tf-menu-bottom">
        <span>
          <FlowMark /> LESS SCROLLING.
          <br />
          MORE LIVING.
        </span>
        <DialogClose asChild>
          <Link href="/events">
            FIND YOUR NEXT <ArrowUpRight size={22} />
          </Link>
        </DialogClose>
      </div>
      <span className="tf-menu-watermark" aria-hidden="true">
        tikflow®
      </span>
    </div>
  );
}
