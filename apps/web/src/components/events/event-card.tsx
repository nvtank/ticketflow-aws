'use client';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, CalendarDays, MapPin, AudioLines } from 'lucide-react';
import type { z } from 'zod';
import type { eventListSchema } from '@/lib/api-client';
import { categoryLabel } from '@/lib/events';
import { formatCurrency } from '@/lib/utils';

type Event = z.infer<typeof eventListSchema>['items'][number];
export function EventCard({ event }: { event: Event }) {
  const date = new Date(event.startsAt);
  const month = date.toLocaleDateString('vi-VN', {
    month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
  const day = date.toLocaleDateString('vi-VN', { day: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
  const fallback = event.category === 'MUSIC' ? '/images/live-stage.jpg' : '/images/microphone.jpg';
  return (
    <article className="experience-card group flex h-full flex-col">
      <Link
        href={`/events/${event.slug}`}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block aspect-[1.55] overflow-hidden bg-muted"
      >
        <Image
          unoptimized={!!event.coverUrl}
          src={event.coverUrl || fallback}
          alt=""
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span className="absolute top-4 left-4 rounded-full border border-white/30 bg-card/95 px-3 py-1.5 text-[10px] font-semibold text-foreground">
          {categoryLabel[event.category] ?? event.category}
        </span>
        <span className="absolute right-4 bottom-4 rounded-xl bg-card px-3 py-2 text-center text-foreground">
          <strong className="block text-xl leading-6">{day}</strong>
          <span className="text-[9px] font-semibold uppercase">Tháng {month}</span>
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p
          className={`flex items-center gap-1.5 text-[10px] font-semibold ${event.availableSeats ? 'text-success' : 'text-muted-foreground'}`}
        >
          <span
            className={`size-1.5 rounded-full ${event.availableSeats ? 'bg-success' : 'bg-slate-400'}`}
          />
          {event.availableSeats ? 'Còn vé' : 'Hết vé'}
        </p>
        <h3 className="mt-3 text-lg leading-7 font-bold tracking-tight">
          <Link href={`/events/${event.slug}`} className="hover:text-primary">
            {event.title}
          </Link>
        </h3>
        <p className="mt-4 flex items-center gap-2 text-xs leading-6 text-muted-foreground">
          <CalendarDays className="size-3.5 shrink-0" />
          {date.toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
        <p className="mt-1 flex items-center gap-2 text-xs leading-6 text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span>
            {event.venueName}, {event.city}
          </span>
        </p>
        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <div>
              <p className="text-[10px] text-muted-foreground">Giá vé từ</p>
              <strong className="mt-1 block text-base text-primary">
                {formatCurrency(event.minPriceVnd)}
              </strong>
            </div>
            <Link
              href={`/events/${event.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Xem chi tiết
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
export function EventGrid({ events }: { events: Event[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
export function EventEmptyHint() {
  return (
    <div className="flex gap-3 rounded-2xl bg-primary/10 p-6 text-sm text-foreground">
      <AudioLines className="size-5 shrink-0" />
      <p>
        Lịch diễn sẽ xuất hiện tại đây khi có sự kiện được công bố. Khám phá{' '}
        <Link href="/events" className="font-semibold underline">
          các sự kiện khác
        </Link>{' '}
        trong lúc chờ nhé.
      </p>
    </div>
  );
}
