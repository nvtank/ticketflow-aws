import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { FlowImage, FlowLink } from '../primitives';
import { media } from '../data';
import { HeroInteractions } from '../hero-interactions';

function FloatingTicket({
  variant,
  title,
  image,
  date,
}: {
  variant: 'neon' | 'echo' | 'vip';
  title: string;
  image?: string;
  date: string;
}) {
  return (
    <div className={`ch-ticket-position ch-ticket-${variant}`} data-ticket-scroll>
      <div data-depth={variant === 'neon' ? '22' : variant === 'echo' ? '32' : '44'}>
        <div data-ticket-float>
          <div data-ticket-enter>
            <Link
              href="/events?category=MUSIC"
              className="ch-ticket"
              aria-label={`${title} — concept ticket, discover live music`}
            >
              <div className="ch-ticket-art">
                {image && <FlowImage src={image} sizes="280px" />}
                <span className="ch-ticket-brand">
                  tikflow® <ArrowUpRight size={14} />
                </span>
                <span className="ch-ticket-type">
                  {variant === 'vip' ? 'ALL ACCESS / VIP' : 'LIVE EXPERIENCE'}
                </span>
                <strong>{title}</strong>
                {variant === 'vip' && (
                  <span className="ch-hologram" aria-hidden>
                    ✳
                  </span>
                )}
              </div>
              <div className="ch-ticket-stub">
                <span>
                  {date}
                  <small>CONCEPT PASS · DEMO ONLY</small>
                </span>
                <i className="ch-barcode" aria-hidden />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
export function TikFlowHero() {
  return (
    <section
      className="tf-hero ch-hero"
      id="top"
      data-flow-snap
      aria-label="TikFlow — Live experiences"
    >
      <div className="ch-background" data-hero-background aria-hidden="true">
        <div className="ch-background-depth" data-depth="-8">
          <FlowImage src={media.arena} priority sizes="100vw" />
        </div>
      </div>
      <div className="ch-atmosphere" data-depth="12" aria-hidden="true">
        <span className="ch-light ch-light-purple" />
        <span className="ch-light ch-light-lime" />
      </div>
      <div className="ch-grain" aria-hidden="true" />
      <HeroInteractions />
      <div className="tf-hero-meta">
        <span>
          <i className="tf-dot" /> TIKFLOW / LIVE EXPERIENCES
        </span>
        <span>THE WORLD IS YOUR STAGE.</span>
      </div>
      <div className="ch-stage">
        <div className="ch-title-scroll">
          <div data-depth="5">
            <h1 className="ch-title" aria-label="Don’t just watch. Be part of the moment.">
              <span className="ch-line-mask">
                <span data-hero-line>DON’T JUST WATCH.</span>
              </span>
              <span className="ch-line-mask">
                <span data-hero-line>BE PART OF</span>
              </span>
              <span className="ch-line-mask ch-last-line">
                <span data-hero-line>THE MOMENT.</span>
                <span className="ch-star" aria-hidden="true">
                  ✳
                </span>
              </span>
            </h1>
          </div>
        </div>
        <FloatingTicket
          variant="neon"
          title="NEON NIGHTS"
          image={media.stage}
          date="24.10 / 19:00"
        />
        <FloatingTicket variant="echo" title="ECHO FEST" image={media.crowd} date="31.10 / 18:00" />
        <FloatingTicket variant="vip" title="AFTER HOURS" date="01.11 / 20:00" />
        <svg className="ch-orbit" viewBox="0 0 1200 650" fill="none" aria-hidden="true">
          <path
            data-hero-path
            d="M-70 580C-50 60 1120-90 1160 200S480 780 350 590S1080 240 1270 500"
          />
        </svg>
      </div>
      <div className="tf-hero-bottom">
        <div className="tf-hero-invitation">
          <p>Find your event. Feel the energy. Make a memory.</p>
          <div className="tf-hero-actions">
            <FlowLink href="/events">EXPLORE EVENTS</FlowLink>
            <Link href="/organizer" className="tf-hero-organizer">
              HOST AN EVENT <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
        <a href="#featured" className="ch-scroll">
          <span className="ch-scroll-track">
            <i />
          </span>
          <span>SCROLL TO EXPLORE</span>
        </a>
      </div>
      <div className="tf-hero-foot">
        <span>LESS WATCHING. MORE FEELING.</span>
        <span>YOUR NEXT MEMORY ↗</span>
      </div>
    </section>
  );
}
