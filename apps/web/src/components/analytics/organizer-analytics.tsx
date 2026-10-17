'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { analyticsSchema } from '@/lib/reporting';
import { formatCurrency } from '@/lib/utils';
import { dateTime } from '@/lib/events';
import { MetricGrid, RevenueChart } from './report-widgets';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QueryNotice } from '@/components/events/event-detail';
export function OrganizerAnalytics() {
  const [range, setRange] = useState('');
  const q = useQuery({
    queryKey: ['analytics', range],
    queryFn: () => apiGet(`/organizer/analytics${range}`, analyticsSchema),
    refetchInterval: 10000,
    retry: false,
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Phân tích bán vé</h1>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget),
            p = new URLSearchParams();
          if (f.get('from')) p.set('from', String(f.get('from')));
          if (f.get('to')) p.set('to', String(f.get('to')));
          setRange('?' + p.toString());
        }}
      >
        <label className="space-y-2 text-sm">
          Từ ngày
          <Input type="date" name="from" />
        </label>
        <label className="space-y-2 text-sm">
          Đến ngày
          <Input type="date" name="to" />
        </label>
        <Button>Xem báo cáo</Button>
      </form>
      {q.data ? (
        <>
          <p className="text-sm text-muted-foreground">
            {q.data.from} – {q.data.to} · Giờ Việt Nam. Doanh thu/vé theo ngày thanh toán; tồn
            kho/check-in là tổng hiện tại.
          </p>
          <MetricGrid
            items={[
              { label: 'Doanh thu trong kỳ', value: formatCurrency(q.data.revenueVnd) },
              { label: 'Vé bán trong kỳ', value: q.data.soldTickets },
              { label: 'Ghế còn khả dụng', value: q.data.availableSeats },
              { label: 'Tỷ lệ lấp đầy', value: `${Math.round(q.data.occupancy * 100)}%` },
              { label: 'Đơn đã thanh toán', value: q.data.paidOrders },
              { label: 'Ghế đang giữ', value: q.data.heldSeats },
              { label: 'Tổng check-in', value: q.data.checkIns },
              { label: 'Sự kiện', value: q.data.totalEvents },
            ]}
          />
          <RevenueChart data={q.data.revenueByDay} />
          <Card className="overflow-x-auto">
            <h2 className="mb-4 text-xl font-semibold">Phân bố theo khu vực</h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Sự kiện / khu</th>
                  <th>Đã bán</th>
                  <th>Còn ghế</th>
                  <th>Đã vào</th>
                </tr>
              </thead>
              <tbody>
                {q.data.sections.map((s, i) => (
                  <tr key={s.eventId + s.section + i} className="border-t">
                    <td className="py-4">
                      {s.eventTitle}
                      <br />
                      <strong>{s.section}</strong>
                    </td>
                    <td>{s.sold}</td>
                    <td>{s.available}</td>
                    <td>{s.checkedIn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card>
            <h2 className="mb-4 text-xl font-semibold">Đơn hàng mới nhất</h2>
            {q.data.recentOrders.length ? (
              q.data.recentOrders.map((o) => (
                <div
                  key={o.id}
                  className="flex flex-wrap justify-between gap-3 border-t py-4 text-sm"
                >
                  <span>
                    {o.eventTitle}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {dateTime(o.createdAt)} · {o.status}
                    </span>
                  </span>
                  <strong>{formatCurrency(o.totalVnd)}</strong>
                </div>
              ))
            ) : (
              <p>Chưa có đơn hàng.</p>
            )}
          </Card>
        </>
      ) : (
        <QueryNotice pending={q.isPending} error={q.error} retry={() => void q.refetch()} />
      )}
    </div>
  );
}
