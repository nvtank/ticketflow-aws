import { InventoryPublisher } from '../booking/inventory-publisher';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { auditEvent, lockEvent, requireMember } from './event-record';
const staffInclude = { user: { select: { id: true, name: true, email: true } } };
@Injectable()
export class EventStaffService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(InventoryPublisher) private readonly publisher: InventoryPublisher,
  ) {}
  async list(id: string, userId: string) {
    const event = await this.db.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Không tìm thấy sự kiện.');
    await requireMember(this.db, event.organizationId, userId, false);
    return this.db.eventStaffAssignment.findMany({
      where: { eventId: id },
      include: staffInclude,
      orderBy: { id: 'asc' },
    });
  }
  async assign(id: string, userId: string, email: string) {
    return this.db.$transaction(async (tx) => {
      const event = await lockEvent(tx, id);
      await requireMember(tx, event.organizationId, userId);
      const staff = await tx.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (!staff || staff.role !== 'STAFF' || !staff.isActive)
        throw new BadRequestException(
          'Không tìm thấy tài khoản STAFF đang hoạt động với email này.',
        );
      const result = await tx.eventStaffAssignment.upsert({
        where: { eventId_userId: { eventId: id, userId: staff.id } },
        update: {},
        create: { eventId: id, userId: staff.id },
        include: staffInclude,
      });
      await auditEvent(tx, id, userId, 'EVENT_STAFF_ASSIGNED', { userId: staff.id });
      return result;
    });
  }
  async remove(id: string, userId: string, staffId: string) {
    await this.db.$transaction(async (tx) => {
      const event = await lockEvent(tx, id);
      await requireMember(tx, event.organizationId, userId);
      await tx.eventStaffAssignment.deleteMany({ where: { eventId: id, userId: staffId } });
      await auditEvent(tx, id, userId, 'EVENT_STAFF_REMOVED', { staffId });
    });
    this.publisher.revokeStaff(staffId, id);
  }
}
