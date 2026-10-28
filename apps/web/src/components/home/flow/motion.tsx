'use client';
import { useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useFlowScroll } from './smooth-scroll';
import { FLOW_MOTION } from './motion-tokens';
import { TicketIntro } from './ticket-intro';
gsap.registerPlugin(ScrollTrigger, useGSAP);
export function FlowExperience({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useFlowScroll(root);
  useGSAP(
    (_context, contextSafe) => {
      if (!contextSafe) return;
      let media: gsap.MatchMedia | undefined;
      const initialize = contextSafe(() => {
        const mm = gsap.matchMedia();
        media = mm;
        mm.add('(prefers-reduced-motion: no-preference)', () => {
          gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) =>
            gsap.from(el, {
              y: 35,
              opacity: 0.15,
              duration: FLOW_MOTION.reveal,
              ease: 'power3.out',
              scrollTrigger: { trigger: el, start: 'top 88%', once: true },
              clearProps: 'opacity,transform',
            }),
          );
          gsap.to('.tf-progress', {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: 'bottom bottom',
              scrub: true,
            },
          });
          gsap.utils.toArray<HTMLElement>('[data-marquee]').forEach((el, i) => {
            const tween = gsap.fromTo(
              el,
              { xPercent: i ? -50 : 0 },
              {
                xPercent: i ? 0 : -50,
                duration: 35 + i * 10,
                ease: 'none',
                repeat: -1,
                paused: true,
              },
            );
            const speed = gsap.quickTo(tween, 'timeScale', { duration: 0.3 });
            const trigger = ScrollTrigger.create({
              trigger: el.parentElement,
              start: 'top bottom',
              end: 'bottom top',
              onToggle: (s) => {
                tween.paused(!s.isActive);
              },
              onUpdate: (s) => {
                speed(s.direction * (1 + Math.min(Math.abs(s.getVelocity()) / 1500, 2.5)));
              },
            });
            tween.paused(!trigger.isActive);
          });
          const pageLine = root.current?.querySelector<SVGPathElement>('[data-page-flow]');
          if (pageLine) {
            const length = pageLine.getTotalLength();
            gsap.fromTo(
              pageLine,
              { strokeDasharray: length, strokeDashoffset: length },
              {
                strokeDashoffset: 0,
                ease: 'none',
                scrollTrigger: {
                  trigger: root.current,
                  start: 'top top',
                  end: 'bottom bottom',
                  scrub: true,
                },
              },
            );
          }
          gsap.utils.toArray<SVGGeometryElement>('[data-energy-line]').forEach((el) => {
            const length = el.getTotalLength();
            gsap.fromTo(
              el,
              { strokeDasharray: length, strokeDashoffset: length },
              {
                strokeDashoffset: 0,
                ease: 'none',
                scrollTrigger: {
                  trigger: '.tf-energy-stage',
                  start: 'top 85%',
                  end: 'bottom 40%',
                  scrub: true,
                },
              },
            );
          });
          gsap.from('[data-energy-word]', {
            y: 80,
            rotationX: -25,
            opacity: 0,
            stagger: 0.12,
            duration: FLOW_MOTION.reveal,
            ease: 'power4.out',
            scrollTrigger: { trigger: '.tf-energy-title', start: 'top 85%', once: true },
          });
          const line = root.current?.querySelector<SVGPathElement>('[data-flow-line]');
          if (line) {
            const length = line.getTotalLength();
            gsap.fromTo(
              line,
              { strokeDasharray: length, strokeDashoffset: length },
              {
                strokeDashoffset: 0,
                ease: 'none',
                scrollTrigger: {
                  trigger: '.tf-interlude',
                  start: 'top 90%',
                  end: 'bottom 30%',
                  scrub: true,
                },
              },
            );
          }
          const cursor = root.current?.querySelector<HTMLElement>('.tf-cursor');
          const cursorX = cursor
            ? gsap.quickTo(cursor, 'x', { duration: 0.14, ease: 'power3.out' })
            : null;
          const cursorY = cursor
            ? gsap.quickTo(cursor, 'y', { duration: 0.14, ease: 'power3.out' })
            : null;
          const cursorOpacity = cursor ? gsap.quickTo(cursor, 'opacity', { duration: 0.15 }) : null;
          let cursorLabel = '';
          const fine = matchMedia('(pointer: fine)').matches;
          const pointer = (e: PointerEvent) => {
            if (e.pointerType !== 'mouse') return;
            const target = (e.target as HTMLElement).closest<HTMLElement>('[data-cursor]');
            if (cursor) {
              const label = target?.dataset.cursor || '';
              if (label !== cursorLabel) {
                cursor.textContent = label;
                cursorLabel = label;
                cursorOpacity?.(label ? 1 : 0);
              }
              cursorX?.(e.clientX);
              cursorY?.(e.clientY);
            }
          };
          if (fine) root.current?.addEventListener('pointermove', pointer, { passive: true });
          const magnets = fine ? gsap.utils.toArray<HTMLElement>('[data-magnetic]') : [];
          const moves = magnets.map((el) => {
            let rect = el.getBoundingClientRect();
            const x = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
            const y = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });
            const enter = () => {
              rect = el.getBoundingClientRect();
            };
            const move = (e: PointerEvent) => {
              if (e.pointerType !== 'mouse') return;
              x((e.clientX - rect.left - rect.width / 2) * 0.14);
              y((e.clientY - rect.top - rect.height / 2) * 0.2);
            };
            const leave = () => {
              x(0);
              y(0);
            };
            el.addEventListener('pointerenter', enter);
            el.addEventListener('pointermove', move);
            el.addEventListener('pointerleave', leave);
            return () => {
              el.removeEventListener('pointerenter', enter);
              el.removeEventListener('pointermove', move);
              el.removeEventListener('pointerleave', leave);
            };
          });
          return () => {
            root.current?.removeEventListener('pointermove', pointer);
            moves.forEach((fn) => fn());
            gsap.killTweensOf(magnets);
            if (cursor) gsap.killTweensOf(cursor);
          };
        });
        mm.add('(min-width: 1000px) and (prefers-reduced-motion: no-preference)', () => {
          gsap.to('.tf-energy-photo-a', {
            yPercent: -18,
            rotation: -4,
            ease: 'none',
            scrollTrigger: {
              trigger: '.tf-energy-stage',
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          });
          gsap.to('.tf-energy-photo-b', {
            yPercent: 18,
            rotation: 4,
            ease: 'none',
            scrollTrigger: {
              trigger: '.tf-energy-stage',
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          });
          const track = root.current?.querySelector<HTMLElement>('.tf-vibe-track');
          if (track) {
            gsap.set('.tf-vibe-window', { overflowX: 'hidden' });
            const viewport = track.parentElement!;
            const distance = () =>
              Math.max(
                0,
                track.scrollWidth -
                  viewport.clientWidth +
                  parseFloat(getComputedStyle(viewport).paddingLeft) * 2,
              );
            const progress = root.current?.querySelector('.tf-vibe-progress span');
            const setProgress = progress ? gsap.quickSetter(progress, 'scaleX') : undefined;
            const horizontal = gsap.to(track, {
              x: () => -distance(),
              ease: 'none',
              scrollTrigger: {
                trigger: '.tf-vibes',
                start: 'top top',
                end: () => `+=${distance() * FLOW_MOTION.horizontalDistance}`,
                id: 'flow-horizontal',
                pin: true,
                anticipatePin: 0,
                scrub: true,
                onToggle: (self) => {
                  track.style.willChange = self.isActive ? 'transform' : 'auto';
                },
                onUpdate: (self) => {
                  setProgress?.(0.15 + self.progress * 0.85);
                },
                invalidateOnRefresh: true,
              },
            });
            const angles = [-8, 7, -6, 9, -9, 6];
            gsap.utils.toArray<HTMLElement>('.tf-vibe-slot', track).forEach((slot, index) => {
              const card = slot.querySelector<HTMLElement>('.tf-vibe');
              if (!card) return;
              const angle = angles[index % angles.length] ?? 0;
              gsap.fromTo(
                card,
                { rotation: angle - 8, y: 24 },
                {
                  rotation: angle + 8,
                  y: -20,
                  ease: 'none',
                  scrollTrigger: {
                    trigger: slot,
                    containerAnimation: horizontal,
                    start: 'left right',
                    end: 'right left',
                    scrub: true,
                  },
                },
              );
            });
          }
          gsap
            .timeline({
              scrollTrigger: {
                trigger: '.tf-story',
                start: 'top top',
                end: '+=160%',
                pin: true,
                scrub: true,
                invalidateOnRefresh: true,
              },
            })
            .fromTo(
              '.tf-story-frame',
              { clipPath: 'inset(14% 29% 14% 29% round 8px)' },
              { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1 },
            )
            .from('.tf-story-copy > *', { y: 50, opacity: 0, stagger: 0.1, duration: 0.4 }, 0.65);
          gsap.to('.tf-wordmark', {
            xPercent: -8,
            ease: 'none',
            scrollTrigger: {
              trigger: '.tf-finale',
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          });
        });
      });
      // Let the first frame and ticket intro paint before measuring below-fold scenes.
      const timer = window.setTimeout(initialize, 150);
      return () => {
        clearTimeout(timer);
        media?.revert();
      };
    },
    { scope: root },
  );
  return (
    <div lang="en" className="tf-home" ref={root}>
      <div className="tf-progress" aria-hidden="true" />
      <svg
        className="tf-flow-rail"
        viewBox="0 0 20 600"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className="tf-rail-guide"
          d="M10 0V160C10 175 19 175 19 190S1 205 1 220S10 235 10 250V600"
        />
        <path data-page-flow d="M10 0V160C10 175 19 175 19 190S1 205 1 220S10 235 10 250V600" />
      </svg>
      <div className="tf-cursor" aria-hidden="true" />
      {children}
      <TicketIntro />
    </div>
  );
}
