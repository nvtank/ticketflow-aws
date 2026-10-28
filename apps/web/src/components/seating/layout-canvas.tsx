'use client';
import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import {
  blockSize,
  BLOCK_HEADER,
  BLOCK_PADDING,
  SEAT_PITCH,
  SEAT_SIZE,
  labelSeatBlocks,
  type SeatDesign,
} from '@tixflow/shared';
import { Minus, Plus, Maximize, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
export type LayoutSeat = {
  id: string;
  sectionId: string;
  rowLabel: string;
  columnNumber: number;
  status: string;
  priceVnd: number;
  code: string;
};
const statusColors: Record<string, string> = {
  SOLD: '#64748b',
  UNAVAILABLE: '#cbd5e1',
  HELD: '#d97706',
  HELD_BY_OTHERS: '#d97706',
  HELD_BY_ME: '#0284c7',
};
const statusLabels: Record<string, string> = {
  AVAILABLE: 'Còn trống',
  SOLD: 'Đã bán',
  UNAVAILABLE: 'Không mở bán',
  HELD: 'Đang giữ',
  HELD_BY_OTHERS: 'Người khác đang giữ',
  HELD_BY_ME: 'Bạn đang giữ',
};
export function LayoutCanvas({
  design,
  selectedId,
  onSelect,
  onMove,
  onTemplateDrop,
  seats,
  selectedSeats = [],
  onToggle,
  locked = false,
  toolbar,
}: {
  design: SeatDesign;
  selectedId?: string;
  onSelect?: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onTemplateDrop?: (columns: number, rows: number, x: number, y: number) => void;
  seats?: LayoutSeat[];
  selectedSeats?: string[];
  onToggle?: (id: string) => void;
  locked?: boolean;
  toolbar?: ReactNode;
}) {
  const svg = useRef<SVGSVGElement>(null),
    viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: string;
    startX: number;
    startY: number;
    x: number;
    y: number;
    node: SVGGElement;
    transform: string;
    rotation: number;
    width: number;
    height: number;
    lastX: number;
    lastY: number;
  } | null>(null);
  const [zoom, setZoom] = useState(40);
  const [panMode, setPanMode] = useState(false);
  const [autoFit, setAutoFit] = useState(true);
  useEffect(() => {
    if (!autoFit || !viewport.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        setZoom(
          Math.max(
            8,
            Math.min(100, Math.floor(((entry.contentRect.width - 24) / design.width) * 100)),
          ),
        );
    });
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [autoFit, design.width]);
  const pattern = useId().replace(/:/g, '');
  const blocks = labelSeatBlocks(design.blocks);
  // Saved row labels remain authoritative even if sections are returned in a different order.
  const byPosition = new Map(
    seats?.map((s) => [`${s.sectionId}:${s.rowLabel}:${s.columnNumber}`, s]),
  );
  const point = (clientX: number, clientY: number) => {
    const matrix = svg.current?.getScreenCTM();
    return matrix
      ? new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse())
      : { x: 0, y: 0 };
  };
  const transform = (x: number, y: number, rotation: number, width: number, height: number) =>
    `translate(${x} ${y}) rotate(${rotation} ${width / 2} ${height / 2})`;
  const move = (event: PointerEvent<SVGGElement>) => {
    const d = drag.current;
    if (!d) return;
    const p = point(event.clientX, event.clientY);
    d.lastX =
      Math.round(Math.max(0, Math.min(design.width - d.width, d.x + p.x - d.startX)) / 10) * 10;
    d.lastY =
      Math.round(Math.max(0, Math.min(design.height - d.height, d.y + p.y - d.startY)) / 10) * 10;
    d.node.setAttribute('transform', transform(d.lastX, d.lastY, d.rotation, d.width, d.height));
  };
  const end = (cancel = false) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    d.node.setAttribute('transform', d.transform);
    if (!cancel && (d.lastX !== d.x || d.lastY !== d.y)) onMove?.(d.id, d.lastX, d.lastY);
  };
  const handlers = (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation = 0,
  ) =>
    onMove && !panMode
      ? {
          role: 'button',
          tabIndex: 0,
          'aria-pressed': selectedId === id,
          onPointerDown: (event: PointerEvent<SVGGElement>) => {
            if (event.button !== 0) return;
            event.preventDefault();
            onSelect?.(id);
            const p = point(event.clientX, event.clientY),
              node = event.currentTarget;
            node.setPointerCapture(event.pointerId);
            drag.current = {
              id,
              startX: p.x,
              startY: p.y,
              x,
              y,
              node,
              transform: transform(x, y, rotation, width, height),
              rotation,
              width,
              height,
              lastX: x,
              lastY: y,
            };
          },
          onPointerMove: move,
          onPointerUp: () => end(),
          onPointerCancel: () => end(true),
          onKeyDown: (event: React.KeyboardEvent<SVGGElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelect?.(id);
              return;
            }
            const delta = event.shiftKey ? 50 : 10;
            const offset: Record<string, [number, number]> = {
              ArrowLeft: [-delta, 0],
              ArrowRight: [delta, 0],
              ArrowUp: [0, -delta],
              ArrowDown: [0, delta],
            };
            const d = offset[event.key];
            if (d) {
              event.preventDefault();
              onSelect?.(id);
              onMove(
                id,
                Math.max(0, Math.min(design.width - width, x + d[0])),
                Math.max(0, Math.min(design.height - height, y + d[1])),
              );
            }
          },
          style: { touchAction: 'none', cursor: 'grab', outlineOffset: 4 },
        }
      : {};
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Thu nhỏ sơ đồ"
            disabled={zoom <= 8}
            onClick={() => {
              setAutoFit(false);
              setZoom((z) => Math.max(8, z - 10));
            }}
          >
            <Minus />
          </Button>
          <output className="w-12 text-center text-xs" aria-label="Mức phóng">
            {zoom}%
          </output>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Phóng to sơ đồ"
            disabled={zoom >= 150}
            onClick={() => {
              setAutoFit(false);
              setZoom((z) => Math.min(150, z + 10));
            }}
          >
            <Plus />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setAutoFit(true);
              setZoom(
                Math.max(
                  8,
                  Math.min(
                    100,
                    Math.floor(
                      (((viewport.current?.clientWidth ?? 800) - 24) / design.width) * 100,
                    ),
                  ),
                ),
              );
            }}
          >
            <Maximize />
            Vừa khung
          </Button>
        </div>
        {onMove && (
          <Button
            type="button"
            size="sm"
            variant={panMode ? 'secondary' : 'outline'}
            aria-pressed={panMode}
            onClick={() => setPanMode(!panMode)}
          >
            <Hand />
            Cuộn mặt bằng
          </Button>
        )}
        {toolbar}
      </div>
      <div
        ref={viewport}
        className="max-w-full overflow-auto rounded-2xl border bg-slate-50"
        style={{ height: 520, overscrollBehavior: 'contain' }}
        tabIndex={0}
        role="region"
        aria-label="Mặt bằng sân khấu và chỗ ngồi"
      >
        <svg
          ref={svg}
          style={{ touchAction: onMove && !panMode ? 'none' : 'auto' }}
          width={(design.width * zoom) / 100}
          height={(design.height * zoom) / 100}
          viewBox={`0 0 ${design.width} ${design.height}`}
          className="block select-none"
          aria-label="Sơ đồ bố trí chỗ ngồi"
          onDragOver={onTemplateDrop ? (e) => e.preventDefault() : undefined}
          onDrop={
            onTemplateDrop
              ? (e) => {
                  e.preventDefault();
                  const raw = e.dataTransfer.getData('application/tixflow-seats');
                  const match = /^(\d+),(\d+)$/.exec(raw);
                  if (match) {
                    const p = point(e.clientX, e.clientY);
                    onTemplateDrop(Number(match[1]), Number(match[2]), p.x, p.y);
                  }
                }
              : undefined
          }
        >
          <defs>
            <pattern id={pattern} width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1.4" fill="#cbd5e1" />
            </pattern>
          </defs>
          <rect
            width={design.width}
            height={design.height}
            fill={`url(#${pattern})`}
            onClick={() => onSelect?.('')}
          />
          <g
            transform={transform(
              design.stage.x,
              design.stage.y,
              0,
              design.stage.width,
              design.stage.height,
            )}
            {...handlers(
              'stage',
              design.stage.x,
              design.stage.y,
              design.stage.width,
              design.stage.height,
            )}
            aria-label="Di chuyển sân khấu"
            data-layout-stage
          >
            <rect
              width={design.stage.width}
              height={design.stage.height}
              rx="20"
              fill="#0f172a"
              stroke={selectedId === 'stage' ? '#7c3aed' : '#334155'}
              strokeWidth={selectedId === 'stage' ? 6 : 2}
            />
            <text
              x={design.stage.width / 2}
              y={design.stage.height / 2 + 8}
              textAnchor="middle"
              fill="white"
              fontSize="26"
              fontWeight="700"
              pointerEvents="none"
            >
              SÂN KHẤU
            </text>
          </g>
          {blocks.map((block, index) => {
            const zone = design.zones.find((z) => z.id === block.zoneId);
            const size = blockSize(block);
            const savedLabels =
              'rowLabels' in design.blocks[index]!
                ? (design.blocks[index] as typeof block).rowLabels
                : block.rowLabels;
            return (
              <g
                key={block.id}
                transform={transform(block.x, block.y, block.rotation, size.width, size.height)}
                {...handlers(block.id, block.x, block.y, size.width, size.height, block.rotation)}
                aria-label={`Di chuyển dãy ${index + 1} · ${zone?.name ?? 'Chưa chọn zone'}`}
                data-layout-block={block.id}
              >
                <rect
                  width={size.width}
                  height={size.height}
                  rx="12"
                  fill="white"
                  fillOpacity="0.95"
                  stroke={zone?.color ?? '#64748b'}
                  strokeWidth={selectedId === block.id ? 5 : 1.5}
                />
                <text
                  x="12"
                  y="25"
                  fontSize="17"
                  fontWeight="700"
                  fill={zone?.color ?? '#475569'}
                  pointerEvents="none"
                >
                  {zone?.name} · {index + 1}
                </text>
                {Array.from({ length: block.rows * block.columns }, (_, i) => {
                  const row = Math.floor(i / block.columns),
                    column = i % block.columns;
                  const code = `${savedLabels[row]}${String(column + 1).padStart(2, '0')}`;
                  const seat = byPosition.get(`${block.zoneId}:${savedLabels[row]}:${column + 1}`);
                  const status = seats
                    ? (seat?.status ?? 'UNAVAILABLE')
                    : block.disabledSeats.includes(i)
                      ? 'UNAVAILABLE'
                      : 'AVAILABLE';
                  const selected = !!seat && selectedSeats.includes(seat.id),
                    enabled = !!seat && !!onToggle && !locked && status === 'AVAILABLE';
                  const color = selected
                    ? '#0f172a'
                    : status === 'AVAILABLE'
                      ? (zone?.color ?? '#7c3aed')
                      : (statusColors[status] ?? '#cbd5e1');
                  return (
                    <g
                      key={i}
                      transform={`translate(${BLOCK_PADDING + column * SEAT_PITCH} ${BLOCK_HEADER + BLOCK_PADDING + row * SEAT_PITCH})`}
                      role={onToggle ? 'button' : undefined}
                      tabIndex={onToggle ? 0 : undefined}
                      aria-disabled={onToggle ? !enabled : undefined}
                      aria-pressed={onToggle ? selected : undefined}
                      aria-label={
                        onToggle
                          ? `Ghế ${code}: ${statusLabels[status]} · ${formatCurrency(seat?.priceVnd ?? zone?.priceVnd ?? 0)}`
                          : undefined
                      }
                      onClick={enabled ? () => onToggle?.(seat.id) : undefined}
                      onKeyDown={
                        enabled
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onToggle?.(seat.id);
                              }
                            }
                          : undefined
                      }
                      style={{ cursor: enabled ? 'pointer' : undefined }}
                    >
                      <title>
                        {code} · {formatCurrency(zone?.priceVnd ?? 0)} · {statusLabels[status]}
                      </title>
                      <rect
                        width={SEAT_SIZE}
                        height={SEAT_SIZE}
                        rx="8"
                        fill={color}
                        stroke={selected ? '#fbbf24' : color}
                        strokeWidth={selected ? 4 : 1}
                      />
                      <text
                        x={SEAT_SIZE / 2}
                        y="21"
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill={status === 'UNAVAILABLE' ? '#475569' : 'white'}
                        pointerEvents="none"
                      >
                        {status === 'UNAVAILABLE' ? '×' : code}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        {onMove
          ? 'Kéo dãy ghế hoặc sân khấu để di chuyển. Phím mũi tên để chỉnh vị trí. Bật “Cuộn mặt bằng” để lướt sơ đồ trên điện thoại.'
          : 'Phóng to để chọn ghế; cuộn trong mặt bằng để xem các khu vực.'}
      </p>
    </div>
  );
}
