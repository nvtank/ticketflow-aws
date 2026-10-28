/** Logical canvas units; rendering and pointer conversion use the same geometry. */
export const SEAT_PITCH = 40;
export const SEAT_SIZE = 32;
export const BLOCK_PADDING = 12;
export const BLOCK_HEADER = 32;
export const ZONE_COLORS = [
  '#7c3aed',
  '#0284c7',
  '#059669',
  '#d97706',
  '#db2777',
  '#4f46e5',
  '#dc2626',
  '#475569',
] as const;
export interface SeatZone {
  id: string;
  name: string;
  priceVnd: number;
  color: string;
}
export interface SeatBlock {
  id: string;
  zoneId: string;
  x: number;
  y: number;
  rotation: number;
  rows: number;
  columns: number;
  disabledSeats: number[];
}
export interface SeatStage {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface SeatDesign {
  version: 1;
  width: number;
  height: number;
  stage: SeatStage;
  zones: SeatZone[];
  blocks: SeatBlock[];
}
export interface SavedSeatLayout extends Omit<SeatDesign, 'blocks'> {
  blocks: (SeatBlock & { rowLabels: string[] })[];
}
export function blockSize(block: Pick<SeatBlock, 'rows' | 'columns'>) {
  return {
    width: block.columns * SEAT_PITCH + BLOCK_PADDING * 2,
    height: block.rows * SEAT_PITCH + BLOCK_HEADER + BLOCK_PADDING * 2,
  };
}
export function seatRowLabel(index: number) {
  let label = '',
    value = index + 1;
  while (value > 0) {
    value--;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}
export function labelSeatBlocks(blocks: SeatBlock[]): SavedSeatLayout['blocks'] {
  let offset = 0;
  return blocks.map((block) => {
    const rowLabels = Array.from({ length: block.rows }, (_, row) => seatRowLabel(offset + row));
    offset += block.rows;
    return { ...block, rowLabels };
  });
}
type Point = { x: number; y: number };
export function rectangleCorners(rect: SeatStage & { rotation?: number }): Point[] {
  const angle = ((rect.rotation ?? 0) * Math.PI) / 180,
    c = Math.cos(angle),
    s = Math.sin(angle);
  const cx = rect.x + rect.width / 2,
    cy = rect.y + rect.height / 2;
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([sx, sy]) => {
    const x = (sx! * rect.width) / 2,
      y = (sy! * rect.height) / 2;
    return { x: cx + x * c - y * s, y: cy + x * s + y * c };
  });
}
function overlaps(a: Point[], b: Point[]) {
  for (const polygon of [a, b])
    for (let i = 0; i < 4; i++) {
      const p = polygon[i]!,
        q = polygon[(i + 1) % 4]!,
        axis = { x: -(q.y - p.y), y: q.x - p.x };
      const first = a.map((v) => v.x * axis.x + v.y * axis.y),
        second = b.map((v) => v.x * axis.x + v.y * axis.y);
      if (
        Math.max(...first) <= Math.min(...second) + 0.01 ||
        Math.max(...second) <= Math.min(...first) + 0.01
      )
        return false;
    }
  return true;
}
/** Cross-field rules, shared by the designer and API after structural DTO validation. */
export function seatDesignIssues(design: SeatDesign): string[] {
  const issues: string[] = [];
  if (design.blocks.some((b) => b.id === 'stage'))
    issues.push('Mã dãy ghế không được trùng với sân khấu.');
  const names = design.zones.map((z) => z.name.trim().toLocaleLowerCase());
  if (names.some((n) => !n) || new Set(names).size !== names.length)
    issues.push('Tên zone phải khác nhau và không để trống.');
  if (new Set(design.zones.map((z) => z.id)).size !== design.zones.length)
    issues.push('Mã zone bị trùng.');
  if (new Set(design.blocks.map((b) => b.id)).size !== design.blocks.length)
    issues.push('Mã dãy ghế bị trùng.');
  const total = design.blocks.reduce((sum, b) => sum + b.rows * b.columns, 0);
  if (total > 2000) issues.push('Mỗi sự kiện có tối đa 2.000 ghế.');
  for (const zone of design.zones) {
    const blocks = design.blocks.filter((b) => b.zoneId === zone.id);
    if (!blocks.length) issues.push(`Zone ${zone.name || 'chưa đặt tên'} cần ít nhất một dãy ghế.`);
    if (blocks.length && blocks.every((b) => b.disabledSeats.length === b.rows * b.columns))
      issues.push(`Zone ${zone.name} cần ít nhất một ghế mở bán.`);
  }
  const shapes = [
    { name: 'Sân khấu', corners: rectangleCorners(design.stage) },
    ...design.blocks.map((b, i) => ({
      name: `Dãy ${i + 1}`,
      corners: rectangleCorners({ ...b, ...blockSize(b) }),
    })),
  ];
  for (const [index, block] of design.blocks.entries()) {
    if (!design.zones.some((z) => z.id === block.zoneId))
      issues.push(`Dãy ${index + 1} chưa có zone hợp lệ.`);
    if (
      new Set(block.disabledSeats).size !== block.disabledSeats.length ||
      block.disabledSeats.some((s) => s < 0 || s >= block.rows * block.columns)
    )
      issues.push(`Ghế khóa của dãy ${index + 1} không hợp lệ.`);
  }
  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i]!;
    if (
      shape.corners.some(
        (p) =>
          p.x < -0.01 || p.y < -0.01 || p.x > design.width + 0.01 || p.y > design.height + 0.01,
      )
    )
      issues.push(`${shape.name} nằm ngoài mặt bằng.`);
    for (let j = i + 1; j < shapes.length; j++)
      if (overlaps(shape.corners, shapes[j]!.corners))
        issues.push(`${shape.name} chồng lên ${shapes[j]!.name.toLocaleLowerCase()}.`);
  }
  return issues;
}
