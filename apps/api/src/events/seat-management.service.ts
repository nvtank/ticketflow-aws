import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
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
        data: { inventoryRevision: { increment: 1 }, status: 'DRAFT', rejectionReason: null },
        include: eventInclude,
      });
      await auditEvent(tx, id, userId, 'EVENT_GRID_GENERATED', {
        seatCount: input.sections.reduce((sum, s) => sum + s.rows * s.columns, 0),
      });
      return eventView(updated);
    });
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
      await tx.event.update({
        where: { id },
        data: { inventoryRevision: { increment: 1 }, status: 'DRAFT', rejectionReason: null },
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
