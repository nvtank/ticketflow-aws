import type { GoogleIdentity } from './google/google-token-verifier';
import { createHash, randomBytes } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { User, UserSession } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { ENVIRONMENT } from '../config/configuration.module';
import type { Environment } from '../config/environment';
import { AuthProvider } from './auth-provider';
import { PasswordService } from './password.service';
import { publicUser } from './public-user';
import type { AuthResult } from './auth.types';
import type { LoginDto, RegisterDto } from './auth.dto';

export function hashRefreshToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
const days = (value: number) => value * 86_400_000;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PasswordService) private readonly passwords: PasswordService,
    @Inject(AuthProvider) private readonly provider: AuthProvider,
    @Inject(ENVIRONMENT) private readonly environment: Environment,
  ) {}

  private async newSession(tx: Prisma.TransactionClient, userId: string) {
    const now = new Date();
    const session = await tx.userSession.create({
      data: {
        userId,
        expiresAt: new Date(now.getTime() + days(this.environment.SESSION_MAX_DAYS)),
      },
    });
    const refresh = await this.newRefresh(tx, session, now);
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: 'AUTH_LOGIN',
        entityType: 'UserSession',
        entityId: session.id,
      },
    });
    return { session, refresh };
  }

  private async newRefresh(tx: Prisma.TransactionClient, session: UserSession, now: Date) {
    const value = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Math.min(
        session.expiresAt.getTime(),
        now.getTime() + days(this.environment.REFRESH_TOKEN_DAYS),
      ),
    );
    await tx.refreshToken.create({
      data: { sessionId: session.id, tokenHash: hashRefreshToken(value), expiresAt },
    });
    return { value, expiresAt };
  }

  private async result(
    user: User,
    session: UserSession,
    refresh: { value: string; expiresAt: Date },
  ): Promise<AuthResult> {
    const access = await this.provider.issue(user.id, session.id);
    return {
      user: publicUser(user),
      ...access,
      refreshToken: refresh.value,
      refreshExpiresAt: refresh.expiresAt,
    };
  }

  async register(input: RegisterDto): Promise<AuthResult> {
    const passwordHash = await this.passwords.hash(input.password);
    try {
      const created = await this.database.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: input.email.trim().toLowerCase(),
            name: input.name.trim(),
            passwordHash,
            role: 'CUSTOMER',
          },
        });
        const login = await this.newSession(tx, user.id);
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: 'AUTH_REGISTER',
            entityType: 'User',
            entityId: user.id,
          },
        });
        return { user, ...login };
      });
      return this.result(created.user, created.session, created.refresh);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Email đã được sử dụng.');
      throw error;
    }
  }

  async login(input: LoginDto): Promise<AuthResult> {
    const user = await this.database.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
    });
    const matches = await this.passwords.verify(input.password, user?.passwordHash);
    if (!user || !matches || !user.isActive)
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    const created = await this.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id}::uuid FOR UPDATE`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current?.isActive || current.passwordHash !== user.passwordHash)
        throw new UnauthorizedException('Thông tin đăng nhập đã thay đổi. Vui lòng thử lại.');
      return { user: current, ...(await this.newSession(tx, current.id)) };
    });
    return this.result(created.user, created.session, created.refresh);
  }

  async googleLogin(identity: GoogleIdentity): Promise<AuthResult> {
    try {
      const created = await this.database.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`google:${identity.subject}`}, 0))::text`;
          const linked = await tx.externalIdentity.findUnique({
            where: { provider_subject: { provider: 'GOOGLE', subject: identity.subject } },
          });
          let user: User;
          if (linked) {
            await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${linked.userId}::uuid FOR UPDATE`;
            user = await tx.user.findUniqueOrThrow({ where: { id: linked.userId } });
          } else {
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`google-email:${identity.email}`}, 0))::text`;
            if (await tx.user.findUnique({ where: { email: identity.email } }))
              throw new ConflictException(
                'Email đã có tài khoản. Hãy đăng nhập bằng phương thức hiện tại rồi liên kết Google trong hồ sơ.',
              );
            user = await tx.user.create({
              data: {
                email: identity.email,
                name: identity.name,
                passwordHash: null,
                role: 'CUSTOMER',
              },
            });
            await tx.externalIdentity.create({
              data: { provider: 'GOOGLE', subject: identity.subject, userId: user.id },
            });
            await tx.auditLog.create({
              data: {
                actorId: user.id,
                action: 'AUTH_GOOGLE_REGISTER',
                entityType: 'User',
                entityId: user.id,
              },
            });
          }
          if (!user.isActive) throw new UnauthorizedException('Tài khoản không khả dụng.');
          const login = await this.newSession(tx, user.id);
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: 'AUTH_GOOGLE_LOGIN',
              entityType: 'UserSession',
              entityId: login.session.id,
            },
          });
          return { user, ...login };
        },
        { maxWait: 10000, timeout: 10000 },
      );
      return this.result(created.user, created.session, created.refresh);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException(
          'Email đã có tài khoản. Hãy đăng nhập trước khi liên kết Google.',
        );
      throw error;
    }
  }

  async linkGoogle(userId: string, sessionId: string, identity: GoogleIdentity) {
    try {
      return await this.database.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`google:${identity.subject}`}, 0))::text`;
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${userId}::uuid FOR UPDATE`;
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
        const session = await tx.userSession.findFirst({
          where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: new Date() } },
        });
        if (!user.isActive || !session)
          throw new UnauthorizedException('Phiên đăng nhập không còn hiệu lực.');
        if (Date.now() - session.createdAt.getTime() > 600000)
          throw new ForbiddenException('Hãy đăng nhập lại trước khi liên kết Google.');
        if (identity.email !== user.email)
          throw new ConflictException(
            'Vui lòng chọn tài khoản Google có cùng email với tài khoản TixFlow.',
          );
        const existing = await tx.externalIdentity.findUnique({
          where: { provider_subject: { provider: 'GOOGLE', subject: identity.subject } },
        });
        if (existing && existing.userId !== userId)
          throw new ConflictException('Google này đã liên kết với tài khoản khác.');
        const own = await tx.externalIdentity.findUnique({
          where: { userId_provider: { userId, provider: 'GOOGLE' } },
        });
        if (own && own.subject !== identity.subject)
          throw new ConflictException('Tài khoản đã liên kết với một Google khác.');
        if (!existing) {
          const linked = await tx.externalIdentity.create({
            data: { userId, provider: 'GOOGLE', subject: identity.subject },
          });
          await tx.auditLog.create({
            data: {
              actorId: userId,
              action: 'AUTH_GOOGLE_LINKED',
              entityType: 'ExternalIdentity',
              entityId: linked.id,
            },
          });
        }
        return { linked: true };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Tài khoản Google đã được liên kết.');
      throw error;
    }
  }

  async methods(userId: string) {
    const user = await this.database.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        passwordHash: true,
        identities: { where: { provider: 'GOOGLE' }, select: { id: true } },
      },
    });
    return { hasPassword: !!user.passwordHash, googleLinked: user.identities.length > 0 };
  }

  async refresh(value?: string): Promise<AuthResult> {
    if (!value) throw new UnauthorizedException('Vui lòng đăng nhập lại.');
    const tokenHash = hashRefreshToken(value);
    const found = await this.database.refreshToken.findUnique({
      where: { tokenHash },
      include: { session: true },
    });
    if (!found) throw new UnauthorizedException('Phiên đăng nhập không hợp lệ.');
    const outcome = await this.database.$transaction(async (tx) => {
      // Same lock order as password changes/login: user, then stable session.
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${found.session.userId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "UserSession" WHERE "id" = ${found.sessionId}::uuid FOR UPDATE`;
      const token = await tx.refreshToken.findUnique({
        where: { tokenHash },
        include: { session: { include: { user: true } } },
      });
      const now = new Date();
      if (
        !token ||
        token.session.revokedAt ||
        token.session.expiresAt <= now ||
        !token.session.user.isActive
      )
        return null;
      if (token.consumedAt || token.expiresAt <= now) {
        await tx.userSession.update({ where: { id: token.sessionId }, data: { revokedAt: now } });
        await tx.auditLog.create({
          data: {
            actorId: token.session.userId,
            action: token.consumedAt ? 'AUTH_REFRESH_REPLAY' : 'AUTH_SESSION_EXPIRED',
            entityType: 'UserSession',
            entityId: token.sessionId,
          },
        });
        // Return before throwing: the revocation must commit, not roll back.
        return null;
      }
      const consumed = await tx.refreshToken.updateMany({
        where: { id: token.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) return null;
      const refresh = await this.newRefresh(tx, token.session, now);
      return { user: token.session.user, session: token.session, refresh };
    });
    if (!outcome) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn hoặc bị thu hồi.');
    return this.result(outcome.user, outcome.session, outcome.refresh);
  }

  async logout(value?: string, accessToken?: string): Promise<void> {
    const token = value
      ? await this.database.refreshToken.findUnique({
          where: { tokenHash: hashRefreshToken(value) },
          include: { session: true },
        })
      : null;
    let sessionId = token?.sessionId;
    let userId = token?.session.userId;
    if (!sessionId && accessToken) {
      try {
        const principal = await this.provider.authenticate(accessToken);
        sessionId = principal.sessionId;
        userId = principal.user.id;
      } catch (error) {
        if (!(error instanceof UnauthorizedException)) throw error;
      }
    }
    if (!sessionId || !userId) return;
    await this.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const changed = await tx.userSession.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (changed.count) {
        const session = await tx.userSession.findUniqueOrThrow({ where: { id: sessionId } });
        await tx.auditLog.create({
          data: {
            actorId: session.userId,
            action: 'AUTH_LOGOUT',
            entityType: 'UserSession',
            entityId: session.id,
          },
        });
      }
    });
  }
}
