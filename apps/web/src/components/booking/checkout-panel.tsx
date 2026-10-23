'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserRole } from '@tixflow/shared';
import { AuthGate } from '@/components/auth/auth-gate';
import { QueryNotice } from '@/components/events/event-detail';
import { apiGet, apiRequest } from '@/lib/api-client';
import { orderSchema, orderStatusLabel } from '@/lib/booking';
import { dateTime } from '@/lib/events';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PaymentAction } from './payment-action';
import { HoldCountdown } from './hold-countdown';
export function CheckoutPanel({ id }: { id: string }) {
  return (
    <AuthGate roles={[UserRole.CUSTOMER]} embedded>
      <CheckoutOrder id={id} />
    </AuthGate>
  );
}
function CheckoutOrder({ id }: { id: string }) {
  const cache = useQueryClient(),
    [confirm, setConfirm] = useState(false);
  const query = useQuery({
    queryKey: ['orders', id],
    queryFn: () => apiGet(`/orders/${id}`, orderSchema),
    retry: false,
    refetchInterval: 5000,
  });
  const refresh = useCallback(() => {
    void cache.invalidateQueries({ queryKey: ['orders', id] });
  }, [cache, id]);
  const cancel = useMutation({
    mutationFn: () => apiRequest('DELETE', `/orders/${id}`, orderSchema),
    onSuccess: async () => {
      setConfirm(false);
      toast.success('Đã cập nhật trạng thái đơn hàng.');
      await cache.invalidateQueries({ queryKey: ['orders'] });
      await cache.invalidateQueries({ queryKey: ['booking'] });
    },
    onError: (error) => {
      toast.error(error.message);
      refresh();
    },
  });
  if (!query.data)
    return (
      <div className="container py-12">
        <QueryNotice
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      </div>
    );
  const order = query.data;
  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <Link className="text-sm text-primary" href={`/events/${order.event.slug}/booking`}>
        ← Quay lại sơ đồ ghế
      </Link>
      <div>
        <Badge>{orderStatusLabel[order.status]}</Badge>
        <h1 className="mt-3 text-3xl font-bold">Đơn hàng của bạn</h1>
        <p className="mt-3 text-sm text-muted-foreground">Mã đơn: {order.id}</p>
      </div>
      <Card>
        <h2 className="text-xl font-semibold">{order.event.title}</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {dateTime(order.event.startsAt)} · {order.event.venueName}
        </p>
        <ul className="my-6 space-y-3">
          {order.items.map((item) => (
            <li key={item.seatId} className="flex justify-between gap-4 text-sm">
              <span>
                {item.section} · Ghế {item.code}
              </span>
              <strong>{formatCurrency(item.priceVnd)}</strong>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t py-4 text-sm">
          <span>Phí dịch vụ</span>
          <span>{formatCurrency(order.feeVnd)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <span>Tổng thanh toán</span>
          <strong className="text-primary">{formatCurrency(order.totalVnd)}</strong>
        </div>
      </Card>
      {order.status === 'PENDING_PAYMENT' ? (
        <Card>
          <p className="mb-3 text-sm font-medium">Thời gian giữ chỗ còn lại</p>
          <HoldCountdown
            key={order.expiresAt + order.serverTime}
            expiresAt={order.expiresAt}
            serverTime={order.serverTime}
            onExpired={refresh}
          />
          <p className="my-5 text-sm leading-7 text-muted-foreground">
            Thời gian giữ chỗ giữ nguyên từ lúc xác nhận ghế; khi hết hạn, ghế sẽ được trả lại.
          </p>
          <PaymentAction orderId={order.id} />
          <Button variant="outline" onClick={() => setConfirm(true)}>
            Hủy đơn hàng
          </Button>
        </Card>
      ) : (
        <Card>
          <p className="text-sm">
            Trạng thái đã được máy chủ xác nhận: <strong>{orderStatusLabel[order.status]}</strong>.
          </p>
          {order.status === 'PAID' && (
            <Button asChild className="mt-5 mr-3">
              <Link href="/my-tickets">Xem vé của tôi</Link>
            </Button>
          )}
          <Button asChild className="mt-5">
            <Link href={`/events/${order.event.slug}/booking`}>Quay lại chọn ghế</Link>
          </Button>
        </Card>
      )}
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle>Hủy đơn hàng?</DialogTitle>
          <DialogDescription className="mt-3 text-sm">
            Các ghế đang giữ sẽ được trả lại và bạn cần chọn lại nếu muốn tiếp tục.
          </DialogDescription>
          <Button className="mt-5" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
            Xác nhận hủy đơn
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
