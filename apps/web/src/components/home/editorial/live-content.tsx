'use client';
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import gsap from 'gsap';
import Link from 'next/link';
import { ArrowUpRight, Search } from 'lucide-react';
import { apiGet, eventListSchema } from '@/lib/api-client';
import { artistListSchema, reviewsSchema } from '@/lib/discovery';
import { EventGrid } from '@/components/events/event-card';
import { QueryNotice } from '@/components/ui/query-notice';
import { EmptyState } from '@/components/ui/empty-state';

function CountUp({ value }: { value: number }) {
  const node = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = node.current;
    if (!element) return;
    let tween: gsap.core.Tween | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          element.textContent = value.toLocaleString('vi-VN');
          return;
        }
        const counter = { value: 0 };
        tween = gsap.to(counter, {
          value,
          duration: 1.6,
          ease: 'power3.out',
          onUpdate: () => {
            element.textContent = Math.round(counter.value).toLocaleString('vi-VN');
          },
        });
      },
      { threshold: 0.3 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      tween?.kill();
    };
  }, [value]);
  return (
    <>
      <span ref={node} aria-hidden="true">
        {value.toLocaleString('vi-VN')}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}
export function EditorialStats() {
  const events = useQuery({
    queryKey: ['home', 'event-count'],
    queryFn: ({ signal }) =>
      apiGet('/events?pageSize=1', eventListSchema, { anonymous: true, signal }),
    retry: false,
  });
  const artists = useQuery({
    queryKey: ['home', 'artist-count'],
    queryFn: ({ signal }) =>
      apiGet('/artists?pageSize=1', artistListSchema, { anonymous: true, signal }),
    retry: false,
  });
  const reviews = useQuery({
    queryKey: ['home', 'review-count'],
    queryFn: ({ signal }) =>
      apiGet('/reviews?pageSize=1', reviewsSchema, { anonymous: true, signal }),
    retry: false,
  });
  return (
    <div className="ed-stats">
      {[
        { label: 'Sự kiện được công bố', value: events.data?.pagination.total, href: '/events' },
        { label: 'Hồ sơ nghệ sĩ', value: artists.data?.pagination.total, href: '/artists' },
        { label: 'Đánh giá từ người mua', value: reviews.data?.summary.count, href: '/community' },
      ].map((item) => (
        <Link key={item.label} href={item.href}>
          <strong>{item.value === undefined ? '—' : <CountUp value={item.value} />}</strong>
          <span>
            {item.label}
            <ArrowUpRight aria-hidden="true" />
          </span>
        </Link>
      ))}
    </div>
  );
}
export function EditorialEvents() {
  const events = useQuery({
    queryKey: ['home', 'editorial-events'],
    queryFn: ({ signal }) =>
      apiGet('/events?pageSize=3&sort=date', eventListSchema, { anonymous: true, signal }),
    retry: false,
  });
  return (
    <>
      <form action="/events" className="ed-search">
        <Search aria-hidden="true" />
        <label htmlFor="ed-event-search" className="sr-only">
          Tìm trải nghiệm của bạn
        </label>
        <input
          id="ed-event-search"
          name="q"
          type="search"
          placeholder="Tìm một đêm đáng nhớ…"
          maxLength={120}
        />
        <button type="submit" aria-label="Tìm sự kiện">
          <ArrowUpRight aria-hidden="true" />
        </button>
      </form>
      {events.isPending || events.isError ? (
        <QueryNotice
          pending={events.isPending}
          error={events.error}
          retry={() => void events.refetch()}
        />
      ) : events.data.items.length ? (
        <EventGrid events={events.data.items} />
      ) : (
        <EmptyState
          title="Cuộc hẹn tiếp theo đang được chuẩn bị"
          description="Sự kiện sẽ xuất hiện khi được công bố. Ghé lại để tìm trải nghiệm mới."
        />
      )}
    </>
  );
}
