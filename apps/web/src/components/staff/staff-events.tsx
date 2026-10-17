'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { staffEventsSchema } from '@/lib/reporting';
import { dateTime } from '@/lib/events';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QueryNotice } from '@/components/events/event-detail';
import { MetricGrid } from '@/components/analytics/report-widgets';
export function StaffEvents() {
  const q = useQuery({
    queryKey: ['staff', 'events'],
    queryFn: () => apiGet('/check-in/events', staffEventsSchema),
    refetchInterval: 5000,
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Không gian soát vé</h1>
      <p className="text-muted-foreground">
        Chỉ các sự kiện bạn được phân công. Quét QR hoặc nhập mã vé để xác minh tại cổng.
      </p>
      {q.data ? (
        <>
          <MetricGrid
            items={[
              { label: 'Sự kiện được phân công', value: q.data.items.length },
              { label: 'Vé hợp lệ', value: q.data.items.reduce((n, e) => n + e.totalTickets, 0) },
              { label: 'Đã check-in', value: q.data.items.reduce((n, e) => n + e.checkedIn, 0) },
            ]}
          />
          <div className="grid gap-5 md:grid-cols-2">
            {q.data.items.length ? (
              q.data.items.map((e) => (
                <Card key={e.id}>
                  <h2 className="text-xl font-semibold">{e.title}</h2>
                  <p className="my-3 text-sm text-muted-foreground">
                    {dateTime(e.startsAt)} · {e.venueName}
                  </p>
                  <p className="mb-5 text-sm">
                    Đã vào: {e.checkedIn}/{e.totalTickets}
                  </p>
                  {e.status === 'PUBLISHED' ? (
                    <Button asChild>
                      <Link href={`/staff/events/${e.id}/scan`}>Mở cổng check-in</Link>
                    </Button>
                  ) : (
                    <p className="text-sm">Sự kiện chưa mở hoặc đã đóng check-in.</p>
                  )}
                </Card>
              ))
            ) : (
              <Card>Chưa có sự kiện được phân công.</Card>
            )}
          </div>
        </>
      ) : (
        <QueryNotice pending={q.isPending} error={q.error} retry={() => void q.refetch()} />
      )}
    </div>
  );
}
