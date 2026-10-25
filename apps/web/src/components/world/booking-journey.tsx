'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { ArrowUpRight, Check, ScanLine, Armchair, Compass } from 'lucide-react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { DisplayHeading, SectionLabel, WorldLink } from './primitives';

gsap.registerPlugin(useGSAP, ScrollTrigger);
const steps = [
  {
    title: 'Tìm điều bạn thích.',
    detail: 'Chọn sự kiện theo sở thích, thời gian và nơi bạn muốn đến.',
    icon: Compass,
    label: 'Khám phá',
    visual: 'Một cuộc hẹn mới.',
  },
  {
    title: 'Chọn chỗ của bạn.',
    detail: 'Xem sơ đồ ghế. Xác nhận giữ chỗ trong 5 phút để thanh toán.',
    icon: Armchair,
    label: 'Chọn ghế',
    visual: 'Gần hơn với sân khấu.',
  },
  {
    title: 'Sẵn sàng có mặt.',
    detail: 'Thanh toán được xác nhận, vé QR sẽ có trong tài khoản của bạn.',
    icon: ScanLine,
    label: 'Nhận vé',
    visual: 'Hẹn gặp bạn ở đó.',
  },
];
export function BookingJourney() {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const scope = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '[data-journey-art]',
          { scale: 1.07, yPercent: -3 },
          {
            scale: 1,
            yPercent: 3,
            ease: 'none',
            scrollTrigger: {
              trigger: scope.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.8,
            },
          },
        );
      });
      return () => media.revert();
    },
    { scope },
  );
  const step = steps[active]!;
  return (
    <section className="world-section world-journey" ref={scope} aria-label="Hành trình đặt vé">
      <div className="container world-journey-layout">
        <div data-world-reveal>
          <SectionLabel>03 / Từ màn hình đến khoảnh khắc</SectionLabel>
          <DisplayHeading>
            Một tấm vé.
            <br />
            <span className="world-cyan">Cả hành trình.</span>
          </DisplayHeading>
          <div
            className="journey-tabs"
            role="tablist"
            aria-label="Các bước đặt vé"
            onKeyDown={(event) => {
              const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
              if (!offset && event.key !== 'Home' && event.key !== 'End') return;
              event.preventDefault();
              const next =
                event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (active + offset + 3) % 3;
              setActive(next);
              document.getElementById(`journey-tab-${next}`)?.focus();
            }}
          >
            {steps.map((item, i) => (
              <button
                key={item.label}
                id={`journey-tab-${i}`}
                role="tab"
                aria-selected={active === i}
                aria-controls="journey-panel"
                tabIndex={active === i ? 0 : -1}
                onClick={() => setActive(i)}
              >
                <span>0{i + 1}</span>
                {item.label}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id="journey-panel"
            aria-labelledby={`journey-tab-${active}`}
            className="journey-copy"
          >
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={active}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </m.div>
            </AnimatePresence>
          </div>
          <WorldLink href="/guide" secondary>
            Xem hướng dẫn đặt vé
          </WorldLink>
        </div>
        <div className="journey-visual" data-world-mask>
          <div className="journey-art" data-journey-art>
            <Image
              src="/images/live-crowd.jpg"
              alt="Khán giả cùng tận hưởng một buổi diễn ngoài trời"
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="journey-visual-shade" />
          <p className="journey-visual-label">
            THE REAL WORLD IS WAITING <ArrowUpRight aria-hidden="true" />
          </p>
          <m.div
            className="journey-ticket"
            animate={reduced ? undefined : { rotate: active === 1 ? 2 : -3 }}
            transition={{ duration: 0.45 }}
          >
            <div className="journey-ticket-top">
              <span>TIKFLOW / YOUR NEXT MOMENT</span>
              <step.icon aria-hidden="true" />
            </div>
            <strong>0{active + 1}</strong>
            <p>{step.visual}</p>
            <div className="journey-ticket-bottom">
              <span>Minh họa hành trình</span>
              <Check aria-hidden="true" />
            </div>
          </m.div>
        </div>
      </div>
    </section>
  );
}
