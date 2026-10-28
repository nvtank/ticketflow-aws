'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { FLOW_MOTION } from './motion-tokens';
import { Flip } from 'gsap/Flip';
import { ArrowUpRight, Check, RotateCw, Ticket } from 'lucide-react';
import { FlowImage, FlowLink, SectionLabel } from './primitives';
import { media } from './data';
gsap.registerPlugin(Flip, useGSAP);
export function DigitalTicket({
  compact = false,
  type = 'FAN PASS',
}: {
  compact?: boolean;
  type?: string;
}) {
  return (
    <div className={`tf-ticket ${compact ? 'tf-ticket-compact' : ''}`}>
      <div className="tf-ticket-cover">
        <FlowImage src={media.arena} sizes="(max-width: 700px) 90vw, 400px" />
        <span>tikflow®</span>
        <strong>
          AFTER
          <br />
          HOURS.
        </strong>
        <small>CONCEPT EVENT / DEMO</small>
      </div>
      <div className="tf-ticket-body">
        <div>
          <span>YOUR WAY IN</span>
          <Ticket size={22} />
        </div>
        <h3>{type}</h3>
        <p>
          21.11.2026 · 19:00
          <br />
          Demo venue · Ho Chi Minh City
        </p>
        <div className="tf-ticket-perforation" />
        <div className="tf-ticket-code">
          <div className="tf-barcode" aria-hidden="true" />
          <span>DEMO — NOT VALID FOR ADMISSION</span>
        </div>
      </div>
    </div>
  );
}
export function TicketShowcase() {
  const [flipped, setFlipped] = useState(false);
  const tilt = useRef<HTMLDivElement>(null);
  return (
    <section className="tf-section tf-ticket-section">
      <div>
        <SectionLabel index="05">MORE THAN A TICKET</SectionLabel>
        <h2 data-reveal>
          MORE THAN
          <br />
          JUST A
          <br />
          <em>TICKET.</em>
        </h2>
        <p>One ticket. A whole world of feeling.</p>
        <button
          className="tf-button tf-button-outline"
          aria-pressed={flipped}
          onClick={() => setFlipped(!flipped)}
        >
          <RotateCw size={17} />
          {flipped ? 'Show front' : 'Flip to explore'}
        </button>
      </div>
      <div className="tf-ticket-stage" data-reveal>
        <div className="tf-halo" />
        <div className="tf-ticket-ghost" aria-hidden="true" />
        <div
          ref={tilt}
          className="tf-ticket-tilt"
          onPointerMove={(e) => {
            if (
              e.pointerType !== 'mouse' ||
              window.matchMedia('(prefers-reduced-motion: reduce)').matches
            )
              return;
            const r = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.transform = `rotateY(${(e.clientX - r.left - r.width / 2) / 30}deg) rotateX(${-(e.clientY - r.top - r.height / 2) / 30}deg)`;
          }}
          onPointerLeave={() => {
            if (tilt.current) tilt.current.style.transform = '';
          }}
        >
          <div className={`tf-ticket-flipper ${flipped ? 'is-flipped' : ''}`}>
            <div className="tf-ticket-front" inert={flipped}>
              <DigitalTicket />
            </div>
            <div className="tf-ticket-back" inert={!flipped}>
              <Ticket size={46} />
              <span>SEE YOU THERE.</span>
              <h3>
                DEMO PASS.
                <br />
                REAL FEELING.
              </h3>
              <p>
                This is a ticket design preview. Your real tickets appear in your account after
                payment is confirmed.
              </p>
              <FlowLink href="/my-tickets">My tickets</FlowLink>
            </div>
          </div>
        </div>
        <span className="tf-ticket-note">DESIGNED FOR THE MOMENT ↗</span>
      </div>
    </section>
  );
}
export function BookingExperience() {
  const [step, setStep] = useState(0);
  const [type, setType] = useState('FAN PASS');
  const scope = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const stepRef = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const { contextSafe } = useGSAP({ scope });
  const change = useCallback(
    (next: number) => {
      if (!scope.current || next === stepRef.current) return;
      stepRef.current = next;
      contextSafe(() => {
        const state = Flip.getState(scope.current!.querySelectorAll('.tf-demo-token'));
        setStep(next);
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(
          contextSafe(() => {
            if (!scope.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
              return;
            Flip.from(state, {
              targets: scope.current.querySelectorAll('.tf-demo-token'),
              duration: FLOW_MOTION.bookingFlip,
              ease: 'power3.inOut',
              absolute: true,
            });
          }),
        );
      })();
    },
    [contextSafe],
  );
  useEffect(() => {
    const section = scope.current;
    if (!section) return;
    let mounted = true;
    let nearby = false;
    let raf = 0;
    let scrollStep = -1;
    // Read the live top position: upstream pinned scenes can change document offsets.
    // Keep the travel distance stable when the preview changes its own height.
    let travel = section.offsetHeight;
    const update = () => {
      raf = 0;
      if (!mounted || !nearby) return;
      const top = section.getBoundingClientRect().top;
      const progress = (window.innerHeight * 0.7 - top) / Math.max(1, travel);
      if (progress < 0 || progress > 1) return;
      const next = Math.min(2, Math.floor(progress * 3));
      if (next === scrollStep) return;
      scrollStep = next;
      change(next);
    };
    const schedule = () => {
      if (nearby && !raf) raf = requestAnimationFrame(update);
    };
    const measure = () => {
      travel = section.offsetHeight;
      schedule();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        nearby = entry?.isIntersecting ?? false;
        schedule();
      },
      { rootMargin: '70% 0px' },
    );
    observer.observe(section);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure);
    void document.fonts.ready.then(() => {
      if (mounted) measure();
    });
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', measure);
    };
  }, [change]);
  return (
    <section className="tf-section tf-booking" ref={scope}>
      <SectionLabel index="06">FROM DISCOVERY TO MEMORY</SectionLabel>
      <div className="tf-section-head">
        <h2 data-reveal>
          FIND. BOOK. <em>GO.</em>
        </h2>
        <span className="tf-caption">BOOKING PREVIEW / SCROLL TO EXPLORE</span>
      </div>
      <div className="tf-booking-layout">
        <div className="tf-booking-steps" role="tablist" aria-label="Booking journey">
          {['DISCOVER', 'PICK A PASS', 'GET READY'].map((s, i) => (
            <button
              key={s}
              id={`tf-step-${i}`}
              role="tab"
              aria-selected={step === i}
              aria-controls="tf-demo-panel"
              tabIndex={step === i ? 0 : -1}
              onKeyDown={(e) => {
                if (
                  e.key === 'ArrowDown' ||
                  e.key === 'ArrowRight' ||
                  e.key === 'ArrowUp' ||
                  e.key === 'ArrowLeft'
                ) {
                  e.preventDefault();
                  const n = (i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : 2)) % 3;
                  change(n);
                  document.getElementById(`tf-step-${n}`)?.focus({ preventScroll: true });
                }
              }}
              onClick={() => change(i)}
            >
              <span>0{i + 1}</span>
              {s}
              <ArrowUpRight />
            </button>
          ))}
        </div>
        <div
          id="tf-demo-panel"
          role="tabpanel"
          aria-labelledby={`tf-step-${step}`}
          className="tf-demo-panel"
        >
          {step === 0 ? (
            <>
              <div data-flip-id="booking-token" className="tf-demo-poster tf-demo-token">
                <FlowImage src={media.stage} sizes="(max-width: 700px) 90vw, 500px" />
                <h3>
                  YOUR NEXT
                  <br />
                  GREAT NIGHT.
                </h3>
              </div>
              <button className="tf-button" onClick={() => change(1)}>
                Explore demo tickets <ArrowUpRight />
              </button>
            </>
          ) : step === 1 ? (
            <>
              <div data-flip-id="booking-token" className="tf-demo-token tf-demo-mini">
                <Ticket /> AFTER HOURS / DEMO
              </div>
              <fieldset>
                <legend>Choose a demo ticket tier</legend>
                {['FAN PASS', 'BACKSTAGE'].map((t) => (
                  <label className={type === t ? 'selected' : ''} key={t}>
                    <input
                      type="radio"
                      name="ticket-type"
                      checked={type === t}
                      onChange={() => setType(t)}
                    />
                    <span>{t}</span>
                    {type === t && <Check size={18} />}
                  </label>
                ))}
              </fieldset>
              <button className="tf-button" onClick={() => change(2)}>
                Preview your ticket <ArrowUpRight />
              </button>
            </>
          ) : (
            <>
              <div data-flip-id="booking-token" className="tf-demo-token">
                <DigitalTicket compact type={type} />
              </div>
              <p>Ticket preview · No transaction made</p>
              <FlowLink href="/events">Find an event to book</FlowLink>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
