'use client';
import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Each nested layer has exactly one owner: scroll → pointer → float → entrance. */
export function HeroInteractions() {
  const scope = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const hero = scope.current?.closest<HTMLElement>('.ch-hero');
      if (!hero) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const floats = Array.from(hero.querySelectorAll<HTMLElement>('[data-ticket-float]'));
        const loops = floats.map((node, i) =>
          gsap.to(node, {
            y: [-15, 22, -12][i],
            rotation: [2, -3, 1.5][i],
            rotationY: [4, -5, 3][i],
            duration: [3.6, 4.7, 3.1][i],
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            paused: true,
          }),
        );
        const ambient = gsap.to(hero.querySelector('.ch-light-purple'), {
          xPercent: 9,
          yPercent: 5,
          duration: 7,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          paused: true,
        });
        const allLoops = [...loops, ambient];
        let visible = true;
        const update = () =>
          allLoops.forEach((loop) =>
            visible && !document.hidden && hero.dataset.introReady !== 'false'
              ? loop.resume()
              : loop.pause(),
          );
        const observer = new IntersectionObserver(([entry]) => {
          visible = entry?.isIntersecting ?? false;
          update();
        });
        observer.observe(hero);
        window.addEventListener('tikflow:intro-complete', update);
        document.addEventListener('visibilitychange', update);
        const desktop = window.matchMedia('(min-width: 1000px)').matches;
        const tickets = hero.querySelectorAll('[data-ticket-scroll]');
        const scroll = gsap.timeline({
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
        });
        scroll
          .to(
            hero.querySelector('.ch-title-scroll'),
            { yPercent: desktop ? -24 : -8, scale: 0.94, ease: 'none' },
            0,
          )
          .to(
            hero.querySelector('[data-hero-background]'),
            { scale: 1.15, yPercent: 14, ease: 'none' },
            0,
          )
          .to(hero.querySelector('.ch-orbit'), { opacity: 0, ease: 'none' }, 0);
        if (desktop && tickets[0] && tickets[1] && tickets[2])
          scroll
            .to(tickets[0], { x: -130, y: -70, rotation: -12, scale: 0.8, ease: 'none' }, 0)
            .to(tickets[1], { x: 100, y: -180, rotation: 15, ease: 'none' }, 0)
            .to(tickets[2], { x: -40, y: 120, scale: 1.22, rotation: 12, ease: 'none' }, 0);
        return () => {
          observer.disconnect();
          window.removeEventListener('tikflow:intro-complete', update);
          document.removeEventListener('visibilitychange', update);
        };
      });
      mm.add(
        '(min-width: 1000px) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
        () => {
          const layers = Array.from(hero.querySelectorAll<HTMLElement>('[data-depth]')).map(
            (node) => ({
              depth: Number(node.dataset.depth),
              x: gsap.quickTo(node, 'x', { duration: 0.8, ease: 'power3.out' }),
              y: gsap.quickTo(node, 'y', { duration: 0.8, ease: 'power3.out' }),
              ry: gsap.quickTo(node, 'rotationY', { duration: 0.9, ease: 'power3.out' }),
            }),
          );
          let rect = hero.getBoundingClientRect();
          let documentTop = rect.top + window.scrollY;
          const measure = () => {
            rect = hero.getBoundingClientRect();
            documentTop = rect.top + window.scrollY;
          };
          const move = (e: PointerEvent) => {
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = ((e.clientY + window.scrollY - documentTop) / rect.height) * 2 - 1;
            layers.forEach((l) => {
              l.x(x * l.depth);
              l.y(y * l.depth * 0.55);
              l.ry(x * l.depth * 0.09);
            });
          };
          const leave = () =>
            layers.forEach((l) => {
              l.x(0);
              l.y(0);
              l.ry(0);
            });
          hero.addEventListener('pointerenter', measure);
          hero.addEventListener('pointermove', move);
          hero.addEventListener('pointerleave', leave);
          window.addEventListener('resize', measure);
          return () => {
            hero.removeEventListener('pointerenter', measure);
            hero.removeEventListener('pointermove', move);
            hero.removeEventListener('pointerleave', leave);
            window.removeEventListener('resize', measure);
          };
        },
      );
      return () => mm.revert();
    },
    { scope },
  );
  return <div ref={scope} aria-hidden="true" />;
}
