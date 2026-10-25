'use client';
import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import { apiGet, apiRequest } from '@/lib/api-client';
import { seatSnapshotSchema, eventDetailSchema, type EventDetail } from '@/lib/events';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QueryNotice } from './event-detail';
const schema = z
  .object({
    sections: z
      .array(
        z.object({
          name: z.string().trim().min(1, 'Nhập tên.').max(60, 'Tối đa 60 ký tự.'),
          ticketName: z.string().trim().min(1, 'Nhập tên.').max(60, 'Tối đa 60 ký tự.'),
          priceVnd: z
            .number({ error: 'Nhập giá hợp lệ.' })
            .int('Giá phải là số nguyên.')
            .min(0, 'Giá không âm.')
            .max(100000000, 'Tối đa 100.000.000 VND.'),
          rows: z
            .number({ error: 'Nhập số hàng.' })
            .int('Nhập số nguyên.')
            .min(1, 'Ít nhất 1 hàng.')
            .max(26, 'Tối đa 26 hàng.'),
          columns: z
            .number({ error: 'Nhập số cột.' })
            .int('Nhập số nguyên.')
            .min(1, 'Ít nhất 1 cột.')
            .max(40, 'Tối đa 40 cột.'),
        }),
      )
      .min(1)
      .max(8),
  })
  .refine((v) => v.sections.reduce((sum, s) => sum + s.rows * s.columns, 0) <= 2000, {
    message: 'Tối đa 2.000 ghế.',
    path: ['sections'],
  });
const seatColors = {
  AVAILABLE: 'bg-success/15 text-success hover:bg-success/25',
  UNAVAILABLE: 'bg-muted text-muted-foreground',
  SOLD: 'bg-slate-700 text-white',
  HELD: 'bg-warning/15 text-warning',
};
export function SeatGridEditor({ event }: { event: EventDetail }) {
  const cache = useQueryClient(),
    [confirm, setConfirm] = useState(false);
  const editable = ['DRAFT', 'REJECTED'].includes(event.status);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      sections: event.sections.length
        ? event.sections.map((s) => ({
            name: s.name,
            ticketName: s.ticketType.name,
            priceVnd: s.ticketType.priceVnd,
            rows: s.rowCount,
            columns: s.columnCount,
          }))
        : [{ name: 'Standard', ticketName: 'Standard', priceVnd: 499000, rows: 10, columns: 20 }],
    },
  });
  const fields = useFieldArray({ control: form.control, name: 'sections' });
  const seats = useQuery({
    queryKey: ['organizer', 'seats', event.id],
    queryFn: () => apiGet(`/organizer/events/${event.id}/seats`, seatSnapshotSchema),
  });
  const invalidate = async () => {
    await cache.invalidateQueries({ queryKey: ['organizer'] });
  };
  const generate = useMutation({
    mutationFn: (input: z.infer<typeof schema>) =>
      apiRequest('POST', `/organizer/events/${event.id}/seat-map`, eventDetailSchema, input),
    onSuccess: async () => {
      setConfirm(false);
      toast.success('Đã tạo sơ đồ ghế.');
      await invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const toggle = useMutation({
    mutationFn: (seat: { id: string; status: string }) =>
      apiRequest(
        'PATCH',
        `/organizer/events/${event.id}/seats/${seat.id}`,
        z.object({ id: z.string(), status: z.string() }),
        { enabled: seat.status === 'UNAVAILABLE' },
      ),
    onSuccess: async () => {
      toast.success('Đã cập nhật ghế.');
      await invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <Card>
      <h2 className="text-xl font-semibold">Sơ đồ ghế</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Ghế có mã theo hàng/cột. Click ghế xanh để vô hiệu hóa, ghế trống để bật lại. Không sửa ghế
        đã bán hoặc đang giữ.
      </p>
      {editable ? (
        <form
          onSubmit={form.handleSubmit((values) => {
            if (event.sections.length) setConfirm(true);
            else generate.mutate(values);
          })}
          noValidate
          className="mt-6 space-y-5"
        >
          {fields.fields.map((field, index) => (
            <fieldset
              key={field.id}
              className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-5"
            >
              <legend className="px-2 text-sm font-medium">Khu vực {index + 1}</legend>
              {[
                { key: 'name', label: 'Tên khu vực', numeric: false },
                { key: 'ticketName', label: 'Loại vé', numeric: false },
                { key: 'priceVnd', label: 'Giá VND', numeric: true },
                { key: 'rows', label: 'Số hàng', numeric: true },
                { key: 'columns', label: 'Số cột', numeric: true },
              ].map(({ key, label, numeric }) => {
                const name = key as keyof z.infer<typeof schema>['sections'][number];
                return (
                  <label key={key} className="text-xs">
                    {label}
                    <Input
                      className="mt-2"
                      type={numeric ? 'number' : 'text'}
                      {...form.register(`sections.${index}.${name}`, { valueAsNumber: numeric })}
                    />
                    <span className="mt-1 block text-danger">
                      {form.formState.errors.sections?.[index]?.[name]?.message}
                    </span>
                  </label>
                );
              })}
              {fields.fields.length > 1 && (
                <Button variant="ghost" type="button" onClick={() => fields.remove(index)}>
                  Bỏ khu vực {index + 1}
                </Button>
              )}
            </fieldset>
          ))}
          <p role="status" className="text-xs text-danger">
            {form.formState.errors.sections?.root?.message ??
              form.formState.errors.sections?.message}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={fields.fields.length >= 8}
              onClick={() =>
                fields.append({ name: '', ticketName: '', priceVnd: 0, rows: 1, columns: 10 })
              }
            >
              Thêm khu vực
            </Button>
            <Button type="submit" disabled={generate.isPending}>
              {generate.isPending
                ? 'Đang tạo…'
                : event.sections.length
                  ? 'Tạo lại sơ đồ'
                  : 'Tạo sơ đồ ghế'}
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-4 rounded-xl bg-primary/10 p-4 text-sm text-foreground">
          Thông tin đã gửi duyệt hoặc công bố; sơ đồ được khóa.
        </p>
      )}
      {seats.data ? (
        <div className="mt-7 space-y-5">
          <div className="flex flex-wrap gap-4 text-xs">
            <span>🟢 Sử dụng</span>
            <span>⚪ Vô hiệu</span>
            <span>🟠 Đang giữ</span>
            <span>⚫ Đã bán</span>
            <span>{seats.data.seats.length} ghế</span>
          </div>
          <div className="rounded-xl bg-slate-900 py-4 text-center text-sm tracking-[0.3em] text-white">
            SÂN KHẤU
          </div>
          {event.sections.map((section) => (
            <div key={section.id}>
              <h3 className="mb-3 text-sm font-semibold">
                {section.name} · {formatCurrency(section.ticketType.priceVnd)} · Đã bán{' '}
                {section.soldSeats}
              </h3>
              <div
                className="overflow-x-auto pb-3"
                tabIndex={0}
                role="region"
                aria-label={`Ghế khu ${section.name}`}
              >
                <div
                  className="grid w-max gap-2"
                  style={{ gridTemplateColumns: `repeat(${section.columnCount},minmax(44px,1fr))` }}
                >
                  {seats.data.seats
                    .filter((s) => s.sectionId === section.id)
                    .sort(
                      (a, b) =>
                        a.rowLabel.length - b.rowLabel.length ||
                        a.rowLabel.localeCompare(b.rowLabel) ||
                        a.columnNumber - b.columnNumber,
                    )
                    .map((seat) => (
                      <button
                        key={seat.id}
                        type="button"
                        aria-label={`Ghế ${seat.code}: ${seat.status}`}
                        disabled={
                          !editable ||
                          toggle.isPending ||
                          !['AVAILABLE', 'UNAVAILABLE'].includes(seat.status)
                        }
                        onClick={() => toggle.mutate(seat)}
                        className={`h-10 rounded-lg px-2 text-xs font-medium disabled:cursor-default ${seatColors[seat.status]}`}
                      >
                        {seat.code}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <QueryNotice
          pending={seats.isPending}
          error={seats.error}
          retry={() => void seats.refetch()}
        />
      )}
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle className="text-xl font-semibold">Thay thế sơ đồ ghế?</DialogTitle>
          <DialogDescription className="mt-3 text-sm text-muted-foreground">
            Sơ đồ nháp hiện tại sẽ được thay thế. Chỉ có thể tạo lại khi chưa có đơn hàng hoặc lịch
            sử giữ ghế.
          </DialogDescription>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Giữ sơ đồ hiện tại
            </Button>
            <Button
              disabled={generate.isPending}
              onClick={form.handleSubmit((values) => generate.mutate(values))}
            >
              Xác nhận tạo lại
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
