'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { CalendarDays, MapPin, Ticket, ArrowLeft } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import {
  eventDetailSchema,
  dateTime,
  categoryLabel,
  type EventDetail as EventData,
} from '@/lib/events';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

export function QueryNotice({
  pending,
  error,
  retry,
}: {
  pending: boolean;
  error: Error | null;
  retry: () => void;
}) {
  if (pending)
    return (
      <div role="status" aria-label="Đang tải dữ liệu" className="space-y-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-64" />
      </div>
    );
  if (error)
    return (
      <EmptyState
        title="Chưa thể tải dữ liệu"
        description={error.message}
        action={
          <Button variant="outline" onClick={retry}>
            Thử lại
          </Button>
        }
      />
    );
  return null;
}
export function EventInformation({ event }: { event: EventData }) {
  return (
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
      <div className="space-y-7">
        <div className="relative flex min-h-64 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-violet-800 to-indigo-600 p-8 text-white">
          {event.coverUrl && (
            <Image
              unoptimized
              width={1280}
              height={720}
              src={event.coverUrl}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          )}
          <div className="relative mt-auto rounded-xl bg-slate-950/70 p-5">
            <p className="text-sm text-cyan-200">
              {categoryLabel[event.category] ?? event.category}
            </p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">{event.title}</h1>
          </div>
        </div>
        <Card>
          <h2 className="text-xl font-semibold">Về sự kiện</h2>
          <p className="mt-4 whitespace-pre-wrap leading-8 text-muted-foreground">
            {event.description}
          </p>
        </Card>
        {event.galleryUrls.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {event.galleryUrls.map((url, index) => (
              <Image
                unoptimized
                width={1280}
                height={720}
                key={url + index}
                src={url}
                loading="lazy"
                alt={`Ảnh giới thiệu ${index + 1}`}
                className="aspect-video w-full rounded-xl object-cover"
              />
            ))}
          </div>
        )}
        <Card>
          <h2 className="text-xl font-semibold">Chính sách vé</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
            {event.ticketPolicy}
          </p>
        </Card>
      </div>
      <aside className="space-y-5 lg:sticky lg:top-24">
        <Card>
          <p className="flex gap-3">
            <CalendarDays className="size-5 shrink-0 text-primary" />
            {dateTime(event.startsAt)}
          </p>
          <p className="mt-4 flex gap-3">
            <MapPin className="size-5 shrink-0 text-primary" />
            <span>
              {event.venue.name}
              <span className="mt-1 block text-sm text-muted-foreground">
                {event.venue.address}, {event.city}
              </span>
            </span>
          </p>
          <p className="mt-5 border-t pt-4 text-sm">
            Tổ chức bởi <strong>{event.organization.name}</strong>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Bán vé: {dateTime(event.salesStartAt)} – {dateTime(event.salesEndAt)}
          </p>
        </Card>
        <Card>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Ticket className="text-primary" />
            Hạng vé
          </h2>
          <div className="mt-5 space-y-4">
            {event.sections.map((section) => (
              <div key={section.id} className="border-b pb-3 last:border-0">
                <div className="flex justify-between gap-3">
                  <strong>{section.name}</strong>
                  <strong className="text-primary">
                    {formatCurrency(section.ticketType.priceVnd)}
                  </strong>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {section.ticketType.name} · Còn {section.availableSeats}/{section.totalSeats} ghế
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Tối đa {event.maxTicketsPerOrder} vé mỗi đơn.
          </p>
          {event.status === 'PUBLISHED' && (
            <Button asChild className="mt-5 w-full">
              <Link href={`/events/${event.slug}/booking`}>Chọn ghế</Link>
            </Button>
          )}
        </Card>
      </aside>
    </div>
  );
}
export function PublicEventDetail({ slug }: { slug: string }) {
  const query = useQuery({
    queryKey: ['events', 'detail', slug],
    queryFn: ({ signal }) =>
      apiGet(`/events/${encodeURIComponent(slug)}`, eventDetailSchema, { signal, anonymous: true }),
    retry: false,
  });
  return (
    <div className="container py-8 md:py-12">
      <Button asChild variant="ghost" className="mb-6">
        <Link href="/events">
          <ArrowLeft />
          Tất cả sự kiện
        </Link>
      </Button>
      {query.data ? (
        <EventInformation event={query.data} />
      ) : (
        <QueryNotice
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      )}
    </div>
  );
}
