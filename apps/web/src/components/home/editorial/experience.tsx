'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function EditorialExperience({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let lenis: Lenis | undefined;
    const tick = (time: number) => lenis?.raf(time * 1000);
    const setup = () => {
      gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = undefined;
      if (media.matches) return;
      lenis = new Lenis({
        duration: 1.15,
        smoothWheel: true,
        syncTouch: false,
        anchors: { offset: -100 },
        prevent: (node) => !!node.closest('[role="dialog"], [data-lenis-prevent]'),
      });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(tick);
    };
    const root = document.documentElement;
    const oldScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    setup();
    media.addEventListener('change', setup);
    return () => {
      media.removeEventListener('change', setup);
      gsap.ticker.remove(tick);
      lenis?.destroy();
      root.style.scrollBehavior = oldScrollBehavior;
    };
  }, []);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-ed-enter]', {
          y: 45,
          autoAlpha: 0,
          stagger: 0.12,
          duration: 1.25,
          ease: 'power4.out',
          clearProps: 'opacity,visibility,transform',
        });
        gsap.to('[data-ed-progress]', {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: scope.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
          },
        });
        gsap.fromTo(
          '[data-ed-word]',
          { opacity: 0.14 },
          {
            opacity: 1,
            stagger: 0.12,
            ease: 'none',
            scrollTrigger: {
              trigger: '[data-ed-statement]',
              start: 'top 80%',
              end: 'bottom 40%',
              scrub: true,
            },
          },
        );
        gsap.utils.toArray<HTMLElement>('[data-ed-reveal]').forEach((element) => {
          gsap.from(element, {
            y: 42,
            opacity: 0.25,
            duration: 1.1,
            ease: 'power4.out',
            scrollTrigger: { trigger: element, start: 'top 90%', once: true },
          });
        });
        gsap.utils.toArray<HTMLElement>('[data-ed-photo]').forEach((frame) => {
          gsap.fromTo(
            frame,
            { scale: 0.94 },
            {
              scale: 1,
              ease: 'none',
              scrollTrigger: { trigger: frame, start: 'top bottom', end: 'top 25%', scrub: 0.8 },
            },
          );
          gsap.fromTo(
            frame.querySelector('img'),
            { yPercent: -5, scale: 1.13 },
            {
              yPercent: 5,
              scale: 1.13,
              ease: 'none',
              scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
            },
          );
        });
        const ticker = scope.current?.querySelector<HTMLElement>('[data-ed-ticker]');
        if (ticker) {
          const setSkew = gsap.quickTo(ticker, 'skewX', { duration: 0.45, ease: 'power3.out' });
          let decay: gsap.core.Tween | undefined;
          ScrollTrigger.create({
            trigger: ticker,
            start: 'top bottom',
            end: 'bottom top',
            onUpdate: (self) => {
              setSkew(gsap.utils.clamp(-6, 6, self.getVelocity() / 250));
              decay?.kill();
              decay = gsap.delayedCall(0.15, () => setSkew(0));
            },
          });
          gsap.to(ticker, {
            xPercent: -22,
            ease: 'none',
            scrollTrigger: {
              trigger: ticker.parentElement,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.6,
            },
          });
          return () => decay?.kill();
        }
      });
      media.add('(min-width: 761px) and (prefers-reduced-motion: no-preference)', () => {
        gsap.to('[data-ed-hero-image]', {
          scale: 1.12,
          ease: 'none',
          scrollTrigger: {
            trigger: '[data-ed-hero]',
            start: 'top top',
            end: 'bottom top',
            scrub: 0.6,
          },
        });
        gsap.to('[data-ed-hero-copy]', {
          yPercent: -8,
          opacity: 0.35,
          ease: 'none',
          scrollTrigger: {
            trigger: '[data-ed-curtain]',
            start: 'top bottom',
            end: 'top top',
            scrub: true,
          },
        });
      });
      return () => media.revert();
    },
    { scope },
  );
  return (
    <div ref={scope} className="editorial-home">
      <div data-ed-progress className="ed-progress" aria-hidden="true" />
      <svg className="ed-grain" aria-hidden="true">
        <filter id="ed-film-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".76"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#ed-film-grain)" />
      </svg>
      {children}
    </div>
  );
}
