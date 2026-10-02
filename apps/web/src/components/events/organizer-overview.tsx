'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Plus, CalendarDays, Ticket, Wallet, ChartNoAxesColumn } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QueryNotice } from './event-detail';
import { OrganizerEventList } from './organizer-event-list';
const schema = z.object({
  totalEvents: z.number(),
  sellingEvents: z.number(),
  soldSeats: z.number(),
  totalSeats: z.number(),
  revenueVnd: z.number(),
  occupancy: z.number(),
});
export function OrganizerOverview() {
  const query = useQuery({
    queryKey: ['organizer', 'dashboard'],
    queryFn: () => apiGet('/organizer/dashboard', schema),
  });
  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-primary">TixFlow Organizer</p>
          <h1 className="mt-2 text-3xl font-bold">Không gian nhà tổ chức</h1>
          <p className="mt-3 text-muted-foreground">
            Quản lý sự kiện và theo dõi số liệu từ đơn hàng thực tế.
          </p>
        </div>
        <Button asChild>
          <Link href="/organizer/events/new">
            <Plus />
            Tạo sự kiện
          </Link>
        </Button>
      </div>
      {query.data ? (
        <div className="mb-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Tổng sự kiện',
              value: String(query.data.totalEvents),
              icon: CalendarDays,
              note: `${query.data.sellingEvents} đang bán vé`,
            },
            {
              label: 'Ghế đã bán',
              value: String(query.data.soldSeats),
              icon: Ticket,
              note: `${query.data.totalSeats} ghế sử dụng`,
            },
            {
              label: 'Doanh thu đã thanh toán',
              value: formatCurrency(query.data.revenueVnd),
              icon: Wallet,
              note: 'Chỉ tính đơn PAID',
            },
            {
              label: 'Tỷ lệ lấp đầy',
              value: `${(query.data.occupancy * 100).toFixed(1)}%`,
              icon: ChartNoAxesColumn,
              note: 'Ghế SOLD / ghế sử dụng',
            },
          ].map((item) => (
            <Card key={item.label}>
              <div className="flex justify-between gap-3 text-sm text-muted-foreground">
                {item.label}
                <item.icon className="size-5 text-primary" />
              </div>
              <p className="mt-4 text-2xl font-bold">{item.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>
            </Card>
          ))}
        </div>
      ) : (
        <QueryNotice
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      )}
      <OrganizerEventList compact />
    </>
  );
}
