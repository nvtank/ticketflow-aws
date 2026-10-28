import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { labelSeatBlocks, seatDesignIssues, type SavedSeatLayout } from '@tixflow/shared';
import { Prisma } from '../generated/prisma/client';
import type { SeatDesignDto } from './seat-design.dto';
import type { GridDto } from './events.dto';
import { assertEditable, rowLabel, validateSections } from './event-policy';
import { auditEvent, eventInclude, eventView, lockEvent, requireMember } from './event-record';

@Injectable()
export class SeatManagementService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  async generate(id: string, userId: string, input: GridDto) {
    validateSections(input.sections);
    return this.db.$transaction(async (tx) => {
      const event = await lockEvent(tx, id);
      await requireMember(tx, event.organizationId, userId);
      assertEditable(event.status);
      const orders = await tx.order.count({ where: { eventId: id } });
      const holds = await tx.seatHold.count({ where: { eventId: id } });
      const occupied = await tx.seat.count({
        where: { eventId: id, status: { in: ['SOLD', 'HELD'] } },
      });
      if (orders || holds || occupied)
        throw new ConflictException(
          'Sơ đồ đã có đơn hàng hoặc lịch sử giữ ghế, không thể tạo lại.',
        );
      await tx.seat.deleteMany({ where: { eventId: id } });
      await tx.eventSection.deleteMany({ where: { eventId: id } });
      await tx.ticketType.deleteMany({ where: { eventId: id } });
      const types = new Map<string, string>();
      let offset = 0;
      for (const section of input.sections) {
        const ticketName = section.ticketName.trim();
        let typeId = types.get(ticketName);
        if (!typeId) {
          const type = await tx.ticketType.create({
            data: { eventId: id, name: ticketName, priceVnd: section.priceVnd },
          });
          typeId = type.id;
          types.set(ticketName, type.id);
        }
        const created = await tx.eventSection.create({
          data: {
            eventId: id,
            ticketTypeId: typeId,
            name: section.name.trim(),
            rowCount: section.rows,
            columnCount: section.columns,
          },
        });
        const seats = Array.from({ length: section.rows * section.columns }, (_, index) => {
          const row = rowLabel(offset + Math.floor(index / section.columns)),
            column = (index % section.columns) + 1;
          return {
            eventId: id,
            sectionId: created.id,
            code: `${row}${String(column).padStart(2, '0')}`,
            rowLabel: row,
            columnNumber: column,
          };
        });
        await tx.seat.createMany({ data: seats });
        offset += section.rows;
      }
      const updated = await tx.event.update({
        where: { id },
        data: {
          inventoryRevision: { increment: 1 },
          status: 'DRAFT',
          rejectionReason: null,
          seatMapLayout: Prisma.DbNull,
        },
        include: eventInclude,
      });
      await auditEvent(tx, id, userId, 'EVENT_GRID_GENERATED', {
        seatCount: input.sections.reduce((sum, s) => sum + s.rows * s.columns, 0),
      });
      return eventView(updated);
    });
  }
  async saveDesign(id: string, userId: string, input: SeatDesignDto) {
    const issues = seatDesignIssues(input);
    if (issues.length) throw new BadRequestException(issues);
    return this.db.$transaction(
      async (tx) => {
        const event = await lockEvent(tx, id);
        await requireMember(tx, event.organizationId, userId);
        assertEditable(event.status);
        if (event.inventoryRevision !== input.expectedRevision)
          throw new ConflictException(
            'Sơ đồ đã được thay đổi ở nơi khác. Tải lại trang trước khi lưu.',
          );
        const orders = await tx.order.count({ where: { eventId: id } });
        const holds = await tx.seatHold.count({ where: { eventId: id } });
        const occupied = await tx.seat.count({
          where: { eventId: id, status: { in: ['SOLD', 'HELD'] } },
        });
        if (orders || holds || occupied)
          throw new ConflictException(
            'Sơ đồ đã có giao dịch hoặc lịch sử giữ ghế, không thể thay thế.',
          );
        await tx.seat.deleteMany({ where: { eventId: id } });
        await tx.eventSection.deleteMany({ where: { eventId: id } });
        await tx.ticketType.deleteMany({ where: { eventId: id } });
        const sectionIds = new Map<string, string>();
        const zones: SavedSeatLayout['zones'] = [];
        for (const zone of input.zones) {
          const blocks = input.blocks.filter((b) => b.zoneId === zone.id);
          const type = await tx.ticketType.create({
            data: { eventId: id, name: zone.name.trim(), priceVnd: zone.priceVnd },
          });
          const section = await tx.eventSection.create({
            data: {
              eventId: id,
              ticketTypeId: type.id,
              name: zone.name.trim(),
              rowCount: blocks.reduce((sum, b) => sum + b.rows, 0),
              columnCount: Math.max(...blocks.map((b) => b.columns)),
            },
          });
          sectionIds.set(zone.id, section.id);
          zones.push({
            id: section.id,
            name: zone.name.trim(),
            priceVnd: zone.priceVnd,
            color: zone.color,
          });
        }
        const blocks = labelSeatBlocks(input.blocks).map((b) => ({
          ...b,
          zoneId: sectionIds.get(b.zoneId)!,
        }));
        const data = blocks.flatMap((block) =>
          Array.from({ length: block.rows * block.columns }, (_, index) => {
            const row = block.rowLabels[Math.floor(index / block.columns)]!;
            const column = (index % block.columns) + 1;
            return {
              eventId: id,
              sectionId: block.zoneId,
              rowLabel: row,
              columnNumber: column,
              code: `${row}${String(column).padStart(2, '0')}`,
              status: block.disabledSeats.includes(index)
                ? ('UNAVAILABLE' as const)
                : ('AVAILABLE' as const),
            };
          }),
        );
        await tx.seat.createMany({ data });
        const layout: SavedSeatLayout = {
          version: 1,
          width: input.width,
          height: input.height,
          stage: input.stage,
          zones,
          blocks,
        };
        const updated = await tx.event.update({
          where: { id },
          data: {
            seatMapLayout: JSON.parse(JSON.stringify(layout)) as Prisma.InputJsonObject,
            inventoryRevision: { increment: 1 },
            status: 'DRAFT',
            rejectionReason: null,
          },
          include: eventInclude,
        });
        await auditEvent(tx, id, userId, 'EVENT_SEAT_LAYOUT_SAVED', {
          seatCount: data.length,
          availableSeats: data.filter((s) => s.status === 'AVAILABLE').length,
          zoneCount: zones.length,
        });
        return eventView(updated);
      },
      { timeout: 15000 },
    );
  }
  async setEnabled(id: string, seatId: string, userId: string, enabled: boolean) {
    return this.db.$transaction(async (tx) => {
      const event = await lockEvent(tx, id);
      await requireMember(tx, event.organizationId, userId);
      assertEditable(event.status);
      const seat = await tx.seat.findFirst({ where: { id: seatId, eventId: id } });
      if (!seat) throw new NotFoundException('Không tìm thấy ghế trong sự kiện.');
      const changed = await tx.seat.updateMany({
        where: {
          id: seatId,
          eventId: id,
          status: { in: ['AVAILABLE', 'UNAVAILABLE'] },
          holdId: null,
        },
        data: { status: enabled ? 'AVAILABLE' : 'UNAVAILABLE' },
      });
      if (changed.count !== 1)
        throw new ConflictException('Không thể thay đổi ghế đã bán hoặc đang giữ.');
      const layout = event.seatMapLayout as unknown as SavedSeatLayout | null;
      if (layout) {
        const block = layout.blocks.find(
          (b) => b.zoneId === seat.sectionId && b.rowLabels.includes(seat.rowLabel),
        );
        if (block) {
          const index =
            block.rowLabels.indexOf(seat.rowLabel) * block.columns + seat.columnNumber - 1;
          block.disabledSeats = block.disabledSeats.filter((i) => i !== index);
          if (!enabled) block.disabledSeats.push(index);
        }
      }
      await tx.event.update({
        where: { id },
        data: {
          inventoryRevision: { increment: 1 },
          status: 'DRAFT',
          rejectionReason: null,
          ...(layout
            ? { seatMapLayout: JSON.parse(JSON.stringify(layout)) as Prisma.InputJsonObject }
            : {}),
        },
      });
      await auditEvent(tx, id, userId, 'EVENT_SEAT_CONFIGURED', { seatId, enabled });
      return { id: seatId, status: enabled ? 'AVAILABLE' : 'UNAVAILABLE' };
    });
  }
  async snapshot(id: string, userId: string) {
    const event = await this.db.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Không tìm thấy sự kiện.');
    await requireMember(this.db, event.organizationId, userId, false);
    const seats = await this.db.seat.findMany({
      where: { eventId: id },
      orderBy: [{ rowLabel: 'asc' }, { columnNumber: 'asc' }],
      include: { section: { include: { ticketType: true } } },
    });
    return {
      eventId: id,
      revision: event.inventoryRevision,
      serverTime: new Date(),
      seats: seats.map((s) => ({
        id: s.id,
        sectionId: s.sectionId,
        code: s.code,
        rowLabel: s.rowLabel,
        columnNumber: s.columnNumber,
        status: s.status,
        priceVnd: s.section.ticketType.priceVnd,
      })),
    };
  }
}
