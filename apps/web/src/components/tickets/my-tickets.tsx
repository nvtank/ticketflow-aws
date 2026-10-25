'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { z } from 'zod';
import { UserRole } from '@tixflow/shared';
import {
  Ticket,
  CalendarDays,
  MapPin,
  ArrowUpRight,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { AccountNavigation } from '@/components/layout/account-navigation';
import { BookingSteps } from '@/components/booking/booking-steps';
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
    <Card className="ticket-card overflow-hidden rounded-[22px] p-0">
      <div className="flex items-center justify-between gap-3 bg-muted p-6 text-white">
        <span className="flex items-center gap-2 text-xs font-semibold tracking-widest">
          <Ticket aria-hidden className="size-5 text-primary" />
          TIKFLOW / E-TICKET
        </span>
        <Badge className="border-white/20 bg-white/10 text-white">
          {ticketStatusLabel[t.status]}
        </Badge>
      </div>
      <div className="space-y-4 p-6">
        <h2 className="text-xl font-bold tracking-tight">{t.event.title}</h2>
        <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
          <CalendarDays className="mt-1 size-3.5 shrink-0" />
          {dateTime(t.event.startsAt)}
        </p>
        <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
          <MapPin className="mt-1 size-3.5 shrink-0" />
          {t.event.venueName}
        </p>
        <div className="ticket-perforation flex items-center justify-between rounded-xl bg-primary/10 p-4">
          <div>
            <p className="text-[9px] font-semibold tracking-widest text-primary uppercase">
              Khu vực
            </p>
            <span className="mt-1 block text-sm font-semibold">{t.section}</span>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-semibold tracking-widest text-primary uppercase">
              Ghế của bạn
            </p>
            <strong className="mt-1 block text-3xl tracking-tight text-primary">
              {t.seatCode}
            </strong>
          </div>
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
            <p className="flex items-center gap-2 text-xs leading-6 text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-success" />
              Giữ mã QR riêng tư. Mỗi vé chỉ check-in một lần.
            </p>
          </>
        ) : (
          <Button asChild className="w-full">
            <Link href={`/my-tickets/${t.id}`}>Xem vé</Link>
          </Button>
        )}
        <Link
          href={`/events/${t.event.slug}#reviews`}
          className="inline-flex items-center gap-2 text-xs font-medium text-primary"
        >
          <MessageCircle className="size-3.5" />
          Xem sự kiện & chia sẻ trải nghiệm
          <ArrowUpRight className="size-3.5" />
        </Link>
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
    <div className="container max-w-3xl space-y-6 py-10">
      <AccountNavigation />
      <BookingSteps current={3} />
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
      <AccountNavigation />
      <div>
        <p className="eyebrow">Sẵn sàng cho những khoảnh khắc đáng nhớ</p>
        <h1 className="mt-3 text-3xl font-bold">Vé của tôi</h1>
        <p className="mt-3 text-muted-foreground">
          Những cuộc hẹn đang chờ bạn. Mở vé để xem ghế và mã QR của mình.
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
