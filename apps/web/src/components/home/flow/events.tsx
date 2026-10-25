'use client';
import { FLOW_MOTION } from './motion-tokens';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { TransitionLink } from './route-transition';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { apiGet, eventListSchema } from '@/lib/api-client';
const categoryLabel: Record<string, string> = {
  MUSIC: 'Music',
  CONFERENCE: 'Conference',
  WORKSHOP: 'Workshop',
  SPORTS: 'Sports',
  OTHER: 'Arts & culture',
};
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
import { FlowImage, FlowLink, SectionLabel } from './primitives';
import { media, type FlowEvent } from './data';
import { EventRadar } from './event-radar';
export function useFlowEvents() {
  return useQuery({
    queryKey: ['home', 'flow-events'],
    queryFn: ({ signal }) =>
      apiGet('/events?pageSize=9&sort=date', eventListSchema, { anonymous: true, signal }),
    retry: false,
  });
}
export function Poster({
  event,
  index = 0,
  reveal = true,
}: {
  event: FlowEvent;
  index?: number;
  reveal?: boolean;
}) {
  return (
    <TransitionLink
      href={`/events/${event.slug}`}
      className="tf-poster"
      data-reveal={reveal || undefined}
      data-cursor="VIEW"
    >
      <FlowImage
        src={
          event.coverUrl ||
          (event.category === 'SPORTS'
            ? '/images/flow-sport.jpg'
            : event.category === 'CONFERENCE' || event.category === 'WORKSHOP'
              ? '/images/microphone.jpg'
              : [media.stage, media.arena, media.artist, media.crowd][index % 4]!)
        }
        alt={event.title}
      />
      <div className="tf-poster-top">
        <span>{categoryLabel[event.category] || event.category}</span>
        <span>
          {new Date(event.startsAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh',
          })}
        </span>
      </div>
      <div className="tf-poster-copy">
        <small>
          {event.city} / {event.venueName}
        </small>
        <h3>{event.title}</h3>
        <div>
          <span>From {formatCurrency(event.minPriceVnd)}</span>
          <ArrowUpRight aria-hidden="true" />
        </div>
      </div>
    </TransitionLink>
  );
}
function EventStatus() {
  const events = useFlowEvents();
  return (
    <div className="tf-event-status" role="status">
      <p>
        {events.isPending
          ? 'Loading upcoming events…'
          : events.isError
            ? 'Events are temporarily unavailable.'
            : 'New experiences are on their way.'}
      </p>
      {events.isError && <button onClick={() => void events.refetch()}>Try again ↗</button>}
      <FlowLink href="/events">Browse events</FlowLink>
    </div>
  );
}
export function FeaturedEvents() {
  const events = useFlowEvents();
  const scope = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.utils.toArray<HTMLElement>('.tf-poster', scope.current).forEach((card, i) => {
        gsap.from(card, {
          clipPath: 'inset(12% 0% 12% 0% round 5px)',
          duration: FLOW_MOTION.reveal,
          ease: 'power3.out',
          delay: i * 0.07,
          scrollTrigger: { trigger: card, start: 'top 92%', once: true },
        });
        const image = card.querySelector('.tf-image');
        gsap.fromTo(
          image,
          { yPercent: -5, scale: 1.12 },
          {
            yPercent: 5,
            scale: 1.12,
            ease: 'none',
            scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        );
      });
    },
    { scope, dependencies: [events.data?.items.length], revertOnUpdate: true },
  );
  return (
    <section id="featured" className="tf-section tf-featured" ref={scope}>
      <SectionLabel index="02">THE HOT LIST</SectionLabel>
      <div className="tf-section-head">
        <h2 data-reveal>
          EVENTS
          <br />
          <em>WORTH GOING TO.</em>
        </h2>
        <FlowLink href="/events" outline>
          All events
        </FlowLink>
      </div>
      {events.data?.items.length ? (
        <div className="tf-mosaic">
          {events.data.items.slice(0, 4).map((e, i) => (
            <Poster key={e.id} event={e} index={i} />
          ))}
          {events.data.items.length === 3 && (
            <Link href="/events" className="tf-mosaic-note">
              <span>FIND YOUR NEXT</span>
              <strong>
                GOOD
                <br />
                MEMORY.
              </strong>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          )}
        </div>
      ) : (
        <EventStatus />
      )}
    </section>
  );
}
export function TrendingEvents() {
  const events = useFlowEvents();
  return (
    <section className="tf-section tf-trending tf-radar-section">
      <SectionLabel index="07">ON YOUR RADAR</SectionLabel>
      <div className="tf-section-head">
        <h2 data-reveal>
          YOUR NEXT
          <br />
          <em>GREAT NIGHT.</em>
        </h2>
        <span className="tf-radar-eyebrow">A LINEUP WORTH GETTING LOST IN ↙</span>
      </div>
      {events.data?.items.length ? (
        <EventRadar>
          {events.data.items.map((event, index) => (
            <Poster key={event.id} event={event} index={index + 1} reveal={false} />
          ))}
        </EventRadar>
      ) : (
        <EventStatus />
      )}
    </section>
  );
}
