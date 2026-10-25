'use client';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { EVENT_CATEGORIES } from '@tixflow/shared';
import { apiGet, eventListSchema } from '@/lib/api-client';
import { categoryLabel } from '@/lib/events';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { EventGrid } from './event-card';
import { QueryNotice } from './event-detail';
const control = 'h-11 w-full rounded-xl border bg-card px-3 text-sm';
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
          id="search"
          className="mb-9 scroll-mt-32 rounded-2xl border bg-card p-5 shadow-sm md:p-6"
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
          <p className="mb-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <SlidersHorizontal className="size-4" />
            Tìm đúng trải nghiệm dành cho bạn
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
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
          <EventGrid events={events.data.items} />
          {searchable && (
            <nav
              aria-label="Phân trang sự kiện"
              className="mt-8 flex flex-wrap items-center justify-center gap-4"
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
