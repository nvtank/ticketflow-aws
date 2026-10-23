'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import { Card } from '@/components/ui/card';
export function MetricGrid({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((i) => (
        <Card key={i.label}>
          <p className="text-sm text-muted-foreground">{i.label}</p>
          <p className="mt-3 text-2xl font-bold text-primary">{i.value}</p>
        </Card>
      ))}
    </div>
  );
}
export function RevenueChart({ data }: { data: { date: string; revenueVnd: number }[] }) {
  return (
    <Card>
      <h2 className="mb-5 text-xl font-semibold">Doanh thu theo ngày</h2>
      <div className="min-w-0">
        <AreaChart responsive style={{ width: '100%', height: 280 }} data={data} accessibilityLayer>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={(v) => String(v).slice(5)} />
          <YAxis width={65} tickFormatter={(v) => `${Number(v) / 1000000}tr`} />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="revenueVnd"
            name="Doanh thu (VND)"
            stroke="#4f46e5"
            fill="#c7d2fe"
            isAnimationActive={false}
          />
        </AreaChart>
      </div>
    </Card>
  );
}
export function AttendanceChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <Card>
      <h2 className="mb-4 text-xl font-semibold">Lượt vào trong 24 giờ</h2>
      {data.length ? (
        <BarChart responsive style={{ width: '100%', height: 240 }} data={data} accessibilityLayer>
          <XAxis dataKey="label" tickFormatter={(v) => String(v).slice(11)} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" name="Lượt vào" fill="#7c3aed" isAnimationActive={false} />
        </BarChart>
      ) : (
        <p className="text-sm text-muted-foreground">Chưa có lượt vào trong 24 giờ gần nhất.</p>
      )}
    </Card>
  );
}
