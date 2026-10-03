import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import type { EventQueryDto } from './events.dto';
import { eventInclude, eventView, pagination } from './event-record';

@Injectable()
export class PublicEventsService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  async list(query: EventQueryDto) {
    if (
      (query.from && query.to && new Date(query.from) > new Date(query.to)) ||
      (query.minPrice !== undefined &&
        query.maxPrice !== undefined &&
        query.minPrice > query.maxPrice)
    )
      throw new BadRequestException('Khoảng ngày hoặc giá không hợp lệ.');
    const minPrice = Prisma.sql`COALESCE((SELECT MIN(t."priceVnd") FROM "TicketType" t WHERE t."eventId"=e."id"),0)`;
    const terms = [
      Prisma.sql`e."status"='PUBLISHED'`,
      Prisma.sql`e."startsAt">${new Date()}`,
      Prisma.sql`o."status"='APPROVED'`,
    ];
    if (query.q)
      terms.push(Prisma.sql`e."title" ILIKE ${'%' + query.q.replace(/[\\%_]/g, '\\$&') + '%'}`);
    if (query.category) terms.push(Prisma.sql`e."category"=${query.category}`);
    if (query.city) terms.push(Prisma.sql`v."city"=${query.city}`);
    if (query.from) terms.push(Prisma.sql`e."startsAt">=${new Date(query.from)}`);
    if (query.to) terms.push(Prisma.sql`e."startsAt"<=${new Date(query.to)}`);
    if (query.minPrice !== undefined) terms.push(Prisma.sql`${minPrice}>=${query.minPrice}`);
    if (query.maxPrice !== undefined) terms.push(Prisma.sql`${minPrice}<=${query.maxPrice}`);
    const from = Prisma.sql`FROM "Event" e JOIN "Venue" v ON v."id"=e."venueId" JOIN "Organization" o ON o."id"=e."organizationId" WHERE ${Prisma.join(terms, ' AND ')}`;
    const sort =
      query.sort === 'price_asc'
        ? Prisma.sql`${minPrice} ASC`
        : query.sort === 'price_desc'
          ? Prisma.sql`${minPrice} DESC`
          : Prisma.sql`e."startsAt" ASC`;
    const [ids, counts] = await Promise.all([
      this.db.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT e."id" ${from} ORDER BY ${sort},e."id" ASC LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`,
      ),
      this.db.$queryRaw<{ total: number }[]>(Prisma.sql`SELECT COUNT(*)::int AS total ${from}`),
    ]);
    const events = await this.db.event.findMany({
      where: { id: { in: ids.map((i) => i.id) }, status: 'PUBLISHED' },
      include: eventInclude,
    });
    const byId = new Map(events.map((e) => [e.id, eventView(e)]));
    return {
      items: ids.flatMap((i) => {
        const event = byId.get(i.id);
        return event ? [event] : [];
      }),
      pagination: pagination(query.page, query.pageSize, counts[0]?.total ?? 0),
    };
  }
  async resolve(key: string) {
    const event = await this.db.event.findFirst({
      where: {
        status: 'PUBLISHED',
        organization: { status: 'APPROVED' },
        ...(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(key)
          ? { id: key }
          : { slug: key }),
      },
      include: eventInclude,
    });
    if (!event) throw new NotFoundException('Sự kiện chưa công bố hoặc không tồn tại.');
    return event;
  }
  async detail(key: string) {
    return eventView(await this.resolve(key));
  }
  async seats(key: string) {
    return this.db.$transaction(
      async (tx) => {
        const found = await tx.event.findFirst({
          where: {
            status: 'PUBLISHED',
            organization: { status: 'APPROVED' },
            ...(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(key)
              ? { id: key }
              : { slug: key }),
          },
        });
        if (!found) throw new NotFoundException('Sự kiện chưa công bố hoặc không tồn tại.');
        const now = new Date();
        const seats = await tx.seat.findMany({
          where: { eventId: found.id },
          orderBy: [{ rowLabel: 'asc' }, { columnNumber: 'asc' }],
          include: {
            hold: { select: { expiresAt: true, releasedAt: true } },
            section: { include: { ticketType: true } },
          },
        });
        return {
          eventId: found.id,
          revision: found.inventoryRevision,
          serverTime: now,
          seats: seats.map((s) => ({
            id: s.id,
            sectionId: s.sectionId,
            code: s.code,
            rowLabel: s.rowLabel,
            columnNumber: s.columnNumber,
            status:
              s.status === 'HELD' && s.hold && (s.hold.expiresAt <= now || s.hold.releasedAt)
                ? 'AVAILABLE'
                : s.status,
            priceVnd: s.section.ticketType.priceVnd,
          })),
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async inventory(key: string) {
    const event = eventView(await this.resolve(key));
    return {
      eventId: event.id,
      revision: event.inventoryRevision,
      serverTime: new Date(),
      availableSeats: event.availableSeats,
      sections: event.sections,
    };
  }
}
