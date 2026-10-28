'use client';

import { useEffect, useRef } from 'react';
import { FlowMark } from './primitives';

/** CSS starts at first paint; hydration never hides an already visible homepage. */
export function TicketIntro() {
  const overlay = useRef<HTMLDivElement>(null);
  const skip = useRef<() => void>(() => {});
  useEffect(() => {
    const element = overlay.current;
    if (!element) return;
    const root = document.documentElement;
    const hero = element.closest('.tf-home')?.querySelector<HTMLElement>('.tf-hero');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const finish = () => {
      root.dataset.tfIntro = 'done';
      element.dataset.phase = 'ready';
      if (hero) hero.dataset.introReady = 'true';
      window.dispatchEvent(new Event('tikflow:intro-complete'));
    };
    skip.current = finish;
    if (root.dataset.tfIntro !== 'playing' || reduced.matches) {
      finish();
      return;
    }
    element.dataset.phase = 'loading';
    if (hero) hero.dataset.introReady = 'false';
    const onEnd = (event: AnimationEvent) => {
      if (event.animationName === 'tf-intro-exit') finish();
    };
    const onPreference = () => {
      if (reduced.matches) finish();
    };
    const elapsed = performance.now() - Number(root.dataset.tfIntroStarted || 0);
    const timer = window.setTimeout(finish, Math.max(0, 1800 - elapsed));
    element.addEventListener('animationend', onEnd);
    reduced.addEventListener('change', onPreference);
    return () => {
      clearTimeout(timer);
      element.removeEventListener('animationend', onEnd);
      reduced.removeEventListener('change', onPreference);
      skip.current = () => {};
    };
  }, []);
  return (
    <div className="tf-intro" ref={overlay} data-phase="idle" aria-label="Welcome to TikFlow">
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
          <span>READY WHEN YOU ARE</span>
          <strong>
            LET’S GO<small>↗</small>
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
