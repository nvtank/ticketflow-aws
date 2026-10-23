'use client';
import { WaitingGate } from './waiting-gate';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserRole } from '@tixflow/shared';
import { AuthGate } from '@/components/auth/auth-gate';
import { apiGet, apiRequest } from '@/lib/api-client';
import { eventDetailSchema, dateTime, type EventDetail } from '@/lib/events';
import { bookingSchema, holdSchema, orderSchema, newerBookingSnapshot } from '@/lib/booking';
import { useBookingSelection } from '@/stores/booking-selection';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QueryNotice } from '@/components/events/event-detail';
import { SeatMap } from './seat-map';
import { HoldCountdown } from './hold-countdown';
import { useBookingRealtime } from './use-booking-realtime';
export function BookingPage({ slug }: { slug: string }) {
  return (
    <AuthGate roles={[UserRole.CUSTOMER]} embedded>
      <BookingEvent slug={slug} />
    </AuthGate>
  );
}
function BookingEvent({ slug }: { slug: string }) {
  const event = useQuery({
    queryKey: ['events', 'detail', slug],
    queryFn: () =>
      apiGet(`/events/${encodeURIComponent(slug)}`, eventDetailSchema, { anonymous: true }),
    retry: false,
    refetchInterval: 15000,
  });
  return (
    <div className="container py-8">
      {event.data ? (
        event.data.waitingRoomEnabled ? (
          <WaitingGate key={event.data.id} eventId={event.data.id}>
            {(token) => <BookingFlow event={event.data!} admissionToken={token} />}
          </WaitingGate>
        ) : (
          <BookingFlow key={event.data.id} event={event.data} />
        )
      ) : (
        <QueryNotice
          pending={event.isPending}
          error={event.error}
          retry={() => void event.refetch()}
        />
      )}
    </div>
  );
}
function BookingFlow({ event, admissionToken }: { event: EventDetail; admissionToken?: string }) {
  const cache = useQueryClient(),
    router = useRouter(),
    connection = useBookingRealtime(event.id),
    selection = useBookingSelection(),
    [confirmRelease, setConfirmRelease] = useState(false);
  const clearSelection = useBookingSelection((state) => state.clear);
  useEffect(() => () => clearSelection(event.id), [event.id, clearSelection]);
  const requestKey = useRef<{ fingerprint: string; key: string } | null>(null),
    orderKey = useRef<{ holdId: string; key: string } | null>(null);
  const query = useQuery({
    queryKey: ['booking', event.id],
    queryFn: ({ signal }) => apiGet(`/events/${event.id}/booking-state`, bookingSchema, { signal }),
    refetchInterval: 10000,
    retry: false,
    structuralSharing: newerBookingSnapshot,
  });
  const invalidate = useCallback(async () => {
    await cache.invalidateQueries({ queryKey: ['booking', event.id] });
    await cache.invalidateQueries({ queryKey: ['orders'] });
  }, [cache, event.id]);
  const expire = useCallback(() => {
    toast.info('Thời gian giữ ghế đã hết. Hãy chọn lại ghế.');
    void invalidate();
  }, [invalidate]);
  useEffect(() => {
    if (query.data)
      useBookingSelection.getState().prune(
        event.id,
        query.data.seats.filter((s) => s.status === 'AVAILABLE').map((s) => s.id),
      );
  }, [event.id, query.data]);
  const reserve = useMutation({
    mutationFn: (seatIds: string[]) => {
      const fingerprint = [...seatIds].sort().join(',');
      if (requestKey.current?.fingerprint !== fingerprint)
        requestKey.current = { fingerprint, key: crypto.randomUUID() };
      return apiRequest('POST', `/events/${event.id}/holds`, holdSchema, {
        seatIds,
        admissionToken,
        idempotencyKey: requestKey.current.key,
      });
    },
    onSuccess: async (result) => {
      selection.clear(event.id);
      requestKey.current = null;
      toast.success(
        result.state === 'ACTIVE'
          ? 'Đã giữ ghế. Vui lòng hoàn tất trong thời gian còn lại.'
          : 'Lượt giữ trước đã kết thúc.',
      );
      await invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
      void invalidate();
    },
  });
  const release = useMutation({
    mutationFn: () => apiRequest('DELETE', `/holds/${query.data?.activeHold?.id}`, holdSchema),
    onSuccess: async () => {
      setConfirmRelease(false);
      toast.success('Đã hủy giữ ghế.');
      await invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
      void invalidate();
    },
  });
  const checkout = useMutation({
    mutationFn: () => {
      const hold = query.data?.activeHold;
      if (!hold) throw new Error('Lượt giữ ghế không còn hiệu lực.');
      if (orderKey.current?.holdId !== hold.id)
        orderKey.current = { holdId: hold.id, key: crypto.randomUUID() };
      return apiRequest('POST', '/orders', orderSchema, {
        holdId: hold.id,
        idempotencyKey: orderKey.current.key,
      });
    },
    onSuccess: (order) => router.push(`/checkout/${order.id}`),
    onError: (error) => {
      toast.error(error.message);
      void invalidate();
    },
  });
  if (!query.data)
    return (
      <QueryNotice
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  const data = query.data,
    hold = data.activeHold,
    available = data.seats.filter((s) => s.status === 'AVAILABLE').map((s) => s.id),
    selected =
      selection.eventId === event.id
        ? selection.seatIds.filter((id) => available.includes(id))
        : [],
    chosen = data.seats.filter((s) => selected.includes(s.id)),
    held = data.seats.filter((s) => s.status === 'HELD_BY_ME');
  const saleOpen =
    Date.parse(data.serverTime) >= Date.parse(data.salesStartAt) &&
    Date.parse(data.serverTime) < Date.parse(data.salesEndAt);
  return (
    <div className="space-y-6">
      <Link href={`/events/${event.slug}`} className="text-sm text-primary">
        ← Thông tin sự kiện
      </Link>
      <div>
        <p className="text-sm text-primary">Chọn chỗ cho trải nghiệm của bạn</p>
        <h1 className="mt-2 text-3xl font-bold">{event.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {dateTime(event.startsAt)} · {event.venue.name}
        </p>
        <p className="mt-3 text-xs" role="status">
          {connection === 'connected'
            ? 'Đã kết nối thời gian thực'
            : 'Đang kết nối lại · tự đồng bộ ghế định kỳ'}
        </p>
      </div>
      {query.isError && (
        <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm">
          Chưa thể đồng bộ ghế mới nhất.{' '}
          <button className="underline" onClick={() => void query.refetch()}>
            Thử lại
          </button>
        </p>
      )}
      {!saleOpen && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Sự kiện hiện chưa mở bán hoặc đã kết thúc bán vé.
        </p>
      )}
      <div className="grid min-w-0 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <SeatMap
          event={event}
          snapshot={data}
          selected={selected}
          locked={!!hold || reserve.isPending || !saleOpen}
          onToggle={(id) => {
            if (!selection.toggle(event.id, id, data.maxTicketsPerOrder))
              toast.error(`Tối đa ${data.maxTicketsPerOrder} vé mỗi lượt.`);
          }}
        />
        <Card className="space-y-5 lg:sticky lg:top-24">
          <h2 className="text-xl font-semibold">
            {hold ? 'Ghế bạn đang giữ' : 'Lựa chọn của bạn'}
          </h2>
          <p className="text-xs text-muted-foreground">
            Tối đa {data.maxTicketsPerOrder} vé mỗi lượt.
          </p>
          {(hold ? held : chosen).length ? (
            <ul className="space-y-3">
              {(hold ? held : chosen).map((seat) => (
                <li key={seat.id} className="flex justify-between gap-3 text-sm">
                  <span>Ghế {seat.code}</span>
                  <strong>{formatCurrency(seat.priceVnd)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Chọn ghế còn trống trên sơ đồ.</p>
          )}
          <div className="flex justify-between border-t pt-4">
            <span>Tổng tiền</span>
            <strong className="text-primary">
              {formatCurrency((hold ? held : chosen).reduce((sum, s) => sum + s.priceVnd, 0))}
            </strong>
          </div>
          {hold ? (
            <>
              <HoldCountdown
                key={hold.expiresAt + data.serverTime}
                expiresAt={hold.expiresAt}
                serverTime={data.serverTime}
                onExpired={expire}
              />
              <Button
                className="w-full"
                disabled={checkout.isPending}
                onClick={() =>
                  hold.orderId ? router.push(`/checkout/${hold.orderId}`) : checkout.mutate()
                }
              >
                {checkout.isPending ? 'Đang tạo đơn…' : 'Tiếp tục đến đơn hàng'}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setConfirmRelease(true)}>
                Hủy giữ ghế
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs leading-6 text-muted-foreground">
                Chưa giữ chỗ khi bạn chỉ chọn ghế. Sau khi xác nhận thành công, bạn có tối đa 5
                phút; tạo đơn hàng không gia hạn thời gian này.
              </p>
              <Button
                className="w-full"
                disabled={!selected.length || reserve.isPending || !saleOpen}
                onClick={() => reserve.mutate(selected)}
              >
                {reserve.isPending ? 'Đang xác nhận…' : 'Xác nhận giữ ghế'}
              </Button>
            </>
          )}
        </Card>
      </div>
      <Dialog open={confirmRelease} onOpenChange={setConfirmRelease}>
        <DialogContent>
          <DialogTitle>Hủy lượt giữ ghế?</DialogTitle>
          <DialogDescription className="mt-3 text-sm">
            Các ghế chưa bán sẽ được trả lại. Đơn đang chờ thanh toán cũng sẽ bị hủy.
          </DialogDescription>
          <Button className="mt-5" disabled={release.isPending} onClick={() => release.mutate()}>
            Xác nhận hủy giữ ghế
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
