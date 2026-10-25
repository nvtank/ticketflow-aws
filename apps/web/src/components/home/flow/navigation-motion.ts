'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

/** One context owns the header's native event callbacks; the portaled menu has its own owner. */
export function useNavigationMotion(
  nav: RefObject<HTMLElement | null>,
  menuOpen: boolean,
  searchOpen: boolean,
) {
  const expanded = useRef(false);
  const api = useRef<{ show: () => void; toggle: (open: boolean) => void } | null>(null);
  const reveal = useCallback(() => api.current?.show(), []);
  useEffect(() => {
    expanded.current = menuOpen || searchOpen;
    api.current?.toggle(menuOpen);
    if (expanded.current) api.current?.show();
  }, [menuOpen, searchOpen]);

  useGSAP(
    (context, contextSafe) => {
      const element = nav.current;
      if (!element || !contextSafe) return;
      const shell = element.querySelector<HTMLElement>('.tf-nav-shell')!;
      const linkGroup = element.querySelector<HTMLElement>('.tf-nav-links')!;
      const indicator = element.querySelector<HTMLElement>('.tf-nav-hover')!;
      const progress = element.querySelector<HTMLElement>('.tf-nav-travel')!;
      const brand = element.querySelector<HTMLElement>('.tf-brand')!;
      const emblem = element.querySelector<HTMLElement>('.tf-nav-emblem')!;
      const lines = element.querySelectorAll('.tf-menu-lines span');
      const reduced = matchMedia('(prefers-reduced-motion: reduce)');
      const fine = matchMedia('(pointer: fine)');
      let lastY = window.scrollY;
      let compact: boolean | undefined;
      let hidden = false;
      let raf = 0;
      let maxScroll = 1;
      let entered = false;
      const duration = (seconds: number) => (reduced.matches ? 0 : seconds);
      const show = contextSafe(() => {
        hidden = false;
        element.dataset.hidden = 'false';
        gsap.to(element, {
          yPercent: 0,
          duration: duration(0.55),
          ease: 'power3.out',
          overwrite: 'auto',
        });
      });
      api.current = {
        show,
        toggle: contextSafe((open: boolean) => {
          gsap.to(lines[0]!, {
            y: open ? 3 : 0,
            rotation: open ? 45 : 0,
            duration: duration(0.35),
            ease: 'power3.out',
            overwrite: true,
          });
          gsap.to(lines[1]!, {
            y: open ? -3 : 0,
            rotation: open ? -45 : 0,
            duration: duration(0.35),
            ease: 'power3.out',
            overwrite: true,
          });
        }),
      };
      const update = contextSafe(() => {
        raf = 0;
        const y = window.scrollY;
        const nextCompact = y > 70;
        if (compact !== nextCompact) {
          compact = nextCompact;
          element.dataset.scrolled = String(compact);
          gsap.to(shell, {
            scale: compact && fine.matches && !reduced.matches ? 0.965 : 1,
            backgroundColor: compact ? '#0a0d17f2' : '#0a0d17aa',
            duration: duration(0.7),
            ease: 'power3.out',
            overwrite: 'auto',
          });
        }
        const delta = y - lastY;
        const protectedFocus =
          element.contains(document.activeElement) || element.matches(':hover');
        if (Math.abs(delta) > 7 || y < 100) {
          const nextHidden =
            !reduced.matches && !expanded.current && !protectedFocus && y > 500 && delta > 0;
          if (nextHidden !== hidden) {
            hidden = nextHidden;
            element.dataset.hidden = String(hidden);
            gsap.to(element, {
              yPercent: hidden ? -155 : 0,
              duration: duration(hidden ? 0.4 : 0.65),
              ease: 'power3.out',
              overwrite: 'auto',
            });
          }
          lastY = y;
        }
        progress.style.transform = `scaleX(${Math.min(1, Math.max(0, y / maxScroll))})`;
      });
      const schedule = () => {
        if (!raf) raf = requestAnimationFrame(update);
      };
      const measure = () => {
        maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
        schedule();
      };
      const resize = new ResizeObserver(measure);
      resize.observe(document.body);
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', measure);
      measure();

      const playEntrance = contextSafe(() => {
        if (entered) return;
        entered = true;
        if (reduced.matches) return;
        gsap.fromTo(
          element,
          { y: -90, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: element.dataset.variant === 'interior' ? 0.6 : 2,
            ease: 'power4.out',
            clearProps: 'opacity',
          },
        );
        gsap.fromTo(
          emblem,
          { rotation: -130, scale: 0.6 },
          { rotation: 0, scale: 1, duration: 1.5, ease: 'power3.out' },
        );
      });
      const intro = document.querySelector<HTMLElement>('.tf-intro');
      if (!intro || intro.dataset.phase === 'ready' || reduced.matches) playEntrance();
      // The intro dispatches this synchronously inside its GSAP context. Keep the
      // header a separate owner instead of recording it as the intro's child.
      const introReady = () => context.ignore(playEntrance);
      window.addEventListener('tikflow:intro-complete', introReady);

      const handlers: (() => void)[] = [];
      const moveHighlight = contextSafe((link: HTMLElement) => {
        gsap.to(indicator, {
          x: link.offsetLeft,
          y: link.offsetTop,
          width: link.offsetWidth,
          height: link.offsetHeight,
          autoAlpha: 1,
          duration: duration(0.38),
          ease: 'power3.out',
          overwrite: true,
        });
      });
      element.querySelectorAll<HTMLElement>('[data-nav-link]').forEach((link) => {
        const roll = link.querySelector<HTMLElement>('.tf-nav-roll')!;
        const enter = contextSafe(() => {
          moveHighlight(link);
          gsap.to(roll, {
            yPercent: -50,
            duration: duration(0.4),
            ease: 'power3.out',
            overwrite: true,
          });
        });
        const leave = contextSafe(() => {
          gsap.to(roll, {
            yPercent: 0,
            duration: duration(0.4),
            ease: 'power3.out',
            overwrite: true,
          });
        });
        link.addEventListener('pointerenter', enter);
        link.addEventListener('focus', enter);
        link.addEventListener('pointerleave', leave);
        link.addEventListener('blur', leave);
        handlers.push(() => {
          link.removeEventListener('pointerenter', enter);
          link.removeEventListener('focus', enter);
          link.removeEventListener('pointerleave', leave);
          link.removeEventListener('blur', leave);
        });
      });
      const hideHighlight = contextSafe((event: PointerEvent | FocusEvent) => {
        if (
          event.type === 'focusout' &&
          linkGroup.contains((event as FocusEvent).relatedTarget as Node)
        )
          return;
        gsap.to(indicator, { autoAlpha: 0, duration: duration(0.25), overwrite: true });
      });
      linkGroup.addEventListener('pointerleave', hideHighlight);
      linkGroup.addEventListener('focusout', hideHighlight);

      element.querySelectorAll<HTMLElement>('[data-nav-magnetic]').forEach((button) => {
        let rect = button.getBoundingClientRect();
        const x = gsap.quickTo(button, 'x', { duration: 0.3, ease: 'power3.out' });
        const y = gsap.quickTo(button, 'y', { duration: 0.3, ease: 'power3.out' });
        const enter = () => {
          rect = button.getBoundingClientRect();
        };
        const move = (event: PointerEvent) => {
          if (!fine.matches || reduced.matches) return;
          x((event.clientX - rect.left - rect.width / 2) * 0.16);
          y((event.clientY - rect.top - rect.height / 2) * 0.2);
        };
        const leave = () => {
          x(0);
          y(0);
        };
        button.addEventListener('pointerenter', enter);
        button.addEventListener('pointermove', move);
        button.addEventListener('pointerleave', leave);
        handlers.push(() => {
          button.removeEventListener('pointerenter', enter);
          button.removeEventListener('pointermove', move);
          button.removeEventListener('pointerleave', leave);
        });
      });
      const spin = contextSafe(() => {
        if (!reduced.matches)
          gsap.to(emblem, {
            rotation: 180,
            scale: 0.9,
            duration: 0.65,
            ease: 'power3.out',
            overwrite: true,
          });
      });
      const reset = contextSafe(() => {
        gsap.to(emblem, {
          rotation: 0,
          scale: 1,
          duration: duration(0.8),
          ease: 'power3.out',
          overwrite: true,
        });
      });
      brand.addEventListener('pointerenter', spin);
      brand.addEventListener('pointerleave', reset);
      const preference = contextSafe(() => {
        compact = undefined;
        if (reduced.matches) {
          gsap.killTweensOf([element, shell, emblem]);
          gsap.set(element, { y: 0, yPercent: 0, opacity: 1 });
          gsap.set(emblem, { rotation: 0, scale: 1 });
          hidden = false;
          element.dataset.hidden = 'false';
        }
        update();
      });
      reduced.addEventListener('change', preference);
      return () => {
        api.current = null;
        cancelAnimationFrame(raf);
        resize.disconnect();
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', measure);
        window.removeEventListener('tikflow:intro-complete', introReady);
        linkGroup.removeEventListener('pointerleave', hideHighlight);
        linkGroup.removeEventListener('focusout', hideHighlight);
        brand.removeEventListener('pointerenter', spin);
        brand.removeEventListener('pointerleave', reset);
        reduced.removeEventListener('change', preference);
        handlers.forEach((dispose) => dispose());
      };
    },
    { scope: nav },
  );

  return reveal;
}
