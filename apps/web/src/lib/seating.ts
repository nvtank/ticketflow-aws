import { z } from 'zod';
import { blockSize, ZONE_COLORS, type SeatDesign } from '@tixflow/shared';
import type { EventDetail } from './events';
export const seatDesignSchema = z.object({
  version: z.literal(1),
  width: z.number().int().min(800).max(6000),
  height: z.number().int().min(600).max(6000),
  stage: z.object({
    x: z.number().int().min(0).max(6000),
    y: z.number().int().min(0).max(6000),
    width: z.number().int().min(80).max(2000),
    height: z.number().int().min(60).max(1000),
  }),
  zones: z
    .array(
      z.object({
        id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
        name: z.string().trim().min(1).max(60),
        priceVnd: z.number().int().min(0).max(100000000),
        color: z.string().regex(/^#[a-f0-9]{6}$/i),
      }),
    )
    .min(1)
    .max(8),
  blocks: z
    .array(
      z.object({
        id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
        zoneId: z.string(),
        x: z.number().int().min(0).max(6000),
        y: z.number().int().min(0).max(6000),
        rotation: z.number().int().min(-180).max(180),
        rows: z.number().int().min(1).max(26),
        columns: z.number().int().min(1).max(40),
        disabledSeats: z.array(z.number().int().min(0)).max(1040),
      }),
    )
    .min(1)
    .max(80),
});
export const savedSeatLayoutSchema = seatDesignSchema.extend({
  blocks: z.array(seatDesignSchema.shape.blocks.element.extend({ rowLabels: z.array(z.string()) })),
});
export function emptySeatDesign(): SeatDesign {
  return {
    version: 1,
    width: 2400,
    height: 1800,
    stage: { x: 900, y: 80, width: 600, height: 160 },
    zones: [{ id: 'zone-1', name: 'Standard', priceVnd: 499000, color: ZONE_COLORS[0] }],
    blocks: [],
  };
}
export type ExistingSeat = {
  sectionId: string;
  rowLabel: string;
  columnNumber: number;
  status: string;
};
export function initialSeatDesign(event: EventDetail, seats: ExistingSeat[]): SeatDesign {
  if (event.seatMapLayout) return seatDesignSchema.parse(event.seatMapLayout);
  if (!event.sections.length) return emptySeatDesign();
  const design = emptySeatDesign();
  design.zones = event.sections.map((s, i) => ({
    id: s.id,
    name: s.name,
    priceVnd: s.ticketType.priceVnd,
    color: ZONE_COLORS[i % ZONE_COLORS.length]!,
  }));
  let y = 340;
  design.blocks = event.sections.map((s, i) => {
    const rows = [
      ...new Set(seats.filter((seat) => seat.sectionId === s.id).map((seat) => seat.rowLabel)),
    ].sort((a, b) => a.length - b.length || a.localeCompare(b));
    const block = {
      id: `existing-${i}`,
      zoneId: s.id,
      x: 100,
      y,
      rotation: 0,
      rows: s.rowCount,
      columns: s.columnCount,
      disabledSeats: seats
        .filter((seat) => seat.sectionId === s.id && seat.status === 'UNAVAILABLE')
        .map((seat) => rows.indexOf(seat.rowLabel) * s.columnCount + seat.columnNumber - 1),
    };
    y += blockSize(block).height + 60;
    return block;
  });
  design.height = Math.min(6000, Math.max(1800, y));
  return design;
}
