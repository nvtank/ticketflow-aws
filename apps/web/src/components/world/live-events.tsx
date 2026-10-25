'use client';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Search } from 'lucide-react';
import { apiGet, eventListSchema } from '@/lib/api-client';
import { EventGrid } from '@/components/events/event-card';
import { QueryNotice } from '@/components/ui/query-notice';
import { EmptyState } from '@/components/ui/empty-state';

export function LiveEvents() {
  const events = useQuery({
    queryKey: ['events', 'world-home'],
    queryFn: ({ signal }) =>
      apiGet('/events?pageSize=3&sort=date', eventListSchema, { signal, anonymous: true }),
    retry: false,
  });
  return (
    <>
      <form action="/events" className="world-search">
        <Search aria-hidden="true" />
        <label htmlFor="world-search" className="sr-only">
          Tìm trải nghiệm của bạn
        </label>
        <input
          id="world-search"
          type="search"
          name="q"
          maxLength={120}
          placeholder="Bạn muốn đi đâu, nghe gì?"
        />
        <button type="submit" aria-label="Tìm sự kiện">
          <span>Tìm sự kiện</span>
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
          title="Sân khấu đang chờ một cuộc hẹn mới"
          description="Sự kiện sẽ xuất hiện khi được công bố. Ghé lại để khám phá lịch diễn tiếp theo."
        />
      )}
    </>
  );
}
