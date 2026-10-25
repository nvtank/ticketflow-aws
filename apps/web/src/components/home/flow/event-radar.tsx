'use client';

import { Children, useRef, useState, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ArrowLeft, ArrowRight, MoveHorizontal } from 'lucide-react';
import { FLOW_MOTION } from './motion-tokens';

/** Stable slots carry native scrolling; the inner cards own the fan transforms. */
export function EventRadar({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  const scope = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const controls = useRef<(index: number, instant?: boolean) => void>(() => {});
  const cancelMotion = useRef<() => void>(() => {});
  const activeRef = useRef(items.length > 2 ? 1 : 0);
  const [active, setActive] = useState(items.length > 2 ? 1 : 0);
  const drag = useRef({ active: false, start: 0, left: 0, moved: false });
  const { contextSafe } = useGSAP({ scope });

  useGSAP(
    () => {
      const viewport = rail.current;
      if (!viewport) return;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)');
      const touch = matchMedia('(pointer: coarse)');
      const slots = Array.from(viewport.querySelectorAll<HTMLElement>('.tf-radar-slot'));
      const cards = slots.map((slot) => slot.querySelector<HTMLElement>('.tf-radar-card')!);
      let geometry: { center: number; width: number }[] = [];
      let viewportWidth = 0;
      let maxScroll = 1;
      let raf = 0;
      let alive = true;
      let positioned = false;
      let navigation: gsap.core.Tween | undefined;
      const render = () => {
        raf = 0;
        const center = viewport.scrollLeft + viewportWidth / 2;
        let nearest = 0;
        let nearestDistance = Infinity;
        geometry.forEach((slot, index) => {
          const delta = (slot.center - center) / Math.max(slot.width, 1);
          const distance = Math.abs(delta);
          if (distance < nearestDistance) {
            nearest = index;
            nearestDistance = distance;
          }
          const card = cards[index];
          if (!card) return;
          const depth = Math.min(distance, 2.5);
          const turn = gsap.utils.clamp(-2, 2, delta);
          const rotation = reduced.matches ? 0 : turn * (touch.matches ? 7 : 12);
          const rotationY = reduced.matches || touch.matches ? 0 : -turn * 20;
          const y = reduced.matches ? 0 : depth * (touch.matches ? 25 : 48);
          const z = reduced.matches ? 0 : -depth * 110;
          const scale = reduced.matches ? 1 : 1 - Math.min(depth * 0.095, 0.2);
          card.style.transform = `perspective(1400px) translate3d(0,${y}px,${z}px) rotateY(${rotationY}deg) rotateZ(${rotation}deg) scale(${scale})`;
          slots[index]!.style.zIndex = String(20 - Math.round(depth * 5));
        });
        // Set the active marker after the nearest card is known, independent of DOM order.
        cards.forEach((card, index) => {
          card.dataset.active = String(index === nearest);
        });
        if (nearest !== activeRef.current) {
          activeRef.current = nearest;
          setActive(nearest);
        }
        if (progress.current) {
          progress.current.style.transform = `scaleX(${items.length === 1 ? 1 : 0.12 + Math.min(1, viewport.scrollLeft / maxScroll) * 0.88})`;
        }
      };
      const schedule = () => {
        if (!raf) raf = requestAnimationFrame(render);
      };
      const cancel = () => {
        navigation?.kill();
        navigation = undefined;
        viewport.style.scrollSnapType = '';
      };
      cancelMotion.current = cancel;
      const measure = () => {
        viewportWidth = viewport.clientWidth;
        maxScroll = Math.max(1, viewport.scrollWidth - viewportWidth);
        geometry = slots.map((slot) => ({
          center: slot.offsetLeft + slot.offsetWidth / 2,
          width: slot.offsetWidth,
        }));
        if (!positioned && geometry.length) {
          viewport.scrollLeft = Math.max(
            0,
            (geometry[activeRef.current]?.center ?? 0) - viewportWidth / 2,
          );
          positioned = true;
        }
        render();
      };
      controls.current = contextSafe((index, instant = false) => {
        const target = Math.max(0, Math.min(index, slots.length - 1));
        const item = geometry[target];
        if (!item) return;
        cancel();
        const left = Math.max(0, item.center - viewportWidth / 2);
        if (reduced.matches || instant) {
          viewport.scrollLeft = left;
          schedule();
          return;
        }
        viewport.style.scrollSnapType = 'none';
        navigation = gsap.to(viewport, {
          scrollLeft: left,
          duration: FLOW_MOTION.reveal,
          ease: 'power3.inOut',
          overwrite: true,
          onComplete: () => {
            viewport.style.scrollSnapType = '';
            navigation = undefined;
          },
        });
      });
      const resize = new ResizeObserver(measure);
      resize.observe(viewport);
      if (slots[0]) resize.observe(slots[0]);
      viewport.addEventListener('scroll', schedule, { passive: true });
      viewport.addEventListener('wheel', cancel, { passive: true });
      reduced.addEventListener('change', measure);
      touch.addEventListener('change', measure);
      void document.fonts.ready.then(() => {
        if (alive) measure();
      });
      measure();
      return () => {
        alive = false;
        cancel();
        cancelAnimationFrame(raf);
        resize.disconnect();
        viewport.removeEventListener('scroll', schedule);
        viewport.removeEventListener('wheel', cancel);
        reduced.removeEventListener('change', measure);
        touch.removeEventListener('change', measure);
        controls.current = () => {};
        cancelMotion.current = () => {};
      };
    },
    { scope, dependencies: [items.length], revertOnUpdate: true },
  );

  return (
    <div className="tf-radar" ref={scope}>
      <div className="tf-radar-toolbar">
        <span>
          <MoveHorizontal size={16} aria-hidden="true" /> DRAG TO FIND YOUR NIGHT
        </span>
        <div className="tf-controls">
          <button
            className="tf-icon"
            aria-label="Previous events"
            disabled={active === 0}
            onClick={() => controls.current(activeRef.current - 1)}
          >
            <ArrowLeft />
          </button>
          <button
            className="tf-icon"
            aria-label="Next events"
            disabled={active === items.length - 1}
            onClick={() => controls.current(activeRef.current + 1)}
          >
            <ArrowRight />
          </button>
        </div>
      </div>
      <div className="tf-radar-stage" data-reveal>
        <div className="tf-radar-orbit" aria-hidden="true">
          <span />
          <span />
          <i>+</i>
        </div>
        <div
          ref={rail}
          className="tf-event-rail tf-radar-rail"
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label="Event collection, use arrow keys to browse"
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const target =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? items.length - 1
                  : activeRef.current + (event.key === 'ArrowRight' ? 1 : -1);
            controls.current(target);
          }}
          onFocusCapture={(event) => {
            const slot = (event.target as HTMLElement).closest<HTMLElement>('.tf-radar-slot');
            if (slot && (event.target as HTMLElement).matches(':focus-visible'))
              controls.current(Number(slot.dataset.index), true);
          }}
          onPointerDown={(event) => {
            cancelMotion.current();
            if (event.pointerType !== 'mouse' || event.button !== 0) return;
            drag.current = {
              active: true,
              start: event.clientX,
              left: event.currentTarget.scrollLeft,
              moved: false,
            };
          }}
          onPointerMove={(event) => {
            const state = drag.current;
            if (!state.active) return;
            const delta = event.clientX - state.start;
            if (Math.abs(delta) <= 6) return;
            state.moved = true;
            event.currentTarget.style.scrollSnapType = 'none';
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.scrollLeft = state.left - delta;
          }}
          onPointerUp={(event) => {
            drag.current.active = false;
            event.currentTarget.style.scrollSnapType = '';
          }}
          onPointerCancel={(event) => {
            drag.current.active = false;
            event.currentTarget.style.scrollSnapType = '';
          }}
          onLostPointerCapture={() => {
            drag.current.active = false;
          }}
          onPointerLeave={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId))
              drag.current.active = false;
          }}
          onClickCapture={(event) => {
            if (drag.current.moved) {
              event.preventDefault();
              drag.current.moved = false;
            }
          }}
          onDragStart={(event) => event.preventDefault()}
        >
          {items.map((item, index) => (
            <div
              className="tf-radar-slot"
              key={index}
              data-index={index}
              role="group"
              aria-roledescription="slide"
              aria-label={`Event ${index + 1} of ${items.length}`}
            >
              <div className="tf-radar-card">
                <span className="tf-radar-card-index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')} / ON THE LIST
                </span>
                {item}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="tf-radar-footer">
        <span aria-live="polite" aria-atomic="true">
          <strong>{String(active + 1).padStart(2, '0')}</strong> /{' '}
          {String(items.length).padStart(2, '0')}
        </span>
        <div className="tf-rail-progress">
          <span ref={progress} />
        </div>
        <span className="tf-radar-footer-note">FOLLOW THE FEELING ↗</span>
      </div>
    </div>
  );
}
