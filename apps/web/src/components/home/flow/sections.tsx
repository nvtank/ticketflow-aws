import Link from 'next/link';
import { ArrowUpRight, AudioLines, Plus, Ticket, CalendarDays } from 'lucide-react';
import { FlowImage, FlowLink, FlowMark, SectionLabel } from './primitives';
import { media, vibes } from './data';
export { TikFlowHero as HeroSection } from './hero/tikflow-hero';
export function MarqueeSection() {
  return (
    <section className="tf-marquees" aria-label="Step into live experiences" data-flow-snap>
      <div className="tf-energy-stage">
        <SectionLabel index="01">STEP INTO THE MOMENT</SectionLabel>
        <div className="tf-energy-orbit" aria-hidden="true">
          <svg viewBox="0 0 500 500">
            <circle data-energy-line cx="250" cy="250" r="240" />
            <path data-energy-line d="M250 0V500M0 250H500" />
          </svg>
        </div>
        <div className="tf-energy-photo tf-energy-photo-a" data-energy-photo>
          <FlowImage
            src={media.crowd}
            alt="Crowd sharing a moment at a live concert"
            sizes="(max-width: 700px) 30vw, 24vw"
          />
          <span>THE PEOPLE / 01</span>
        </div>
        <h2 className="tf-energy-title">
          <span data-energy-word>FEEL</span>
          <span data-energy-word>
            THE <em>FLOW.</em>
          </span>
        </h2>
        <div className="tf-energy-photo tf-energy-photo-b" data-energy-photo>
          <FlowImage
            src={media.stage}
            alt="Artists performing under stage lights"
            sizes="(max-width: 700px) 30vw, 24vw"
          />
          <span>THE MOMENT / 02</span>
        </div>
        <span className="tf-energy-caption">LESS SCREEN TIME. MORE FEELING.</span>
      </div>
      {[0, 1].map((i) => (
        <div key={i} className={`tf-marquee tf-marquee-${i}`} aria-hidden="true">
          <div data-marquee={i}>
            {[0, 1].map((n) => (
              <span key={n}>
                LIVE MUSIC <i>✳</i> FESTIVAL <i>↗</i> CONCERT <i>✳</i> EXPERIENCE <i>↗</i>&nbsp;
              </span>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
export function CategoriesSection() {
  return (
    <section id="vibes" className="tf-vibes">
      <div className="tf-section tf-vibes-head">
        <SectionLabel index="03">FIND YOUR FREQUENCY</SectionLabel>
        <div className="tf-section-head">
          <h2 data-reveal>
            FIND YOUR <em>VIBE.</em>
          </h2>
          <span className="tf-caption">FOLLOW YOUR FREQUENCY ↗</span>
        </div>
      </div>
      <div className="tf-vibe-window">
        <div className="tf-vibe-track">
          {vibes.map((v, i) => (
            <div className="tf-vibe-slot" key={v.name}>
              <Link
                href={`/events?category=${v.category}`}
                className="tf-vibe"
                data-cursor="DISCOVER"
              >
                <FlowImage src={v.image} alt={v.label} sizes="(max-width: 700px) 74vw, 32vw" />
                <span className="tf-vibe-edition" aria-hidden="true">
                  TIKFLOW SELECTS / VOL. 0{i + 1}
                </span>
                <div className="tf-vibe-top">
                  <span>0{i + 1} / 06</span>
                  <ArrowUpRight />
                </div>
                <div className="tf-vibe-copy">
                  <span>{v.label}</span>
                  <h3>{v.name}</h3>
                  <span className="tf-vibe-explore">
                    EXPLORE THE SCENE <ArrowUpRight size={16} />
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
      <div className="tf-vibe-progress">
        <span />
      </div>
    </section>
  );
}
export function ImmersiveSection() {
  return (
    <section className="tf-story">
      <div className="tf-story-intro">
        <SectionLabel index="04">BE PART OF THE NIGHT</SectionLabel>
        <span>SOME MOMENTS DESERVE MORE THAN A SCREEN.</span>
      </div>
      <div className="tf-story-frame">
        <FlowImage src={media.crowd} alt="A crowd moving together under concert lights" />
        <div className="tf-story-copy">
          <span>FEEL EVERYTHING. TOGETHER.</span>
          <h2>
            ONE NIGHT.
            <br />
            <em>EVERY FEELING.</em>
          </h2>
          <FlowLink href="/events?category=MUSIC">Find your next night</FlowLink>
        </div>
        <span className="tf-story-corner">LIVE / LOUD / TOGETHER</span>
      </div>
    </section>
  );
}
export function OrganizerSection() {
  return (
    <section className="tf-section tf-organizer" id="organizers">
      <div>
        <SectionLabel index="08">SET THE STAGE</SectionLabel>
        <h2 data-reveal>
          THE NEXT
          <br />
          STAGE
          <br />
          IS <em>YOURS.</em>
        </h2>
        <p>Create events. Share tickets. Bring people together.</p>
        <FlowLink href="/organizer/events/new">Create an event</FlowLink>
      </div>
      <div className="tf-dashboard-scene" data-reveal>
        <div className="tf-dashboard">
          <div className="tf-dashboard-top">
            <span>
              <FlowMark /> tikflow / studio
            </span>
            <span>PRODUCT PREVIEW</span>
          </div>
          <div className="tf-dashboard-body">
            <div className="tf-dashboard-side">
              <CalendarDays />
              <Ticket />
              <AudioLines />
            </div>
            <div className="tf-dashboard-main">
              <span>YOUR CREATIVE SPACE</span>
              <h3>Your next event.</h3>
              <div className="tf-dashboard-poster">
                <FlowImage src={media.lights} />
                <span>
                  MAKE
                  <br />
                  SOME
                  <br />
                  NOISE.
                </span>
              </div>
              <div className="tf-dashboard-tags">
                <span>
                  <Plus size={14} /> Add ticket tier
                </span>
                <span>Build a seating plan ↗</span>
              </div>
            </div>
          </div>
        </div>
        <div className="tf-dashboard-float">
          <Ticket />
          <span>
            TICKETS & PEOPLE<small>Everything in one place</small>
          </span>
          <ArrowUpRight />
        </div>
      </div>
    </section>
  );
}
export function FinaleSection() {
  return (
    <section className="tf-finale">
      <div className="tf-section">
        <SectionLabel index="09">SEE YOU OUT THERE</SectionLabel>
        <div className="tf-finale-content">
          <h2 data-reveal>
            SEE YOU
            <br />
            AT THE
            <br />
            <em>NEXT ONE.</em>
          </h2>
          <Link href="/events" className="tf-finale-arrow" aria-label="Explore events">
            <ArrowUpRight />
          </Link>
        </div>
        <div className="tf-finale-foot">
          <span>YOUR NEXT EXPERIENCE STARTS HERE.</span>
          <a href="#top">Back to top ↑</a>
        </div>
      </div>
      <div className="tf-wordmark" aria-hidden="true">
        tikflow<span>®</span>
      </div>
    </section>
  );
}

export function FlowInterlude() {
  return (
    <section className="tf-interlude" aria-label="A view from the stage">
      <div className="tf-interlude-word" data-reveal>
        LESS SCROLLING.
        <br />
        <em>MORE LIVING.</em>
      </div>
      <div className="tf-interlude-photo" data-reveal>
        <FlowImage src="/images/ccgq_thumb4-jpg.jpg" alt="A live performance on stage" />
      </div>
      <svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
        <path
          data-flow-line
          d="M-50 200C100 400 230 -80 430 140S700 360 1050 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      <span>MAKE A MEMORY. BE THERE.</span>
    </section>
  );
}
