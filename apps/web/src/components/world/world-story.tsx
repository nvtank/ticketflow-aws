'use client';

import { useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** GSAP owns marketing scroll only. Application routes retain native scrolling. */
export function WorldStory({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const ctx = gsap.context(() => {
          gsap.utils.toArray<HTMLElement>('[data-world-reveal]').forEach((element) => {
            gsap.from(element, {
              y: 32,
              opacity: 0.25,
              duration: 0.9,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: element,
                start: 'top 92%',
                once: true,
              },
            });
          });
          gsap.utils.toArray<HTMLElement>('[data-world-mask]').forEach((element) => {
            gsap.fromTo(
              element,
              { clipPath: 'inset(12% 8% 12% 8%)' },
              {
                clipPath: 'inset(0% 0% 0% 0%)',
                ease: 'none',
                scrollTrigger: {
                  trigger: element,
                  start: 'top 90%',
                  end: 'top 30%',
                  scrub: 0.7,
                },
              },
            );
          });
          gsap.to('[data-world-progress]', {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: scope.current,
              start: 'top top',
              end: 'bottom bottom',
              scrub: true,
            },
          });
        }, scope);
        return () => ctx.revert();
      });
      media.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const portal = scope.current?.querySelector<HTMLElement>('.world-portal');
        if (portal) {
          gsap
            .timeline({
              scrollTrigger: {
                trigger: portal,
                start: 'top top',
                end: '+=320',
                pin: true,
                scrub: 0.8,
                invalidateOnRefresh: true,
              },
            })
            .fromTo(portal.querySelector('img'), { scale: 1.15 }, { scale: 1, ease: 'none' }, 0)
            .to(portal.querySelector('.world-portal-content'), { y: -30, ease: 'none' }, 0);
        }
      });
      return () => media.revert();
    },
    { scope, dependencies: [pathname], revertOnUpdate: true },
  );
  return (
    <div ref={scope} className="world-home">
      <div className="world-progress" data-world-progress aria-hidden="true" />
      {children}
    </div>
  );
}
