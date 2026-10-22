import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@tixflow/shared';
import { DatabaseService } from '../database/database.service';
import type { Principal } from '../auth/auth.types';

@Injectable()
export class OrganizationsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async listMine(userId: string) {
    const members = await this.database.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });
    return members.map(({ organization }) => ({
      id: organization.id,
      name: organization.name,
      status: organization.status,
    }));
  }

  async getForMember(id: string, principal: Principal) {
    if (principal.user.role !== UserRole.ADMIN) {
      const membership = await this.database.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: id, userId: principal.user.id } },
      });
      if (!membership) throw new ForbiddenException('Bạn không thuộc tổ chức này.');
    }
    const organization = await this.database.organization.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, status: true },
    });
    if (!organization) throw new NotFoundException('Không tìm thấy tổ chức.');
    return organization;
  }
}
