'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, ArrowUpRight } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { dateTime, managedEventListSchema, statusLabel } from '@/lib/events';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { QueryNotice } from './event-detail';
export function OrganizerEventList({ compact = false }: { compact?: boolean }) {
  const [page, setPage] = useState(1),
    [status, setStatus] = useState('');
  const query = useQuery({
    queryKey: ['organizer', 'events', page, status],
    queryFn: () =>
      apiGet(
        `/organizer/events?page=${page}&pageSize=${compact ? 5 : 12}${status ? `&status=${status}` : ''}`,
        managedEventListSchema,
      ),
  });
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className={compact ? 'text-xl font-semibold' : 'text-3xl font-bold'}>
          Sự kiện của tổ chức
        </h1>
        <Button asChild>
          <Link href="/organizer/events/new">
            <Plus />
            Tạo sự kiện
          </Link>
        </Button>
      </div>
      <label className="mb-6 block max-w-xs text-sm">
        Trạng thái
        <select
          className="mt-2 h-11 w-full rounded-xl border bg-white px-3"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(statusLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {query.data ? (
        query.data.items.length ? (
          <div className="space-y-3">
            {query.data.items.map((event) => (
              <Card key={event.id} className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Badge>{statusLabel[event.status]}</Badge>
                  <h2 className="mt-3 text-lg font-semibold">{event.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {dateTime(event.startsAt)} · {event.city} ·{' '}
                    {event.sections.reduce((sum, s) => sum + s.totalSeats, 0)} ghế
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{event.organization.name}</p>
                  {event.rejectionReason && (
                    <p className="mt-3 text-sm text-red-600">
                      Lý do từ chối: {event.rejectionReason}
                    </p>
                  )}
                </div>
                <Button asChild variant="outline">
                  <Link href={`/organizer/events/${event.id}`}>
                    Quản lý
                    <ArrowUpRight />
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Chưa có sự kiện"
            description="Tạo bản nháp đầu tiên để bắt đầu lên kế hoạch."
          />
        )
      ) : (
        <QueryNotice
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      )}{' '}
      {!compact && query.data && (
        <div className="mt-7 flex items-center justify-center gap-4">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Trang trước
          </Button>
          <span className="text-sm">
            {page}/{Math.max(1, query.data.pagination.totalPages)}
          </span>
          <Button
            variant="outline"
            disabled={page >= query.data.pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Trang sau
          </Button>
        </div>
      )}
    </section>
  );
}
