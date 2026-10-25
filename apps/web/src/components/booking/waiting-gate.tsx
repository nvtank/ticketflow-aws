'use client';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import { Hourglass } from 'lucide-react';
import { apiGet, apiRequest } from '@/lib/api-client';
import { bookingSchema } from '@/lib/booking';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QueryNotice } from '@/components/events/event-detail';
import { HoldCountdown } from './hold-countdown';
const roomSchema = z.object({
  state: z.enum(['WAITING', 'ADMITTED', 'NOT_JOINED', 'DISABLED']),
  position: z.number(),
  peopleAhead: z.number(),
  queued: z.number(),
  active: z.number(),
  capacity: z.number(),
  expiresAt: z.string().nullable(),
  serverTime: z.string(),
  admissionToken: z.string().nullable(),
});
export function WaitingGate({
  eventId,
  children,
}: {
  eventId: string;
  children: (token?: string) => ReactNode;
}) {
  const cache = useQueryClient(),
    [expired, setExpired] = useState(false);
  const path = `/events/${eventId}/waiting-room`;
  const room = useQuery({
    queryKey: ['waiting-room', eventId],
    queryFn: () => apiGet(path, roomSchema),
    refetchInterval: 2000,
    retry: false,
  });
  const booking = useQuery({
    queryKey: ['booking', eventId],
    queryFn: () => apiGet(`/events/${eventId}/booking-state`, bookingSchema),
    refetchInterval: 10000,
    retry: false,
  });
  const join = useMutation({
    mutationFn: () => apiRequest('POST', path + '/join', roomSchema),
    onSuccess: (data) => {
      setExpired(false);
      cache.setQueryData(['waiting-room', eventId], data);
    },
    onError: (error) => toast.error(error.message),
  });
  const leave = useMutation({
    mutationFn: () => apiRequest('DELETE', path, z.object({ left: z.boolean() })),
    onSuccess: async () => {
      setExpired(false);
      await cache.invalidateQueries({ queryKey: ['waiting-room', eventId] });
    },
    onError: (error) => toast.error(error.message),
  });
  const data = room.data;
  if (booking.data?.activeHold) return children();
  if (!data)
    return (
      <QueryNotice pending={room.isPending} error={room.error} retry={() => void room.refetch()} />
    );
  const admitted = data.state === 'ADMITTED' && !expired && !!data.admissionToken;
  if (data.state === 'DISABLED') return children();
  return (
    <div className="space-y-6">
      <Card className="mx-auto max-w-xl space-y-5">
        <Hourglass className="size-9 text-primary" />
        <h1 className="text-2xl font-bold">
          {admitted ? 'Đã đến lượt đặt vé' : 'Phòng chờ TikFlow'}
        </h1>
        <p className="text-sm text-muted-foreground">
          Mỗi tài khoản giữ một vị trí. Làm mới trang sẽ giữ thứ tự trong thời hạn phiên.
        </p>
        {data.state === 'WAITING' && (
          <div role="status" className="rounded-xl bg-primary/10 p-5">
            <p>
              Vị trí của bạn: <strong>{data.position}</strong>
            </p>
            <p>Có {data.peopleAhead} người phía trước.</p>
            <p className="mt-2 text-sm">Đang chờ cấp lượt tự động…</p>
          </div>
        )}
        {data.expiresAt && !expired && (
          <HoldCountdown
            key={data.expiresAt + data.serverTime}
            label={admitted ? 'Thời gian vào đặt vé còn lại' : 'Thời gian phiên chờ còn lại'}
            expiresAt={data.expiresAt}
            serverTime={data.serverTime}
            onExpired={() => {
              setExpired(true);
              void room.refetch();
            }}
          />
        )}
        {admitted && (
          <p className="text-sm text-primary">
            Bạn có thể chọn ghế bên dưới. Giữ ghế được xác nhận riêng bởi máy chủ.
          </p>
        )}
        {room.isError && <p role="alert">Chưa thể đồng bộ phòng chờ. Vui lòng thử lại.</p>}
        {(data.state === 'NOT_JOINED' || expired) && (
          <Button disabled={join.isPending} onClick={() => join.mutate()}>
            Vào hàng đợi
          </Button>
        )}
        {['WAITING', 'ADMITTED'].includes(data.state) && (
          <Button variant="outline" disabled={leave.isPending} onClick={() => leave.mutate()}>
            Rời hàng đợi
          </Button>
        )}
      </Card>
      {admitted && children(data.admissionToken ?? undefined)}
    </div>
  );
}
