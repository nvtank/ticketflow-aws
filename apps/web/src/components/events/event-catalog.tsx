'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, MapPin, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { apiGet, ApiClientError, eventListSchema } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export function EventCatalog({ searchable = false }: { searchable?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const query = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const [search, setSearch] = useState(query);
  const filter = new URLSearchParams({
    page: '1',
    pageSize: '6',
    ...(query ? { q: query } : {}),
    ...(category ? { category } : {}),
  });
  const events = useQuery({
    queryKey: ['events', query, category],
    queryFn: ({ signal }) => apiGet(`/events?${filter.toString()}`, eventListSchema, { signal }),
    retry: false,
  });

  return (
    <div>
      {searchable && (
        <form
          id="search"
          className="mb-8 flex max-w-2xl gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const next = new URLSearchParams(params.toString());
            search.trim() ? next.set('q', search.trim()) : next.delete('q');
            router.push(`/events?${next.toString()}`);
          }}
        >
          <label className="sr-only" htmlFor="event-search">
            Tìm sự kiện theo tên
          </label>
          <Input
            key={query}
            id="event-search"
            placeholder="Bạn muốn trải nghiệm điều gì?"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            maxLength={120}
          />
          <Button type="submit">
            <Search />
            Tìm kiếm
          </Button>
        </form>
      )}
      {category && (
        <p className="mb-5 text-sm text-muted-foreground">
          Danh mục: <strong className="text-foreground">{category}</strong> ·{' '}
          <Link href="/events" className="text-primary underline">
            Xóa bộ lọc
          </Link>
        </p>
      )}
      {events.isPending ? (
        <div role="status" aria-label="Đang tải sự kiện" className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item}>
              <Skeleton className="h-44" />
              <Skeleton className="mt-4 h-5 w-3/4" />
              <Skeleton className="mt-3 h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : events.isError ? (
        <EmptyState
          title={
            events.error instanceof ApiClientError && events.error.status === 404
              ? 'Những sự kiện mới đang được chuẩn bị'
              : 'Chưa thể tải danh sách sự kiện'
          }
          description={
            events.error instanceof ApiClientError && events.error.status === 404
              ? 'Danh mục sẽ mở khi phân hệ sự kiện hoàn tất ở Phase 3. Hiện chưa có sự kiện mở bán; không hiển thị dữ liệu minh họa thay cho dữ liệu thật.'
              : events.error.message
          }
          action={
            <Button variant="outline" onClick={() => void events.refetch()}>
              Tải lại
            </Button>
          }
        />
      ) : events.data.items.length === 0 ? (
        <EmptyState
          title="Chưa có sự kiện phù hợp"
          description="Thử một từ khóa hoặc danh mục khác để tìm trải nghiệm dành cho bạn."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {events.data.items.map((event) => (
            <Card key={event.id} className="flex flex-col">
              <span className="mb-4 text-xs font-semibold tracking-widest text-primary uppercase">
                {event.category}
              </span>
              <h3 className="text-xl font-bold">{event.title}</h3>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="size-4" />
                {new Date(event.startsAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4" />
                {event.city}
              </p>
              <p className="mt-6 font-semibold">Từ {formatCurrency(event.minPriceVnd)}</p>
              <Link
                href={`/events/${event.slug}`}
                className="mt-4 inline-flex items-center gap-2 text-sm text-primary"
              >
                Xem chi tiết
                <ArrowRight className="size-4" />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
