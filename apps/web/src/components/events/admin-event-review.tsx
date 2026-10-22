'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiGet, apiRequest } from '@/lib/api-client';
import { eventDetailSchema, managedEventListSchema, statusLabel, dateTime } from '@/lib/events';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EventInformation, QueryNotice } from './event-detail';
import { EventHistory } from './event-history';
export function AdminEventQueue() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['admin', 'events', 'pending', page],
    queryFn: () => apiGet(`/admin/events/pending?page=${page}&pageSize=12`, managedEventListSchema),
  });
  return (
    <>
      <h1 className="text-3xl font-bold">Phê duyệt sự kiện</h1>
      <p className="mt-3 mb-7 text-muted-foreground">
        Kiểm tra nội dung, lịch bán và cấu hình ghế trước khi công bố.
      </p>
      {query.data ? (
        <>
          <p className="mb-4 text-sm">{query.data.pagination.total} sự kiện đang chờ duyệt</p>
          {query.data.items.length ? (
            <div className="space-y-4">
              {query.data.items.map((event) => (
                <Card key={event.id} className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <Badge>Chờ duyệt</Badge>
                    <h2 className="mt-3 text-xl font-semibold">{event.title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {event.organization.name} · {event.city} · {dateTime(event.startsAt)}
                    </p>
                  </div>
                  <Button asChild variant="outline">
                    <Link href={`/admin/events/${event.id}`}>Xem và duyệt</Link>
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Đã xử lý hết hàng chờ"
              description="Sự kiện mới gửi duyệt sẽ xuất hiện tại đây."
            />
          )}
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
        </>
      ) : (
        <QueryNotice
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      )}
    </>
  );
}
export function AdminEventReview({ id }: { id: string }) {
  const cache = useQueryClient(),
    [decision, setDecision] = useState<'approve' | 'reject' | null>(null),
    [reason, setReason] = useState('');
  const query = useQuery({
    queryKey: ['admin', 'event', id],
    queryFn: () => apiGet(`/admin/events/${id}`, eventDetailSchema),
    retry: false,
  });
  const save = useMutation({
    mutationFn: () =>
      apiRequest(
        'PATCH',
        `/admin/events/${id}/${decision}`,
        eventDetailSchema,
        decision === 'reject' ? { reason } : undefined,
      ),
    onSuccess: async () => {
      toast.success(
        decision === 'approve' ? 'Đã phê duyệt và công bố sự kiện.' : 'Đã từ chối sự kiện.',
      );
      setDecision(null);
      setReason('');
      await cache.invalidateQueries({ queryKey: ['admin'] });
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
      <Link href="/admin/events" className="text-sm text-primary">
        ← Hàng chờ duyệt
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Badge>{statusLabel[event.status]}</Badge>
        {event.status === 'PENDING_APPROVAL' && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDecision('reject')}>
              Từ chối sự kiện
            </Button>
            <Button onClick={() => setDecision('approve')}>Phê duyệt sự kiện</Button>
          </div>
        )}
      </div>
      {event.rejectionReason && (
        <p className="rounded-xl bg-red-50 p-4 text-red-700">
          Lý do từ chối: {event.rejectionReason}
        </p>
      )}
      <EventInformation event={event} />
      <EventHistory id={id} admin />
      <Dialog
        open={decision !== null}
        onOpenChange={(open) => {
          if (!open) setDecision(null);
        }}
      >
        <DialogContent>
          <DialogTitle className="text-xl font-semibold">
            {decision === 'approve' ? 'Công bố sự kiện?' : 'Lý do từ chối'}
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm text-muted-foreground">
            {decision === 'approve'
              ? 'Sau khi phê duyệt, khách hàng có thể tìm và xem thông tin sự kiện.'
              : 'Organizer sẽ nhận lý do và có thể sửa nháp để gửi duyệt lại.'}
          </DialogDescription>
          {decision === 'reject' && (
            <label className="mt-4 block text-sm">
              Lý do
              <textarea
                className="mt-2 w-full rounded-xl border p-3"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minLength={5}
                maxLength={1000}
              />
            </label>
          )}
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => setDecision(null)}>
              Quay lại
            </Button>
            <Button
              disabled={save.isPending || (decision === 'reject' && reason.trim().length < 5)}
              onClick={() => save.mutate()}
            >
              {save.isPending ? 'Đang xử lý…' : 'Xác nhận quyết định'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
