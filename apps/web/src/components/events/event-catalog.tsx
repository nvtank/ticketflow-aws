'use client';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, MapPin, Search, Music2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { EVENT_CATEGORIES } from '@tixflow/shared';
import { apiGet, eventListSchema } from '@/lib/api-client';
import { categoryLabel, dateTime } from '@/lib/events';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { QueryNotice } from './event-detail';
const control = 'h-11 w-full rounded-xl border bg-white px-3 text-sm';
export function EventCatalog({ searchable = false }: { searchable?: boolean }) {
  const params = useSearchParams(),
    router = useRouter();
  const query = params.get('q') ?? '',
    category = params.get('category') ?? '';
  const filter = new URLSearchParams(params.toString());
  filter.set('pageSize', searchable ? '9' : '6');
  for (const key of ['from', 'to']) {
    const value = filter.get(key);
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const date = new Date(`${value}T${key === 'from' ? '00:00:00' : '23:59:59'}+07:00`);
      if (Number.isFinite(date.getTime())) filter.set(key, date.toISOString());
    }
  }
  const events = useQuery({
    queryKey: ['events', 'catalog', filter.toString()],
    queryFn: ({ signal }) =>
      apiGet(`/events?${filter}`, eventListSchema, { signal, anonymous: true }),
    retry: false,
  });
  const goPage = (page: number) => {
    const next = new URLSearchParams(params.toString());
    next.set('page', String(page));
    router.push(`/events?${next}`);
  };
  return (
    <div>
      {searchable && (
        <form
          key={params.toString()}
          className="mb-8 rounded-2xl border bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            const next = new URLSearchParams();
            for (const [key, value] of new FormData(event.currentTarget).entries()) {
              const text = String(value).trim();
              if (text) next.set(key, text);
            }
            router.push(`/events?${next}`);
          }}
        >
          <div className="flex gap-3">
            <label className="sr-only" htmlFor="event-search">
              Tìm sự kiện theo tên
            </label>
            <Input
              id="event-search"
              name="q"
              placeholder="Bạn muốn trải nghiệm điều gì?"
              defaultValue={query}
              maxLength={120}
            />
            <Button type="submit">
              <Search />
              Tìm kiếm
            </Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs text-muted-foreground">
              Danh mục
              <select className={control + ' mt-1'} name="category" defaultValue={category}>
                <option value="">Tất cả danh mục</option>
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Địa điểm
              <Input
                className="mt-1"
                name="city"
                placeholder="Ví dụ: Đà Nẵng"
                defaultValue={params.get('city') ?? ''}
                maxLength={100}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Từ ngày
              <Input
                className="mt-1"
                type="date"
                name="from"
                defaultValue={params.get('from') ?? ''}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Đến ngày
              <Input className="mt-1" type="date" name="to" defaultValue={params.get('to') ?? ''} />
            </label>
            <label className="text-xs text-muted-foreground">
              Giá từ (VND)
              <Input
                className="mt-1"
                type="number"
                name="minPrice"
                min={0}
                max={2147483647}
                defaultValue={params.get('minPrice') ?? ''}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Giá đến (VND)
              <Input
                className="mt-1"
                type="number"
                name="maxPrice"
                min={0}
                max={2147483647}
                defaultValue={params.get('maxPrice') ?? ''}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Sắp xếp
              <select
                className={control + ' mt-1'}
                name="sort"
                defaultValue={params.get('sort') ?? 'date'}
              >
                <option value="date">Ngày diễn ra</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
              </select>
            </label>
            <Link
              href="/events"
              className="self-end py-3 text-center text-sm text-primary underline"
            >
              Xóa bộ lọc
            </Link>
          </div>
        </form>
      )}
      {events.isPending || events.isError ? (
        <QueryNotice
          pending={events.isPending}
          error={events.error}
          retry={() => void events.refetch()}
        />
      ) : events.data.items.length === 0 ? (
        <EmptyState
          title="Chưa có sự kiện phù hợp"
          description="Thử một từ khóa, ngày hoặc danh mục khác."
        />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.data.items.map((event) => (
              <Card key={event.id} className="overflow-hidden p-0">
                <div className="relative flex h-44 items-center justify-center bg-gradient-to-br from-indigo-950 via-violet-800 to-indigo-500 text-white">
                  {event.coverUrl ? (
                    <Image
                      unoptimized
                      width={1280}
                      height={720}
                      src={event.coverUrl}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : (
                    <Music2 className="size-16 opacity-60" />
                  )}
                  <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-indigo-900">
                    {categoryLabel[event.category] ?? event.category}
                  </span>
                </div>
                <div className="p-5">
                  <Badge>{event.availableSeats ? 'Còn vé' : 'Hết vé'}</Badge>
                  <h3 className="mt-3 text-xl font-bold">
                    <Link href={`/events/${event.slug}`}>{event.title}</Link>
                  </h3>
                  <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="size-4 shrink-0" />
                    {dateTime(event.startsAt)}
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="size-4 shrink-0" />
                    {event.venueName}, {event.city}
                  </p>
                  <div className="mt-6 flex items-center justify-between gap-3 border-t pt-4">
                    <strong className="text-primary">Từ {formatCurrency(event.minPriceVnd)}</strong>
                    <Link
                      href={`/events/${event.slug}`}
                      className="inline-flex items-center gap-1 text-sm text-primary"
                    >
                      Xem chi tiết
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {searchable && (
            <nav
              aria-label="Phân trang sự kiện"
              className="mt-8 flex items-center justify-center gap-4"
            >
              <Button
                variant="outline"
                disabled={events.data.pagination.page <= 1}
                onClick={() => goPage(events.data.pagination.page - 1)}
              >
                Trang trước
              </Button>
              <p className="text-sm">
                {events.data.pagination.page}/{Math.max(1, events.data.pagination.totalPages)} ·{' '}
                {events.data.pagination.total} sự kiện
              </p>
              <Button
                variant="outline"
                disabled={events.data.pagination.page >= events.data.pagination.totalPages}
                onClick={() => goPage(events.data.pagination.page + 1)}
              >
                Trang sau
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
