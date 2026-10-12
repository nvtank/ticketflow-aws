import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { TicketView } from '@tixflow/shared';
import { DatabaseService } from '../database/database.service';
import type { Prisma } from '../generated/prisma/client';
import { ENVIRONMENT } from '../config/configuration.module';
import type { Environment } from '../config/environment';
import type { PageDto } from '../events/events.dto';
import { pagination } from '../events/event-record';
import { credentialHash, ticketCredential, ticketKey } from './ticket-credential';
const include = {
  orderItem: {
    include: {
      order: { include: { event: { include: { venue: true } } } },
      seat: { include: { section: true } },
    },
  },
} satisfies Prisma.TicketInclude;
type Record = Prisma.TicketGetPayload<{ include: typeof include }>;
@Injectable()
export class TicketsService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}
  private project(t: Record): TicketView {
    const order = t.orderItem.order,
      event = order.event;
    const credential = t.qrVersion === 1 ? ticketCredential(t.id, ticketKey(this.env)) : null;
    return {
      id: t.id,
      code: t.code,
      status: t.status,
      eventId: t.eventId,
      orderId: order.id,
      seatCode: t.orderItem.seat.code,
      section: t.orderItem.seat.section.name,
      priceVnd: t.orderItem.priceVnd,
      createdAt: t.createdAt.toISOString(),
      event: {
        title: event.title,
        slug: event.slug,
        startsAt: event.startsAt.toISOString(),
        venueName: event.venue.name,
        address: event.venue.address,
      },
      qrCredential:
        t.status === 'VALID' && credential && credentialHash(credential) === t.qrTokenHash
          ? credential
          : null,
    };
  }
  async get(id: string, userId: string) {
    const ticket = await this.db.ticket.findUnique({ where: { id }, include });
    if (!ticket) throw new NotFoundException('Không tìm thấy vé.');
    if (ticket.orderItem.order.userId !== userId)
      throw new ForbiddenException('Bạn không sở hữu vé này.');
    return this.project(ticket);
  }
  async list(userId: string, q: PageDto) {
    return this.db.$transaction(async (tx) => {
      const where = { orderItem: { order: { userId } } };
      const items = await tx.ticket.findMany({
        where,
        include,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: q.pageSize,
        skip: (q.page - 1) * q.pageSize,
      });
      const total = await tx.ticket.count({ where });
      return {
        items: items.map((t) => this.project(t)),
        pagination: pagination(q.page, q.pageSize, total),
      };
    });
  }
}
