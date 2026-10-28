import 'reflect-metadata';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { blockSize, labelSeatBlocks, seatDesignIssues, type SeatDesign } from '@tixflow/shared';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type * as Dto from '../src/events/seat-design.dto';
const require = createRequire(import.meta.url);
const { SeatDesignDto } = require('../dist/events/seat-design.dto.js') as typeof Dto;
const design = (): SeatDesign => ({
  version: 1,
  width: 2400,
  height: 1800,
  stage: { x: 900, y: 80, width: 600, height: 160 },
  zones: [
    { id: 'vip', name: 'VIP', priceVnd: 1200000, color: '#7c3aed' },
    { id: 'standard', name: 'Standard', priceVnd: 499000, color: '#0284c7' },
  ],
  blocks: [
    {
      id: 'left',
      zoneId: 'vip',
      x: 200,
      y: 400,
      rotation: 15,
      rows: 2,
      columns: 5,
      disabledSeats: [0],
    },
    {
      id: 'right',
      zoneId: 'standard',
      x: 1000,
      y: 500,
      rotation: -15,
      rows: 1,
      columns: 8,
      disabledSeats: [],
    },
  ],
});
describe('Visual seat layout constraints', () => {
  it('accepts rotated rows, separate prices and disabled seats', () =>
    expect(seatDesignIssues(design())).toEqual([]));
  it('maps non-uniform blocks to unique stable seat row codes', () => {
    const input = design();
    input.blocks[0]!.rows = 26;
    expect(labelSeatBlocks(input.blocks).map((b) => b.rowLabels)).toEqual([
      Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
      ['AA'],
    ]);
    expect(blockSize(input.blocks[1]!)).toEqual({ width: 344, height: 96 });
  });
  it.each([
    (d: SeatDesign) => {
      d.blocks[1]!.zoneId = 'missing';
    },
    (d: SeatDesign) => {
      d.zones[1]!.name = ' vip ';
    },
    (d: SeatDesign) => {
      d.blocks[1]!.id = d.blocks[0]!.id;
    },
    (d: SeatDesign) => {
      d.blocks[0]!.id = 'stage';
    },
    (d: SeatDesign) => {
      d.blocks[0]!.disabledSeats = [0, 0];
    },
    (d: SeatDesign) => {
      d.blocks[0]!.disabledSeats = [10];
    },
    (d: SeatDesign) => {
      d.blocks[0]!.disabledSeats = Array.from({ length: 10 }, (_, i) => i);
    },
    (d: SeatDesign) => {
      d.blocks[1]!.x = 200;
      d.blocks[1]!.y = 400;
    },
    (d: SeatDesign) => {
      d.blocks[0]!.x = 1000;
      d.blocks[0]!.y = 100;
    },
    (d: SeatDesign) => {
      d.blocks[0]!.x = 0;
      d.blocks[0]!.rotation = 15;
    },
    (d: SeatDesign) => {
      d.blocks[0]!.x = 2390;
    },
    (d: SeatDesign) => {
      d.blocks = d.blocks.map((b) => ({ ...b, rows: 26, columns: 40 }));
    },
  ])('rejects unsafe geometry/inventory %s', (mutate) => {
    const d = design();
    mutate(d);
    expect(seatDesignIssues(d).length).toBeGreaterThan(0);
  });
  it('validates structural bounds and disallows client supplied row codes', async () => {
    const input = { ...design(), expectedRevision: 0 };
    expect(await validate(plainToInstance(SeatDesignDto, input))).toHaveLength(0);
    for (const bad of [
      { ...input, stage: null },
      { ...input, expectedRevision: -1 },
      { ...input, blocks: [] },
      { ...input, blocks: [{ ...input.blocks[0], rows: 1.2 }] },
      { ...input, blocks: [{ ...input.blocks[0], rowLabels: ['SOLD'] }] },
    ]) {
      expect(
        (
          await validate(plainToInstance(SeatDesignDto, bad), {
            whitelist: true,
            forbidNonWhitelisted: true,
          })
        ).length,
      ).toBeGreaterThan(0);
    }
  });
});
