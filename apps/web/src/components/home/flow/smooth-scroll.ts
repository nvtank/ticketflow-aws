'use client';
import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import Snap from 'lenis/snap';

/** One clock, one interpolation layer. Native touch and horizontal gestures stay native. */
export function useFlowScroll(scope: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = matchMedia('(min-width: 1000px) and (pointer: fine)');
    const html = document.documentElement;
    const previousBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    let lenis: Lenis | undefined;
    let snap: Snap | undefined;
    const tick = (seconds: number) => lenis?.raf(seconds * 1000);
    const dispose = () => {
      gsap.ticker.remove(tick);
      snap?.destroy();
      snap = undefined;
      lenis?.destroy();
      lenis = undefined;
    };
    const setup = () => {
      dispose();
      if (reduced.matches || !desktop.matches) return;
      lenis = new Lenis({
        autoRaf: false,
        lerp: 0.14,
        syncTouch: false,
        anchors: { offset: -100 },
        // Lenis already walks the event path. No repeated closest() queries per ancestor.
        prevent: (node) => node.getAttribute('role') === 'dialog',
        virtualScroll: ({ deltaX, deltaY, event }) => {
          if (Math.abs(deltaX) <= Math.abs(deltaY)) return true;
          return !event
            .composedPath()
            .some(
              (node) => node instanceof HTMLElement && node.classList.contains('tf-event-rail'),
            );
        },
      });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.lagSmoothing(0);
      gsap.ticker.add(tick, false, true);
      snap = new Snap(lenis, {
        type: 'proximity',
        distanceThreshold: '8%',
        debounce: 250,
        duration: 0.45,
        lerp: 0.18,
      });
      scope.current
        ?.querySelectorAll<HTMLElement>('[data-flow-snap]')
        .forEach((el) => snap?.addElement(el, { align: 'start' }));
    };
    const refresh = () => {
      lenis?.resize();
      snap?.resize();
    };
    setup();
    reduced.addEventListener('change', setup);
    desktop.addEventListener('change', setup);
    ScrollTrigger.addEventListener('refresh', refresh);
    let mounted = true;
    const category = scope.current?.querySelector<HTMLElement>('.tf-vibes');
    const warmup = category
      ? new IntersectionObserver(
          ([entry], observer) => {
            if (!entry?.isIntersecting) return;
            observer.disconnect();
            // Decode ahead of the pinned scene, rather than hitch on each newly revealed panel.
            category.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
              image.loading = 'eager';
              void image.decode().catch(() => undefined);
            });
          },
          { rootMargin: '100% 0px' },
        )
      : undefined;
    if (category) warmup?.observe(category);
    document.fonts.ready.then(() => {
      if (mounted) ScrollTrigger.refresh();
    });
    return () => {
      mounted = false;
      warmup?.disconnect();
      dispose();
      gsap.ticker.lagSmoothing(500, 33);
      html.style.scrollBehavior = previousBehavior;
      reduced.removeEventListener('change', setup);
      desktop.removeEventListener('change', setup);
      ScrollTrigger.removeEventListener('refresh', refresh);
    };
  }, [scope]);
}
