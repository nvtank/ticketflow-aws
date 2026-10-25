'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiGet, apiRequest } from '@/lib/api-client';
import { eventDetailSchema, statusLabel, dateTime } from '@/lib/events';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QueryNotice } from './event-detail';
import { EventEditor } from './event-editor';
import { SeatGridEditor } from './seat-grid-editor';
import { EventStaffEditor } from './event-staff-editor';
import { WaitingSettings } from './waiting-settings';
import { EventHistory } from './event-history';
export function OrganizerEventManager({ id }: { id: string }) {
  const cache = useQueryClient(),
    router = useRouter();
  const [removing, setRemoving] = useState(false);
  const remove = useMutation({
    mutationFn: () => apiRequest('DELETE', `/organizer/events/${id}`, z.undefined()),
    onSuccess: async () => {
      toast.success('Đã xóa bản nháp.');
      await cache.invalidateQueries({ queryKey: ['organizer'] });
      router.push('/organizer/events');
    },
    onError: (error) => toast.error(error.message),
  });
  const query = useQuery({
    queryKey: ['organizer', 'event', id],
    queryFn: () => apiGet(`/organizer/events/${id}`, eventDetailSchema),
    retry: false,
  });
  const submit = useMutation({
    mutationFn: () => apiRequest('POST', `/organizer/events/${id}/submit`, eventDetailSchema),
    onSuccess: async () => {
      toast.success('Đã gửi sự kiện chờ duyệt.');
      await cache.invalidateQueries({ queryKey: ['organizer'] });
    },
    onError: (error) => toast.error(error.message),
  });
  if (!query.data)
    return (
      <QueryNotice
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  const event = query.data;
  return (
    <div className="space-y-7">
      <Link href="/organizer/events" className="text-sm text-primary">
        ← Danh sách sự kiện
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge>{statusLabel[event.status]}</Badge>
          <h1 className="mt-3 text-3xl font-bold">{event.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {dateTime(event.startsAt)} · {event.venue.name}, {event.city}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{event.organization.name}</p>
        </div>
        {['DRAFT', 'REJECTED'].includes(event.status) && (
          <Button disabled={submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? 'Đang gửi…' : 'Gửi duyệt sự kiện'}
          </Button>
        )}
        {event.status === 'PUBLISHED' && (
          <Button asChild variant="outline">
            <Link href={`/events/${event.slug}`}>Xem trang công khai</Link>
          </Button>
        )}
      </div>
      {event.rejectionReason && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          Lý do từ chối: {event.rejectionReason}
        </p>
      )}
      {['DRAFT', 'REJECTED'].includes(event.status) ? (
        <details>
          <summary className="mb-4 cursor-pointer font-semibold text-primary">
            Chỉnh sửa thông tin sự kiện
          </summary>
          <EventEditor event={event} />
        </details>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nội dung đã gửi duyệt hoặc công bố được khóa để bảo toàn thông tin đã duyệt.
        </p>
      )}
      <SeatGridEditor key={event.id} event={event} />
      <WaitingSettings
        key={`${id}:${event.waitingRoomEnabled}:${event.waitingRoomCapacity}`}
        event={event}
      />
      <EventStaffEditor id={id} />
      <EventHistory id={id} />
      {['DRAFT', 'REJECTED'].includes(event.status) && (
        <Button variant="outline" onClick={() => setRemoving(true)}>
          Xóa bản nháp
        </Button>
      )}
      <Dialog open={removing} onOpenChange={setRemoving}>
        <DialogContent>
          <DialogTitle>Xóa bản nháp sự kiện?</DialogTitle>
          <DialogDescription className="mt-3 text-sm text-muted-foreground">
            Chỉ xóa sự kiện chưa có giao dịch. Sơ đồ ghế và phân công sẽ bị xóa; lịch sử thao tác
            vẫn được lưu.
          </DialogDescription>
          <Button className="mt-5" disabled={remove.isPending} onClick={() => remove.mutate()}>
            Xác nhận xóa
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
