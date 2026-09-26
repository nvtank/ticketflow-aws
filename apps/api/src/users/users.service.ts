import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PasswordService } from '../auth/password.service';
import { publicUser } from '../auth/public-user';
import type { ChangePasswordDto, UpdateProfileDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PasswordService) private readonly passwords: PasswordService,
  ) {}

  async updateProfile(userId: string, input: UpdateProfileDto) {
    const user = await this.database.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
      },
    });
    return publicUser(user);
  }

  async changePassword(userId: string, input: ChangePasswordDto): Promise<void> {
    if (input.currentPassword === input.newPassword)
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại.');
    const user = await this.database.user.findUnique({ where: { id: userId } });
    if (!user || !(await this.passwords.verify(input.currentPassword, user.passwordHash)))
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng.');
    const passwordHash = await this.passwords.hash(input.newPassword);
    await this.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (!current.isActive || current.passwordHash !== user.passwordHash)
        throw new UnauthorizedException('Thông tin đăng nhập đã thay đổi. Vui lòng thử lại.');
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await tx.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'AUTH_PASSWORD_CHANGED',
          entityType: 'User',
          entityId: userId,
        },
      });
    });
  }
}
