import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { EventStatus } from '../generated/prisma/client';
import type { CreateEventDto, EventFieldsDto, OrganizerQueryDto } from './events.dto';
import { assertEditable, validateDates } from './event-policy';
import {
  auditEvent,
  eventInclude,
  eventView,
  lockEvent,
  pagination,
  requireMember,
} from './event-record';

@Injectable()
export class OrganizerEventsService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  private data(input: EventFieldsDto) {
    validateDates(input);
    return {
      title: input.title,
      description: input.description,
      category: input.category,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      salesStartAt: new Date(input.salesStartAt),
      salesEndAt: new Date(input.salesEndAt),
      coverUrl: input.coverUrl ?? null,
      galleryUrls: input.galleryUrls,
      ticketPolicy: input.ticketPolicy,
      maxTicketsPerOrder: input.maxTicketsPerOrder,
    };
  }
  async create(userId: string, input: CreateEventDto) {
    const data = this.data(input);
    return this.db.$transaction(async (tx) => {
      await requireMember(tx, input.organizationId, userId);
      const event = await tx.event.create({
        data: {
          ...data,
          organization: { connect: { id: input.organizationId } },
          slug: `event-${randomUUID()}`,
          venue: { create: input.venue },
        },
        include: eventInclude,
      });
      await auditEvent(tx, event.id, userId, 'EVENT_CREATED');
      return eventView(event);
    });
  }
  async update(id: string, userId: string, input: EventFieldsDto) {
    const data = this.data(input);
    return this.db.$transaction(async (tx) => {
      const event = await lockEvent(tx, id);
      await requireMember(tx, event.organizationId, userId);
      assertEditable(event.status);
      if (await tx.order.count({ where: { eventId: id } }))
        throw new ConflictException('Không thể thay đổi thông tin khi sự kiện đã có đơn hàng.');
      // A new venue avoids editing a venue shared with another organization's event.
      const venue = await tx.venue.create({ data: input.venue });
      const updated = await tx.event.update({
        where: { id },
        data: { ...data, venueId: venue.id, status: 'DRAFT', rejectionReason: null },
        include: eventInclude,
      });
      await auditEvent(tx, id, userId, 'EVENT_EDITED');
      return eventView(updated);
    });
  }
  async remove(id: string, userId: string) {
    return this.db.$transaction(async (tx) => {
      const event = await lockEvent(tx, id);
      await requireMember(tx, event.organizationId, userId);
      assertEditable(event.status);
      if (
        (await tx.order.count({ where: { eventId: id } })) ||
        (await tx.seatHold.count({ where: { eventId: id } })) ||
        (await tx.waitingRoomSession.count({ where: { eventId: id } }))
      )
        throw new ConflictException('Không thể xóa sự kiện đã có giao dịch hoặc phiên tham gia.');
      await tx.seat.deleteMany({ where: { eventId: id } });
      await tx.eventSection.deleteMany({ where: { eventId: id } });
      await tx.ticketType.deleteMany({ where: { eventId: id } });
      await tx.eventStaffAssignment.deleteMany({ where: { eventId: id } });
      await auditEvent(tx, id, userId, 'EVENT_DRAFT_DELETED', { title: event.title });
      await tx.event.delete({ where: { id } });
    });
  }
  async list(userId: string, query: OrganizerQueryDto) {
    const where = {
      organization: { members: { some: { userId } } },
      ...(query.status ? { status: query.status as EventStatus } : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.event.findMany({
        where,
        include: eventInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.event.count({ where }),
    ]);
    return {
      items: items.map(eventView),
      pagination: pagination(query.page, query.pageSize, total),
    };
  }
  async detail(id: string, userId: string) {
    const event = await this.db.event.findUnique({ where: { id }, include: eventInclude });
    if (!event) throw new NotFoundException('Không tìm thấy sự kiện.');
    await requireMember(this.db, event.organizationId, userId, false);
    return eventView(event);
  }
  async overview(userId: string) {
    const scope = { organization: { members: { some: { userId } } } };
    const [totalEvents, sellingEvents, orders, totalSeats, soldSeats] = await this.db.$transaction([
      this.db.event.count({ where: scope }),
      this.db.event.count({
        where: {
          ...scope,
          status: 'PUBLISHED',
          salesStartAt: { lte: new Date() },
          salesEndAt: { gt: new Date() },
        },
      }),
      this.db.order.aggregate({
        where: { event: scope, status: 'PAID' },
        _sum: { totalVnd: true },
      }),
      this.db.seat.count({ where: { event: scope, status: { not: 'UNAVAILABLE' } } }),
      this.db.seat.count({ where: { event: scope, status: 'SOLD' } }),
    ]);
    return {
      totalEvents,
      sellingEvents,
      soldSeats,
      totalSeats,
      revenueVnd: orders._sum.totalVnd ?? 0,
      occupancy: totalSeats ? soldSeats / totalSeats : 0,
    };
  }
}
