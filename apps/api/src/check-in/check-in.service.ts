import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { AdmissionResult, AttendanceStats } from '@tixflow/shared';
import { DatabaseService } from '../database/database.service';
import type { Prisma } from '../generated/prisma/client';
import { ENVIRONMENT } from '../config/configuration.module';
import type { Environment } from '../config/environment';
import { databaseNow, lockBookingEvent } from '../booking/booking-record';
import { InventoryPublisher } from '../booking/inventory-publisher';
import { credentialHash, verifyTicketCredential, ticketKey } from '../tickets/ticket-credential';
import { admissionMessages, admissionOutcome } from './check-in.policy';
import type { AdmissionDto } from './check-in.dto';
@Injectable()
export class CheckInService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(ENVIRONMENT) private readonly env: Environment,
    @Inject(InventoryPublisher) private readonly publisher: InventoryPublisher,
  ) {}
  async assigned(tx: Prisma.TransactionClient, eventId: string, userId: string, lock = false) {
    if (lock) {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${userId}::uuid FOR SHARE`;
    }
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { isActive: true, role: true },
    });
    const assigned = await tx.eventStaffAssignment.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (!user?.isActive || user.role !== 'STAFF' || !assigned)
      throw new ForbiddenException('Bạn chưa được phân công soát vé tại sự kiện này.');
  }
  private async resolve(tx: Prisma.TransactionClient, credential: string) {
    const value = credential.trim();
    const id = value.startsWith('tf1.') ? verifyTicketCredential(value, ticketKey(this.env)) : null;
    if (value.startsWith('tf1.') && !id) return null;
    if (!id && !/^TF-[A-Z0-9-]{1,46}$/i.test(value)) return null;
    const ticket = await tx.ticket.findUnique({
      where: id ? { id } : { code: value.toUpperCase() },
      include: { checkIn: true, seat: { include: { section: true } } },
    });
    if (id && ticket && (ticket.qrVersion !== 1 || ticket.qrTokenHash !== credentialHash(value)))
      return null;
    return ticket;
  }
  private async inspect(
    tx: Prisma.TransactionClient,
    input: AdmissionDto,
    userId: string,
    confirm: boolean,
  ) {
    const event = await lockBookingEvent(tx, input.eventId);
    await this.assigned(tx, event.id, userId, true);
    let ticket = await this.resolve(tx, input.credential);
    if (confirm && ticket) {
      await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id"=${ticket.id}::uuid FOR UPDATE`;
      ticket = await this.resolve(tx, input.credential);
    }
    const outcome = admissionOutcome(
      ticket,
      event.id,
      event.status === 'PUBLISHED' && event.organization.status === 'APPROVED',
    );
    const result: AdmissionResult = {
      outcome,
      message: admissionMessages[outcome],
      ticket:
        ticket && ticket.eventId === event.id
          ? {
              id: ticket.id,
              code: ticket.code,
              seatCode: ticket.seat.code,
              section: ticket.seat.section.name,
              status: ticket.status,
              checkedInAt: ticket.checkIn?.createdAt.toISOString() ?? null,
            }
          : null,
    };
    return { result, ticket, event };
  }
  async verify(userId: string, input: AdmissionDto) {
    return this.db.$transaction(
      async (tx) => (await this.inspect(tx, input, userId, false)).result,
    );
  }
  async confirm(userId: string, input: AdmissionDto) {
    const result = await this.db.$transaction(
      async (tx) => {
        const { result, ticket, event } = await this.inspect(tx, input, userId, true);
        if (result.outcome !== 'VALID' || !ticket) {
          if (result.outcome === 'ALREADY_USED' || result.outcome === 'EVENT_UNAVAILABLE')
            throw new ConflictException(result.message);
          throw new UnprocessableEntityException(result.message);
        }
        const now = await databaseNow(tx);
        const changed = await tx.ticket.updateMany({
          where: { id: ticket.id, eventId: event.id, status: 'VALID' },
          data: { status: 'USED' },
        });
        if (changed.count !== 1) throw new ConflictException(admissionMessages.ALREADY_USED);
        await tx.checkIn.create({ data: { ticketId: ticket.id, staffId: userId, createdAt: now } });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'TICKET_CHECKED_IN',
            entityType: 'Ticket',
            entityId: ticket.id,
            metadata: { eventId: event.id },
          },
        });
        const revision = await tx.event.update({
          where: { id: event.id },
          data: { checkInRevision: { increment: 1 } },
          select: { checkInRevision: true },
        });
        return {
          view: {
            ...result,
            outcome: 'CHECKED_IN' as const,
            message: admissionMessages.CHECKED_IN,
            ticket: { ...result.ticket!, status: 'USED' as const, checkedInAt: now.toISOString() },
          },
          hint: {
            eventId: event.id,
            revision: revision.checkInRevision,
            occurredAt: now.toISOString(),
          },
        };
      },
      { maxWait: 15000, timeout: 15000 },
    );
    this.publisher.checkinChanged(result.hint);
    return result.view;
  }
  async events(userId: string) {
    const events = await this.db.event.findMany({
      where: { assignments: { some: { userId } } },
      include: { venue: true, _count: { select: { seats: true } } },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });
    const items = [];
    for (const e of events) {
      const total = await this.db.ticket.count({
        where: { eventId: e.id, status: { in: ['VALID', 'USED'] } },
      });
      const checkedIn = await this.db.checkIn.count({ where: { ticket: { eventId: e.id } } });
      items.push({
        id: e.id,
        title: e.title,
        startsAt: e.startsAt.toISOString(),
        status: e.status,
        venueName: e.venue.name,
        totalTickets: total,
        checkedIn,
      });
    }
    return { items };
  }
  async stats(eventId: string, userId: string): Promise<AttendanceStats> {
    return this.db.$transaction(
      async (tx) => {
        await this.assigned(tx, eventId, userId);
        const event = await tx.event.findUniqueOrThrow({
            where: { id: eventId },
            select: { checkInRevision: true },
          }),
          now = await databaseNow(tx);
        const total = await tx.ticket.count({
          where: { eventId, status: { in: ['VALID', 'USED'] } },
        });
        const checkedIn = await tx.checkIn.count({ where: { ticket: { eventId } } });
        const cancelled = await tx.ticket.count({ where: { eventId, status: 'CANCELLED' } });
        const hourly = await tx.$queryRaw<
          { label: string; count: number }[]
        >`SELECT to_char(c."createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh','YYYY-MM-DD HH24:00') AS label,count(*)::int AS count FROM "CheckIn" c JOIN "Ticket" t ON t.id=c."ticketId" WHERE t."eventId"=${eventId}::uuid AND c."createdAt">=${new Date(now.getTime() - 86400000)} GROUP BY 1 ORDER BY 1`;
        return {
          eventId,
          revision: event.checkInRevision,
          serverTime: now.toISOString(),
          totalTickets: total,
          checkedIn,
          remaining: Math.max(0, total - checkedIn),
          cancelled,
          hourly,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
}
