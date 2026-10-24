import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { Prisma } from '../generated/prisma/client';
import { eventInclude, eventView, pagination } from '../events/event-record';
import type { ArtistQueryDto, ReviewQueryDto, SaveReviewDto } from './discovery.dto';

const publicEvent = {
  status: 'PUBLISHED',
  organization: { status: 'APPROVED' },
} satisfies Prisma.EventWhereInput;
const reviewEvent = {
  status: { in: ['PUBLISHED', 'COMPLETED'] },
  organization: { status: 'APPROVED' },
} satisfies Prisma.EventWhereInput;
const reviewSelect = {
  id: true,
  eventId: true,
  rating: true,
  comment: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true } },
  event: { select: { slug: true, title: true } },
} satisfies Prisma.EventReviewSelect;

@Injectable()
export class DiscoveryService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  async artists(q: ArtistQueryDto) {
    const where: Prisma.ArtistWhereInput = {
      isPublished: true,
      ...(q.q ? { name: { contains: q.q, mode: 'insensitive' } } : {}),
      ...(q.genre ? { genre: q.genre } : {}),
      ...(q.eventId ? { events: { some: { eventId: q.eventId, event: publicEvent } } } : {}),
    };
    const [items, total, genres] = await Promise.all([
      this.db.artist.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: q.pageSize,
        skip: (q.page - 1) * q.pageSize,
        include: {
          _count: {
            select: {
              events: { where: { event: { ...publicEvent, startsAt: { gt: new Date() } } } },
            },
          },
        },
      }),
      this.db.artist.count({ where }),
      this.db.artist.findMany({
        where: { isPublished: true },
        distinct: ['genre'],
        select: { genre: true },
        orderBy: { genre: 'asc' },
      }),
    ]);
    return {
      items: items.map(({ _count, ...artist }) => ({ ...artist, upcomingEvents: _count.events })),
      genres: genres.map((g) => g.genre),
      pagination: pagination(q.page, q.pageSize, total),
    };
  }
  async artist(slug: string) {
    const artist = await this.db.artist.findFirst({ where: { slug, isPublished: true } });
    if (!artist) throw new NotFoundException('Không tìm thấy nghệ sĩ.');
    const events = await this.db.event.findMany({
      where: {
        ...publicEvent,
        startsAt: { gt: new Date() },
        artists: { some: { artistId: artist.id } },
      },
      include: eventInclude,
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: 24,
    });
    return { ...artist, events: events.map(eventView) };
  }
  async reviews(q: ReviewQueryDto) {
    const base: Prisma.EventReviewWhereInput = {
      event: reviewEvent,
      author: { isActive: true },
      ticket: { status: { in: ['VALID', 'USED'] }, orderItem: { order: { status: 'PAID' } } },
      ...(q.eventId ? { eventId: q.eventId } : {}),
    };
    const where = { ...base, ...(q.rating ? { rating: q.rating } : {}) };
    return this.db.$transaction(
      async (tx) => {
        const total = await tx.eventReview.count({ where });
        const items = await tx.eventReview.findMany({
          where,
          select: reviewSelect,
          take: q.pageSize,
          skip: (q.page - 1) * q.pageSize,
          orderBy: [
            ...(q.sort === 'highest' ? [{ rating: 'desc' as const }] : []),
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
        });
        const stats = await tx.eventReview.aggregate({
          where: base,
          _avg: { rating: true },
          _count: true,
        });
        const groups = await tx.eventReview.groupBy({ by: ['rating'], where: base, _count: true });
        return {
          items,
          pagination: pagination(q.page, q.pageSize, total),
          summary: {
            count: stats._count,
            average: stats._avg.rating,
            distribution: [5, 4, 3, 2, 1].map((rating) => ({
              rating,
              count: groups.find((g) => g.rating === rating)?._count ?? 0,
            })),
          },
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async context(eventId: string, userId: string) {
    const ticket = await this.db.ticket.findFirst({
      where: {
        eventId,
        status: { in: ['VALID', 'USED'] },
        orderItem: { order: { userId, status: 'PAID', event: reviewEvent } },
      },
      select: { id: true },
    });
    const review = await this.db.eventReview.findUnique({
      where: { eventId_authorId: { eventId, authorId: userId } },
      select: reviewSelect,
    });
    return { eligible: !!ticket, review };
  }
  async save(eventId: string, userId: string, data: SaveReviewDto) {
    return this.db.$transaction(async (tx) => {
      // Serialize repeated submissions from the same author, without holding external calls open.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${eventId + ':' + userId},0))::text`;
      const tickets = await tx.$queryRaw<{ id: string }[]>`
        SELECT t."id" FROM "Ticket" t JOIN "OrderItem" i ON i."id"=t."orderItemId"
        JOIN "Order" o ON o."id"=i."orderId" JOIN "Event" e ON e."id"=t."eventId"
        JOIN "Organization" org ON org."id"=e."organizationId"
        WHERE t."eventId"=${eventId}::uuid AND o."userId"=${userId}::uuid AND o."status"='PAID'
          AND t."status" IN ('VALID','USED') AND e."status" IN ('PUBLISHED','COMPLETED') AND org."status"='APPROVED'
        ORDER BY t."id" LIMIT 1 FOR SHARE OF t,o,e,org`;
      if (!tickets[0])
        throw new ForbiddenException(
          'Bạn cần vé đã thanh toán, còn hợp lệ của sự kiện để đánh giá trải nghiệm đặt vé.',
        );
      const review = await tx.eventReview.upsert({
        where: { eventId_authorId: { eventId, authorId: userId } },
        create: { eventId, authorId: userId, ticketId: tickets[0].id, ...data },
        update: { ...data, ticketId: tickets[0].id },
        select: reviewSelect,
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'REVIEW_SAVED',
          entityType: 'EventReview',
          entityId: review.id,
        },
      });
      return review;
    });
  }
  async remove(id: string, userId: string) {
    return this.db.$transaction(async (tx) => {
      const result = await tx.eventReview.deleteMany({ where: { id, authorId: userId } });
      if (!result.count) throw new NotFoundException('Không tìm thấy đánh giá của bạn.');
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'REVIEW_DELETED',
          entityType: 'EventReview',
          entityId: id,
        },
      });
      return { deleted: true };
    });
  }
}
