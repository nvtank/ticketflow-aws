'use client';
import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { BookingData } from '@/lib/booking';
import type { EventDetail } from '@/lib/events';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
const styles = {
  AVAILABLE: 'bg-emerald-100 text-emerald-950 hover:bg-emerald-200',
  HELD_BY_ME: 'bg-violet-600 text-white',
  HELD_BY_OTHERS: 'bg-amber-200 text-amber-950',
  SOLD: 'bg-slate-400 text-white',
  UNAVAILABLE: 'bg-slate-100 text-slate-400',
};
const labels = {
  AVAILABLE: 'Còn trống',
  HELD_BY_ME: 'Bạn đang giữ',
  HELD_BY_OTHERS: 'Người khác đang giữ',
  SOLD: 'Đã bán',
  UNAVAILABLE: 'Không sử dụng',
};
export function SeatMap({
  event,
  snapshot,
  selected,
  locked,
  onToggle,
}: {
  event: EventDetail;
  snapshot: BookingData;
  selected: string[];
  locked: boolean;
  onToggle: (id: string) => void;
}) {
  const [zoom, setZoom] = useState(100);
  const rank = (id: string) =>
    Math.min(
      ...snapshot.seats
        .filter((s) => s.sectionId === id)
        .map((s) => {
          let value = 0;
          for (const char of s.rowLabel) value = value * 26 + char.charCodeAt(0) - 64;
          return value;
        }),
    );
  const sections = [...event.sections].sort((a, b) => rank(a.id) - rank(b.id));
  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Sơ đồ ghế</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Thu nhỏ sơ đồ"
            disabled={zoom <= 70}
            onClick={() => setZoom((z) => z - 10)}
          >
            <Minus />
          </Button>
          <span className="w-12 text-center text-xs">{zoom}%</span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Phóng to sơ đồ"
            disabled={zoom >= 150}
            onClick={() => setZoom((z) => z + 10)}
          >
            <Plus />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(labels).map(([status, label]) => (
          <span key={status} className="inline-flex items-center gap-2">
            <span className={`size-3 rounded ${styles[status as keyof typeof styles]}`} />
            {label}
          </span>
        ))}
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded bg-indigo-600" />
          Đang chọn
        </span>
      </div>
      <div className="rounded-t-[50%] rounded-b-xl bg-gradient-to-r from-indigo-950 via-violet-800 to-indigo-950 py-7 text-center text-sm tracking-[0.3em] text-white shadow-lg">
        SÂN KHẤU
      </div>
      <p className="text-xs text-muted-foreground">
        Cuộn ngang để xem toàn bộ khu ghế. Ghế đang chọn chỉ được giữ sau khi máy chủ xác nhận.
      </p>
      {sections.map((section) => (
        <section key={section.id} className="min-w-0">
          <h3 className="mb-3 font-semibold">
            {section.name}{' '}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {formatCurrency(section.ticketType.priceVnd)}
            </span>
          </h3>
          <div
            className="overflow-x-auto rounded-xl border bg-white p-4"
            role="region"
            aria-label={`Ghế khu ${section.name}`}
            tabIndex={0}
          >
            <div
              className="grid w-max gap-2"
              style={{
                gridTemplateColumns: `repeat(${section.columnCount},${Math.round((44 * zoom) / 100)}px)`,
              }}
            >
              {snapshot.seats
                .filter((s) => s.sectionId === section.id)
                .sort(
                  (a, b) =>
                    a.rowLabel.length - b.rowLabel.length ||
                    a.rowLabel.localeCompare(b.rowLabel) ||
                    a.columnNumber - b.columnNumber,
                )
                .map((seat) => (
                  <button
                    type="button"
                    key={seat.id}
                    aria-label={`Ghế ${seat.code}: ${labels[seat.status]}`}
                    aria-pressed={selected.includes(seat.id)}
                    title={`${seat.code} · ${formatCurrency(seat.priceVnd)} · ${labels[seat.status]}`}
                    disabled={locked || seat.status !== 'AVAILABLE'}
                    onClick={() => onToggle(seat.id)}
                    style={{ height: Math.round((44 * zoom) / 100) }}
                    className={`rounded-lg text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-default ${selected.includes(seat.id) ? 'bg-indigo-600 text-white shadow-md' : styles[seat.status]}`}
                  >
                    {seat.code}
                  </button>
                ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
