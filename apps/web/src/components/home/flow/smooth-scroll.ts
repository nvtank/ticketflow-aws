'use client';
import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

/** One clock, one interpolation layer. Native touch and horizontal gestures stay native. */
export function useFlowScroll(scope: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = matchMedia('(min-width: 1000px) and (pointer: fine)');
    const html = document.documentElement;
    const previousBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    let lenis: Lenis | undefined;
    const tick = (seconds: number) => lenis?.raf(seconds * 1000);
    const dispose = () => {
      gsap.ticker.remove(tick);
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
      gsap.ticker.add(tick, false, true);
    };
    const refresh = () => {
      lenis?.resize();
    };
    setup();
    reduced.addEventListener('change', setup);
    desktop.addEventListener('change', setup);
    ScrollTrigger.addEventListener('refresh', refresh);
    let mounted = true;
    // Async event results above the pinned scenes change their document offsets.
    // Observe that section only: observing the pin spacers would refresh in a loop.
    let layoutFrame = 0;
    let featuredWidth = -1;
    let featuredHeight = -1;
    const featured = scope.current?.querySelector<HTMLElement>('.tf-featured');
    const layoutObserver = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width === featuredWidth && height === featuredHeight) return;
      featuredWidth = width;
      featuredHeight = height;
      if (!layoutFrame) {
        layoutFrame = requestAnimationFrame(() => {
          layoutFrame = 0;
          if (mounted) ScrollTrigger.refresh();
        });
      }
    });
    if (featured) layoutObserver.observe(featured);
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
      cancelAnimationFrame(layoutFrame);
      layoutObserver.disconnect();
      warmup?.disconnect();
      dispose();
      html.style.scrollBehavior = previousBehavior;
      reduced.removeEventListener('change', setup);
      desktop.removeEventListener('change', setup);
      ScrollTrigger.removeEventListener('refresh', refresh);
    };
  }, [scope]);
}
