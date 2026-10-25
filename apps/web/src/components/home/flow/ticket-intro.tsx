'use client';
import { useRef } from 'react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { FLOW_MOTION } from './motion-tokens';
import { FlowMark } from './primitives';
gsap.registerPlugin(Flip, SplitText, useGSAP, ScrollTrigger);

export function TicketIntro() {
  const overlay = useRef<HTMLDivElement>(null);
  const skip = useRef<() => void>(() => {});
  useGSAP(
    (context) => {
      const element = overlay.current;
      if (!element) return;
      const initialize = context.add('initializeIntro', () => {
        const hero = element.closest('.tf-home')?.querySelector<HTMLElement>('.tf-hero');
        if (!hero) return false;
        const mm = gsap.matchMedia();
        mm.add('(prefers-reduced-motion: no-preference)', (mediaContext) => {
          // Tween callbacks already execute in this child context. Re-entering an
          // ancestor context here would add it to the child and create a cycle.
          const mediaSafe = (callback: () => void) =>
            mediaContext.add('introCallback', callback) as () => void;
          let active = true;
          let opening = false;
          let entered = false;
          let ready = false;
          let finished = false;
          let expansion: gsap.core.Timeline | undefined;
          let morph: gsap.core.Tween | gsap.core.Timeline | undefined;
          const abort = new AbortController();
          const ticket = element.querySelector<HTMLElement>('.tf-intro-ticket')!;
          const percentage = element.querySelector<HTMLElement>('[data-intro-percent]')!;
          const line = element.querySelector<HTMLElement>('.tf-intro-meter span')!;
          const title = SplitText.create(hero.querySelectorAll('[data-hero-line]'), {
            type: 'chars',
            charsClass: 'tf-hero-char',
            aria: 'auto',
          });
          const chars = title.chars;
          const finish = mediaSafe(() => {
            if (!active || finished) return;
            finished = true;
            abort.abort();
            clearTimeout(deadline);
            gsap.set(element, { display: 'none' });
            element.dataset.phase = 'ready';
            try {
              sessionStorage.setItem('tikflow-ticket-intro-v5', 'seen');
            } catch {
              /* Private storage may be unavailable. */
            }
            hero.dataset.introReady = 'true';
            gsap.set(chars, { clearProps: 'opacity,transform' });
            gsap.set(
              hero.querySelectorAll(
                '[data-ticket-enter], .tf-hero-meta, .tf-hero-bottom, .tf-hero-foot',
              ),
              { clearProps: 'opacity,transform' },
            );
            window.dispatchEvent(new Event('tikflow:intro-complete'));
            ScrollTrigger.refresh();
          });
          const textEntrance = () => {
            const master = gsap.timeline();
            master.fromTo(
              hero.querySelector('[data-hero-background]'),
              { opacity: 0 },
              { opacity: 0.32, duration: FLOW_MOTION.entrance },
              0,
            );
            hero.querySelectorAll('[data-hero-line]').forEach((line, index) => {
              master.fromTo(
                line.querySelectorAll('.tf-hero-char'),
                { yPercent: 110, rotationX: -35, opacity: 0 },
                {
                  yPercent: 0,
                  rotationX: 0,
                  opacity: 1,
                  stagger: 0.018,
                  duration: FLOW_MOTION.entrance,
                  ease: 'power4.out',
                  clearProps: 'opacity,transform',
                },
                0.15 + index * 0.3,
              );
            });
            master.fromTo(
              hero.querySelectorAll('[data-ticket-enter]'),
              { y: 70, rotationX: 22, scale: 0.8, opacity: 0 },
              {
                y: 0,
                rotationX: 0,
                scale: 1,
                opacity: 1,
                duration: FLOW_MOTION.entrance,
                stagger: 0.12,
                ease: 'power3.out',
                clearProps: 'opacity,transform',
              },
              0.7,
            );
            const path = hero.querySelector<SVGPathElement>('[data-hero-path]');
            if (path) {
              const length = path.getTotalLength();
              master.fromTo(
                path,
                { strokeDasharray: length, strokeDashoffset: length },
                { strokeDashoffset: 0, duration: FLOW_MOTION.ticketMorph, ease: 'power2.out' },
                0.9,
              );
            }
            master.fromTo(
              hero.querySelectorAll('.tf-hero-meta, .tf-hero-bottom, .tf-hero-foot'),
              { opacity: 0, y: 18 },
              {
                opacity: 1,
                y: 0,
                duration: FLOW_MOTION.entrance,
                stagger: 0.08,
                clearProps: 'opacity,transform',
              },
              1.1,
            );
            return master;
          };
          let returning = false;
          try {
            returning = sessionStorage.getItem('tikflow-ticket-intro-v5') === 'seen';
          } catch {
            /* Private storage may be unavailable. */
          }
          if (returning || window.scrollY > 40) {
            window.dispatchEvent(new Event('tikflow:intro-complete'));
            element.dataset.phase = 'ready';
            hero.dataset.introReady = 'true';
            return () => {
              active = false;
              title.revert();
            };
          }
          element.dataset.phase = 'loading';
          hero.dataset.introReady = 'false';
          gsap.set(element, { display: 'block' });
          gsap.set(chars, { opacity: 0 });
          const reveal = mediaSafe(() => {
            if (!active || opening) return;
            opening = true;
            clearTimeout(deadline);
            element.dataset.phase = 'expanding';
            const timeline = gsap.timeline({ onComplete: finish });
            expansion = timeline;
            timeline
              .to(
                '.tf-intro-stub, .tf-intro-caption, .tf-intro-skip',
                { opacity: 0, y: 20, duration: 0.25 },
                0,
              )
              .to('.tf-intro-print', { opacity: 0, duration: 0.25 }, 0)
              .add(
                mediaSafe(() => {
                  const first = Flip.getState(ticket);
                  const rect = hero.getBoundingClientRect();
                  gsap.set(ticket, {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                    xPercent: 0,
                    yPercent: 0,
                    rotation: 0,
                    borderRadius: 0,
                  });
                  morph = Flip.from(first, {
                    duration: FLOW_MOTION.ticketMorph,
                    scale: true,
                    ease: 'power3.inOut',
                    absolute: true,
                  });
                }),
                0.2,
              )
              .to('.tf-intro-backdrop', { opacity: 0, duration: 0.4 }, 0.65)
              .add(textEntrance(), 1.5)
              .to(ticket, { opacity: 0, duration: 0.4 }, 2);
          });
          const completeAsset = mediaSafe(() => {
            if (!active || opening) return;
            completed++;
            const value = Math.round((completed / 2) * 100);
            // Progress reports the two actual font readiness tasks; no simulated image loading.
            percentage.textContent = String(value).padStart(3, '0');
            gsap.to(line, { scaleX: value / 100, duration: 0.25, overwrite: true });
            if (completed === 2) {
              ready = true;
              if (entered) reveal();
            }
          });
          let completed = 0;
          const deadline = window.setTimeout(() => {
            if (active) reveal();
          }, 3000);
          skip.current = mediaSafe(() => {
            if (!active) return;
            opening = true;
            expansion?.kill();
            morph?.kill();
            gsap.killTweensOf(ticket);
            finish();
          });
          const cancelForScroll = () => {
            if (window.scrollY > 40) skip.current();
          };
          window.addEventListener('scroll', cancelForScroll, {
            passive: true,
            signal: abort.signal,
          });
          gsap.fromTo(
            ticket,
            { yPercent: -42, rotation: -12, opacity: 0, scale: 0.85 },
            {
              yPercent: -50,
              rotation: -7,
              opacity: 1,
              scale: 1,
              duration: 0.5,
              ease: 'power3.out',
              onComplete: () => {
                entered = true;
                if (ready) reveal();
              },
            },
          );
          // Font readiness is bounded; optimized photography can decode independently.
          document.fonts
            .load('400 64px "Anton"', 'DON’T JUST WATCH. BE PART OF IT.')
            .then(completeAsset, completeAsset);
          document.fonts
            .load('400 16px "Be Vietnam Pro"', 'Explore events')
            .then(completeAsset, completeAsset);
          return () => {
            active = false;
            clearTimeout(deadline);
            abort.abort();
            title.revert();
            gsap.set(element, { display: 'none' });
            hero.dataset.introReady = 'true';
          };
        });
        return true;
      });
      // Server component slots can hydrate after this client island. Wait for actual DOM,
      // rather than consuming the intro session before the hero exists.
      const observer = new MutationObserver(() => {
        if (initialize()) observer.disconnect();
      });
      if (!initialize())
        observer.observe(element.closest('.tf-home') || element.parentElement!, {
          childList: true,
          subtree: true,
        });
      return () => {
        observer.disconnect();
        // The useGSAP context owns and reverts its matchMedia child.
      };
    },
    { scope: overlay },
  );
  return (
    <div
      className="tf-intro"
      ref={overlay}
      data-phase="idle"
      role="status"
      aria-label="Preparing your TikFlow experience"
    >
      <div className="tf-intro-backdrop" />
      <div className="tf-intro-ticket">
        <div className="tf-intro-gradient" aria-hidden="true">
          <div className="tf-gradient-mint" />
          <div className="tf-gradient-lilac" />
        </div>
        <div className="tf-intro-print">
          <span>
            <FlowMark />
            tikflow®
          </span>
          <div>
            YOUR
            <br />
            WAY IN<span>↗</span>
          </div>
          <small>ONE TICKET. EVERY POSSIBILITY.</small>
        </div>
        <div className="tf-intro-stub">
          <span>OPENING YOUR EXPERIENCE</span>
          <strong>
            <span data-intro-percent>000</span>
            <small>%</small>
          </strong>
          <div className="tf-intro-meter">
            <span />
          </div>
          <div className="tf-intro-barcode" aria-hidden="true" />
        </div>
      </div>
      <span className="tf-intro-caption">THE INTERNET IS A STAGE.</span>
      <button className="tf-intro-skip" onClick={() => skip.current()}>
        Skip intro ↗
      </button>
    </div>
  );
}
