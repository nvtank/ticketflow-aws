'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { UserRole } from '@tixflow/shared';
import { useAuthState } from '@/stores/auth';
import { apiGet, eventListSchema } from '@/lib/api-client';
import { orderSchema, orderStatusLabel } from '@/lib/booking';
import { formatCurrency } from '@/lib/utils';
import { dateTime } from '@/lib/events';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QueryNotice } from '@/components/events/event-detail';
const schema = z.object({
  items: z.array(orderSchema),
  pagination: eventListSchema.shape.pagination,
});
export function MyOrders() {
  const role = useAuthState((s) => s.user?.role),
    [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['orders', 'me', page],
    queryFn: () => apiGet(`/orders/me?page=${page}&pageSize=5`, schema),
    enabled: role === UserRole.CUSTOMER,
  });
  if (role !== UserRole.CUSTOMER) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-5 text-2xl font-bold">Lịch sử đơn hàng</h2>
      {query.data ? (
        <>
          <div className="space-y-3">
            {query.data.items.length ? (
              query.data.items.map((order) => (
                <Card key={order.id}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <Badge>{orderStatusLabel[order.status]}</Badge>
                      <h3 className="mt-3 font-semibold">{order.event.title}</h3>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {dateTime(order.createdAt)} · {order.items.length} ghế ·{' '}
                        {formatCurrency(order.totalVnd)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button asChild variant="outline">
                        <Link href={`/checkout/${order.id}`}>Xem đơn hàng</Link>
                      </Button>
                      {order.status === 'PAID' && (
                        <Link
                          className="text-xs font-semibold text-primary"
                          href={`/events/${order.event.slug}#reviews`}
                        >
                          Chia sẻ trải nghiệm ↗
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card>
                <p className="text-sm leading-7 text-muted-foreground">
                  Chưa có đơn hàng. Khám phá sự kiện và chọn ghế để bắt đầu.
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/events">Tìm trải nghiệm tiếp theo</Link>
                </Button>
              </Card>
            )}
          </div>
          <div className="mt-5 flex justify-center gap-3">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Trang trước
            </Button>
            <Button
              variant="outline"
              disabled={page >= query.data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
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
    </section>
  );
}
