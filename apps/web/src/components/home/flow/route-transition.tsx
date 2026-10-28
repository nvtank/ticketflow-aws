'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, type ComponentProps } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import styles from './route-transition.module.css';
let navigate: ((href: string) => boolean) | undefined;

/** Modified clicks, anchor jumps and reduced motion retain normal Next.js navigation. */
export function TransitionLink(props: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      onNavigate={(event) => {
        let prevented = false;
        props.onNavigate?.({
          ...event,
          preventDefault: () => {
            prevented = true;
            event.preventDefault();
          },
        });
        if (typeof props.href !== 'string' || props.href.startsWith('#')) return;
        if (!prevented) navigate?.(props.href);
      }}
    />
  );
}
export function FlowRouteTransition() {
  const scope = useRef<HTMLDivElement>(null);
  const pending = useRef<string | null>(null);
  const timeout = useRef(0);
  const path = usePathname();
  const { contextSafe } = useGSAP({ scope });
  useGSAP(
    () => {
      const cover = contextSafe((href: string) => {
        if (
          matchMedia('(prefers-reduced-motion: reduce)').matches ||
          new URL(href, location.origin).pathname === location.pathname
        )
          return false;
        if (pending.current) return true;
        pending.current = new URL(href, location.origin).pathname;
        gsap.set(scope.current, { autoAlpha: 1, pointerEvents: 'auto' });
        gsap.fromTo(
          `.${styles.sheet}`,
          { yPercent: 105 },
          {
            yPercent: 0,
            duration: 0.18,
            stagger: 0.025,
            ease: 'power3.inOut',
          },
        );
        timeout.current = window.setTimeout(
          contextSafe(() => {
            pending.current = null;
            gsap.set(scope.current, { autoAlpha: 0, pointerEvents: 'none' });
          }),
          8000,
        );
        return true;
      });
      navigate = cover;
      return () => {
        if (navigate === cover) navigate = undefined;
        clearTimeout(timeout.current);
      };
    },
    { scope },
  );
  useGSAP(
    () => {
      if (!pending.current || path !== pending.current) return;
      clearTimeout(timeout.current);
      pending.current = null;
      gsap.killTweensOf(`.${styles.sheet}`);
      gsap.to(`.${styles.sheet}`, {
        yPercent: -105,
        duration: 0.25,
        stagger: 0.025,
        ease: 'power3.inOut',
        onComplete: () => gsap.set(scope.current, { autoAlpha: 0, pointerEvents: 'none' }),
      });
    },
    { scope, dependencies: [path] },
  );
  return (
    <div ref={scope} className={styles.overlay} data-flow-route-transition aria-hidden="true">
      <div className={styles.sheet}>
        <span>YOUR WAY IN.</span>
        <strong>tikflow®</strong>
      </div>
      <div className={styles.sheet}>
        <span>SEE YOU THERE.</span>
        <strong>↗</strong>
      </div>
    </div>
  );
}
