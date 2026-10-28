'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Plus, Redo2, Save, Trash2, Undo2, Armchair, Move } from 'lucide-react';
import { toast } from 'sonner';
import {
  blockSize,
  labelSeatBlocks,
  seatDesignIssues,
  ZONE_COLORS,
  type SeatBlock,
  type SeatDesign,
} from '@tixflow/shared';
import { apiGet, apiRequest } from '@/lib/api-client';
import { eventDetailSchema, seatSnapshotSchema, type EventDetail } from '@/lib/events';
import { initialSeatDesign, seatDesignSchema } from '@/lib/seating';
import { formatCurrency } from '@/lib/utils';
import { LayoutCanvas, type LayoutSeat } from '@/components/seating/layout-canvas';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { QueryNotice } from './event-detail';
import { SeatGridEditor } from './seat-grid-editor';
const selectClass = 'h-11 w-full min-w-0 rounded-xl border bg-background px-3 text-sm';
export function SeatDesigner({
  event,
  onDirtyChange,
}: {
  event: EventDetail;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const query = useQuery({
    queryKey: ['organizer', 'seats', event.id],
    queryFn: () => apiGet(`/organizer/events/${event.id}/seats`, seatSnapshotSchema),
  });
  if (!['DRAFT', 'REJECTED'].includes(event.status) && !event.seatMapLayout)
    return <SeatGridEditor event={event} />;
  if (!query.data)
    return (
      <QueryNotice
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  return <DesignerWorkspace event={event} seats={query.data.seats} onDirtyChange={onDirtyChange} />;
}
function DesignerWorkspace({
  event,
  seats,
  onDirtyChange,
}: {
  event: EventDetail;
  seats: LayoutSeat[];
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const cache = useQueryClient();
  const [history, setHistory] = useState(() => ({
    past: [] as SeatDesign[],
    present: initialSeatDesign(event, seats),
    future: [] as SeatDesign[],
  }));
  const design = history.present;
  const [baseline, setBaseline] = useState(() => JSON.stringify(design));
  const [revision, setRevision] = useState(event.inventoryRevision);
  const [selectedId, setSelectedId] = useState('stage');
  const [activeZone, setActiveZone] = useState(design.zones[0]?.id ?? '');
  const [confirm, setConfirm] = useState(false);
  const [preview, setPreview] = useState(false);
  const editable = ['DRAFT', 'REJECTED'].includes(event.status);
  const dirty = JSON.stringify(design) !== baseline;
  const structural = seatDesignSchema.safeParse(design);
  const issues = structural.success
    ? seatDesignIssues(structural.data)
    : [
        'Kiểm tra tên zone, giá vé, kích thước và số lượng ghế. Cần 1–8 zone, 1–80 dãy và tối đa 2.000 ghế.',
      ];
  const total = design.blocks.reduce((sum, b) => sum + b.rows * b.columns, 0),
    disabled = design.blocks.reduce((sum, b) => sum + b.disabledSeats.length, 0);
  const selected = design.blocks.find((b) => b.id === selectedId);
  const labels = labelSeatBlocks(design.blocks).find((b) => b.id === selectedId)?.rowLabels ?? [];
  const save = useMutation({
    mutationFn: () =>
      apiRequest('POST', `/organizer/events/${event.id}/seat-map/design`, eventDetailSchema, {
        ...seatDesignSchema.parse(design),
        expectedRevision: revision,
      }),
    onSuccess: async (saved) => {
      const next = seatDesignSchema.parse(saved.seatMapLayout);
      setHistory({ past: [], present: next, future: [] });
      setBaseline(JSON.stringify(next));
      setRevision(saved.inventoryRevision);
      setActiveZone(next.zones[0]?.id ?? '');
      setConfirm(false);
      cache.setQueryData(['organizer', 'event', event.id], saved);
      toast.success('Đã lưu sơ đồ chỗ ngồi.');
      await cache.invalidateQueries({ queryKey: ['organizer'] });
    },
    onError: (error) => {
      setConfirm(false);
      toast.error(error.message);
    },
  });
  const frozen = !editable || save.isPending;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const change = (next: SeatDesign) => {
    if (frozen) return;
    setHistory((h) => ({ past: [...h.past.slice(-39), h.present], present: next, future: [] }));
  };
  const updateBlock = (patch: Partial<SeatBlock>) => {
    if (!selected) return;
    const next = { ...selected, ...patch };
    if (total - selected.rows * selected.columns + next.rows * next.columns > 2000) {
      toast.error('Mỗi sự kiện có tối đa 2.000 ghế.');
      return;
    }
    if (patch.rows !== undefined || patch.columns !== undefined) next.disabledSeats = [];
    change({ ...design, blocks: design.blocks.map((b) => (b.id === selected.id ? next : b)) });
  };
  const move = (id: string, x: number, y: number) => {
    if (id === 'stage') change({ ...design, stage: { ...design.stage, x, y } });
    else
      change({ ...design, blocks: design.blocks.map((b) => (b.id === id ? { ...b, x, y } : b)) });
  };
  const addBlock = (columns: number, rows: number, x?: number, y?: number, copy?: SeatBlock) => {
    if (design.blocks.length >= 80 || total + rows * columns > 2000) {
      toast.error('Tối đa 80 dãy và 2.000 ghế.');
      return;
    }
    const zoneId =
      copy?.zoneId ??
      (design.zones.some((z) => z.id === activeZone) ? activeZone : design.zones[0]?.id);
    if (!zoneId) return;
    const block: SeatBlock = {
      id: crypto.randomUUID(),
      zoneId,
      x: 80,
      y: 340,
      rotation: 0,
      rows,
      columns,
      disabledSeats: [],
      ...copy,
    };
    block.id = crypto.randomUUID();
    const size = blockSize(block);
    if (x !== undefined && y !== undefined) {
      block.x = Math.round(Math.max(0, Math.min(design.width - size.width, x)) / 10) * 10;
      block.y = Math.round(Math.max(0, Math.min(design.height - size.height, y)) / 10) * 10;
    } else {
      let found = false;
      for (let top = 340; top + size.height <= design.height && !found; top += 80)
        for (let left = 80; left + size.width <= design.width && !found; left += 80) {
          block.x = left;
          block.y = top;
          const check = seatDesignIssues({ ...design, blocks: [...design.blocks, block] });
          if (!check.some((s) => s.includes('chồng lên') || s.includes('nằm ngoài'))) {
            found = true;
          }
        }
      if (!found) {
        toast.error(
          'Không còn khoảng trống phù hợp. Tăng kích thước mặt bằng hoặc di chuyển các dãy.',
        );
        return;
      }
    }
    change({ ...design, blocks: [...design.blocks, block] });
    setSelectedId(block.id);
  };
  const numberField = (
    label: string,
    value: number,
    onChange: (n: number) => void,
    min: number,
    max: number,
    step = 1,
  ) => (
    <label className="block text-xs font-medium">
      {label}
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 h-10"
      />
    </label>
  );
  return (
    <Card className="space-y-6" id="seat-designer">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[.2em] text-primary">VENUE STUDIO</p>
          <h2 className="mt-2 text-2xl font-bold">Thiết kế chỗ ngồi</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Chọn zone, kéo mẫu dãy ghế vào mặt bằng và sắp xếp quanh sân khấu. Mỗi zone có giá vé
            riêng.
          </p>
        </div>
        <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
          <strong className="text-xl" data-seat-capacity>
            {total - disabled}
          </strong>{' '}
          ghế mở bán{' '}
          <span className="text-muted-foreground">
            / {total} vị trí · {design.zones.length} zone
          </span>
        </div>
      </div>
      {!editable && (
        <p className="rounded-xl bg-primary/10 p-4 text-sm">
          Sự kiện đã gửi duyệt hoặc công bố. Sơ đồ được khóa.
        </p>
      )}
      {editable && (
        <div className="flex flex-wrap items-center gap-2 border-y py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={frozen || !history.past.length}
            onClick={() =>
              setHistory((h) => ({
                past: h.past.slice(0, -1),
                present: h.past.at(-1)!,
                future: [h.present, ...h.future],
              }))
            }
          >
            <Undo2 />
            Hoàn tác
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={frozen || !history.future.length}
            onClick={() =>
              setHistory((h) => ({
                past: [...h.past, h.present],
                present: h.future[0]!,
                future: h.future.slice(1),
              }))
            }
          >
            <Redo2 />
            Làm lại
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setPreview(!preview)}>
            {preview ? 'Tiếp tục thiết kế' : 'Xem trước'}
          </Button>
          <span className="ml-auto text-xs text-muted-foreground" role="status">
            {dirty ? 'Có thay đổi chưa lưu' : event.sections.length ? 'Đã lưu' : 'Chưa có sơ đồ'}
          </span>
          <Button
            type="button"
            disabled={frozen || !dirty || issues.length > 0}
            onClick={() => (event.sections.length ? setConfirm(true) : save.mutate())}
          >
            <Save />
            {save.isPending ? 'Đang lưu…' : 'Lưu sơ đồ'}
          </Button>
        </div>
      )}
      <div className="grid min-w-0 gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
        <fieldset disabled={frozen || preview} className="min-w-0 space-y-5">
          <div>
            <h3 className="font-semibold">Zone & giá vé</h3>
            <p className="mt-1 text-xs text-muted-foreground">Chọn zone trước khi thêm dãy ghế.</p>
          </div>
          <div className="space-y-2">
            {design.zones.map((zone) => {
              const blocks = design.blocks.filter((b) => b.zoneId === zone.id),
                count = blocks.reduce(
                  (sum, b) => sum + b.rows * b.columns - b.disabledSeats.length,
                  0,
                );
              return (
                <button
                  type="button"
                  key={zone.id}
                  aria-pressed={activeZone === zone.id}
                  onClick={() => setActiveZone(zone.id)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left ${activeZone === zone.id ? 'border-primary bg-primary/5' : ''}`}
                >
                  <span
                    className="mt-1 size-3 shrink-0 rounded-full"
                    style={{ background: zone.color }}
                  />
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">
                      {zone.name || 'Zone chưa đặt tên'}
                    </strong>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {editable
                        ? count
                        : (event.sections.find((s) => s.id === zone.id)?.availableSeats ??
                          count)}{' '}
                      ghế {editable ? 'mở bán' : 'còn trống'} · {formatCurrency(zone.priceVnd)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {editable && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={design.zones.length >= 8}
              onClick={() => {
                const id = crypto.randomUUID();
                let name = `Zone ${design.zones.length + 1}`;
                while (design.zones.some((z) => z.name === name)) name += ' mới';
                change({
                  ...design,
                  zones: [
                    ...design.zones,
                    { id, name, priceVnd: 499000, color: ZONE_COLORS[design.zones.length]! },
                  ],
                });
                setActiveZone(id);
              }}
            >
              <Plus />
              Thêm zone
            </Button>
          )}
          {design.zones
            .filter((z) => z.id === activeZone)
            .map((zone) => (
              <div key={zone.id} className="space-y-3 rounded-xl border p-3">
                <label className="block text-xs font-medium">
                  Tên zone
                  <Input
                    value={zone.name}
                    maxLength={60}
                    className="mt-1.5 h-10"
                    onChange={(e) =>
                      change({
                        ...design,
                        zones: design.zones.map((z) =>
                          z.id === zone.id ? { ...z, name: e.target.value } : z,
                        ),
                      })
                    }
                  />
                </label>
                {numberField(
                  'Giá vé / ghế (VND)',
                  zone.priceVnd,
                  (n) =>
                    change({
                      ...design,
                      zones: design.zones.map((z) =>
                        z.id === zone.id ? { ...z, priceVnd: n } : z,
                      ),
                    }),
                  0,
                  100000000,
                  1000,
                )}
                <label className="flex items-center justify-between text-xs font-medium">
                  Màu zone
                  <input
                    type="color"
                    value={zone.color}
                    className="h-9 w-12 cursor-pointer rounded border"
                    onChange={(e) =>
                      change({
                        ...design,
                        zones: design.zones.map((z) =>
                          z.id === zone.id ? { ...z, color: e.target.value } : z,
                        ),
                      })
                    }
                  />
                </label>
                {design.zones.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      change({
                        ...design,
                        zones: design.zones.filter((z) => z.id !== zone.id),
                        blocks: design.blocks.filter((b) => b.zoneId !== zone.id),
                      });
                      setActiveZone(design.zones.find((z) => z.id !== zone.id)!.id);
                    }}
                  >
                    <Trash2 />
                    Xóa zone và dãy ghế
                  </Button>
                )}
              </div>
            ))}
          {editable && (
            <div className="space-y-2">
              <h3 className="font-semibold">Mẫu dãy ghế</h3>
              <p className="text-xs leading-5 text-muted-foreground">
                Kéo vào mặt bằng hoặc bấm để thêm. Có thể chỉnh số ghế sau.
              </p>
              {[
                { columns: 6, rows: 1, label: 'Dãy 6 ghế' },
                { columns: 10, rows: 1, label: 'Dãy 10 ghế' },
                { columns: 12, rows: 1, label: 'Dãy 12 ghế' },
                { columns: 8, rows: 3, label: 'Khối 3 × 8' },
              ].map((t) => (
                <button
                  key={t.label}
                  type="button"
                  draggable={!frozen && !preview}
                  onDragStart={(e) =>
                    e.dataTransfer.setData('application/tixflow-seats', `${t.columns},${t.rows}`)
                  }
                  onClick={() => addBlock(t.columns, t.rows)}
                  className="flex w-full items-center gap-3 rounded-xl border bg-muted/30 p-3 text-left text-sm hover:border-primary disabled:opacity-50"
                >
                  <Armchair className="size-4 text-primary" />
                  {t.label}
                  <Move className="ml-auto size-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </fieldset>
        <div className="min-w-0 space-y-4">
          <LayoutCanvas
            seats={!editable ? seats : undefined}
            design={!editable && event.seatMapLayout ? event.seatMapLayout : design}
            selectedId={!preview ? selectedId : undefined}
            onSelect={!frozen && !preview ? setSelectedId : undefined}
            onMove={!frozen && !preview ? move : undefined}
            onTemplateDrop={!frozen && !preview ? addBlock : undefined}
          />
          {!preview && editable && (
            <fieldset disabled={frozen} className="space-y-4 rounded-xl border bg-muted/20 p-4">
              {selectedId === 'stage' ? (
                <>
                  <h3 className="font-semibold">Sân khấu</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {(['x', 'y', 'width', 'height'] as const).map((key, i) => (
                      <div key={key}>
                        {numberField(
                          ['Vị trí X', 'Vị trí Y', 'Chiều rộng', 'Chiều sâu'][i]!,
                          design.stage[key],
                          (n) => change({ ...design, stage: { ...design.stage, [key]: n } }),
                          key === 'width' ? 80 : key === 'height' ? 60 : 0,
                          key === 'width' ? 2000 : key === 'height' ? 1000 : 6000,
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : selected ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">
                      Dãy {design.blocks.indexOf(selected) + 1} ·{' '}
                      {selected.rows * selected.columns - selected.disabledSeats.length} ghế mở bán
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          addBlock(selected.columns, selected.rows, undefined, undefined, selected)
                        }
                      >
                        <Copy />
                        Nhân bản dãy
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          change({
                            ...design,
                            blocks: design.blocks.filter((b) => b.id !== selected.id),
                          });
                          setSelectedId('stage');
                        }}
                      >
                        <Trash2 />
                        Xóa dãy
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <label className="block text-xs font-medium">
                      Zone của dãy
                      <select
                        className={selectClass + ' mt-1.5'}
                        value={selected.zoneId}
                        onChange={(e) => updateBlock({ zoneId: e.target.value })}
                      >
                        {design.zones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {numberField(
                      'Số hàng',
                      selected.rows,
                      (n) => updateBlock({ rows: Math.max(1, Math.min(26, n)) }),
                      1,
                      26,
                    )}
                    {numberField(
                      'Ghế mỗi hàng',
                      selected.columns,
                      (n) => updateBlock({ columns: Math.max(1, Math.min(40, n)) }),
                      1,
                      40,
                    )}
                    {numberField('Vị trí X', selected.x, (n) => updateBlock({ x: n }), 0, 6000)}
                    {numberField('Vị trí Y', selected.y, (n) => updateBlock({ y: n }), 0, 6000)}
                    {numberField(
                      'Góc xoay (°)',
                      selected.rotation,
                      (n) => updateBlock({ rotation: n }),
                      -180,
                      180,
                      5,
                    )}
                  </div>
                  <details>
                    <summary className="cursor-pointer text-sm font-medium">
                      Khóa ghế không mở bán ({selected.disabledSeats.length})
                    </summary>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      Bấm ghế để bật/tắt. Thay đổi số hàng hoặc ghế mỗi hàng sẽ mở lại các ghế khóa
                      của dãy.
                    </p>
                    <div className="mt-3 flex max-h-52 flex-wrap gap-2 overflow-y-auto">
                      {Array.from({ length: selected.rows * selected.columns }, (_, i) => {
                        const code = `${labels[Math.floor(i / selected.columns)]}${String((i % selected.columns) + 1).padStart(2, '0')}`;
                        return (
                          <button
                            type="button"
                            key={i}
                            aria-label={`Khóa ghế ${code}`}
                            aria-pressed={selected.disabledSeats.includes(i)}
                            onClick={() =>
                              updateBlock({
                                disabledSeats: selected.disabledSeats.includes(i)
                                  ? selected.disabledSeats.filter((s) => s !== i)
                                  : [...selected.disabledSeats, i],
                              })
                            }
                            className={`h-11 min-w-11 rounded-lg border px-2 text-xs ${selected.disabledSeats.includes(i) ? 'bg-slate-200 text-slate-500 line-through' : 'bg-primary/10 text-primary'}`}
                          >
                            {code}
                          </button>
                        );
                      })}
                    </div>
                  </details>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Chọn một dãy ghế hoặc sân khấu để chỉnh sửa.
                </p>
              )}
            </fieldset>
          )}
          {editable && (
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Kích thước mặt bằng
              </summary>
              <fieldset disabled={frozen} className="mt-3 grid grid-cols-2 gap-3">
                {numberField(
                  'Rộng',
                  design.width,
                  (n) => change({ ...design, width: Math.max(800, Math.min(6000, n)) }),
                  800,
                  6000,
                  100,
                )}
                {numberField(
                  'Cao',
                  design.height,
                  (n) => change({ ...design, height: Math.max(600, Math.min(6000, n)) }),
                  600,
                  6000,
                  100,
                )}
              </fieldset>
            </details>
          )}
          {editable && issues.length > 0 && (
            <div
              role="status"
              className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm"
            >
              <strong>Cần điều chỉnh trước khi lưu</strong>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {issues.slice(0, 5).map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
              {issues.length > 5 && <p className="mt-2">Và {issues.length - 5} vị trí khác.</p>}
            </div>
          )}
        </div>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle>Lưu thay đổi sơ đồ?</DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-6 text-muted-foreground">
            Sơ đồ nháp sẽ được thay thế bằng {total - disabled} ghế mở bán trong{' '}
            {design.zones.length} zone. Chỉ lưu được khi chưa có đơn hàng hoặc lịch sử giữ ghế.
          </DialogDescription>
          <div className="mt-5 flex gap-3">
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Quay lại
            </Button>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              Xác nhận lưu sơ đồ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
