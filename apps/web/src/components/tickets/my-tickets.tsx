'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { z } from 'zod';
import { UserRole } from '@tixflow/shared';
import { Ticket } from 'lucide-react';
import { AuthGate } from '@/components/auth/auth-gate';
import { apiGet, eventListSchema } from '@/lib/api-client';
import { ticketSchema, ticketStatusLabel } from '@/lib/payments';
import { dateTime } from '@/lib/events';
import { formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QueryNotice } from '@/components/events/event-detail';
const listSchema = z.object({
  items: z.array(ticketSchema),
  pagination: eventListSchema.shape.pagination,
});
function TicketCard({
  ticket: t,
  detail = false,
}: {
  ticket: z.infer<typeof ticketSchema>;
  detail?: boolean;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-indigo-700 to-violet-700 p-6 text-white">
        <Ticket aria-hidden className="size-7" />
        <Badge className="border-white/20 bg-white/10 text-white">
          {ticketStatusLabel[t.status]}
        </Badge>
      </div>
      <div className="space-y-4 p-6">
        <h2 className="text-xl font-bold">{t.event.title}</h2>
        <p className="text-sm text-muted-foreground">
          {dateTime(t.event.startsAt)}
          <br />
          {t.event.venueName}
        </p>
        <div className="flex items-center justify-between rounded-xl bg-muted p-4">
          <span className="text-sm">{t.section}</span>
          <strong className="text-2xl text-primary">{t.seatCode}</strong>
        </div>
        <p className="break-all font-mono text-xs text-muted-foreground">{t.code}</p>
        {detail ? (
          <>
            <p className="text-sm">
              {t.event.address} · {formatCurrency(t.priceVnd)}
            </p>
            {t.qrCredential ? (
              <div className="rounded-xl border border-dashed p-6 text-center">
                <QRCodeSVG
                  className="mx-auto h-auto max-w-full bg-white p-3"
                  value={t.qrCredential}
                  size={224}
                  level="M"
                  role="img"
                  aria-label={`Mã QR vé ${t.code}`}
                />
                <p className="mt-3 text-xs text-muted-foreground">Xuất trình mã QR khi vào cổng.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t.status === 'USED'
                  ? 'Vé này đã được sử dụng.'
                  : t.status === 'CANCELLED'
                    ? 'Vé đã bị hủy.'
                    : 'Vé dữ liệu cũ chưa có mã QR có thể xác minh. Liên hệ ban tổ chức để được hỗ trợ.'}
              </p>
            )}
            <Button asChild variant="outline">
              <Link href={`/checkout/${t.orderId}`}>Xem đơn hàng</Link>
            </Button>
          </>
        ) : (
          <Button asChild className="w-full">
            <Link href={`/my-tickets/${t.id}`}>Xem vé</Link>
          </Button>
        )}
      </div>
    </Card>
  );
}
export function MyTickets({ id }: { id?: string }) {
  return (
    <AuthGate roles={[UserRole.CUSTOMER]} embedded>
      {id ? <TicketDetail id={id} /> : <TicketsList />}
    </AuthGate>
  );
}
function TicketDetail({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ['tickets', id],
    queryFn: () => apiGet(`/tickets/${id}`, ticketSchema),
    retry: false,
  });
  return (
    <div className="container max-w-xl space-y-6 py-10">
      <Link className="text-sm text-primary" href="/my-tickets">
        ← Vé của tôi
      </Link>
      <h1 className="text-3xl font-bold">Chi tiết vé</h1>
      {query.data ? (
        <TicketCard ticket={query.data} detail />
      ) : (
        <QueryNotice
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      )}
    </div>
  );
}
function TicketsList() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['tickets', 'me', page],
    queryFn: () => apiGet(`/tickets/me?page=${page}&pageSize=6`, listSchema),
    retry: false,
  });
  return (
    <div className="container space-y-7 py-10">
      <div>
        <p className="text-sm text-primary">Sẵn sàng cho những khoảnh khắc đáng nhớ</p>
        <h1 className="mt-3 text-3xl font-bold">Vé của tôi</h1>
        <p className="mt-3 text-muted-foreground">
          Các vé đã được máy chủ xác nhận thanh toán và phát hành.
        </p>
      </div>
      {query.data ? (
        <>
          <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
            {query.data.items.length ? (
              query.data.items.map((t) => <TicketCard key={t.id} ticket={t} />)
            ) : (
              <Card>
                <p className="mb-5">Bạn chưa có vé. Khám phá sự kiện để bắt đầu.</p>
                <Button asChild>
                  <Link href="/events">Khám phá sự kiện</Link>
                </Button>
              </Card>
            )}
          </div>
          <div className="flex justify-center gap-3">
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
    </div>
  );
}
