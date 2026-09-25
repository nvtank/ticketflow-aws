import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { z } from 'zod';
import { DatabaseService } from '../database/database.service';
import { ENVIRONMENT } from '../config/configuration.module';
import type { Environment } from '../config/environment';
import { AuthProvider } from './auth-provider';
import type { Principal } from './auth.types';
import { publicUser } from './public-user';

const claimsSchema = z.object({
  sub: z.uuid(),
  sid: z.uuid(),
  tokenUse: z.literal('access'),
  exp: z.number().int().positive(),
});

@Injectable()
export class LocalJwtAuthProvider extends AuthProvider {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ENVIRONMENT) private readonly environment: Environment,
  ) {
    super();
  }

  override async issue(userId: string, sessionId: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, sid: sessionId, tokenUse: 'access' },
      {
        secret: this.environment.JWT_SECRET,
        algorithm: 'HS256',
        issuer: this.environment.JWT_ISSUER,
        audience: this.environment.JWT_AUDIENCE,
        expiresIn: this.environment.ACCESS_TOKEN_SECONDS,
      },
    );
    return { accessToken, expiresIn: this.environment.ACCESS_TOKEN_SECONDS };
  }

  override async authenticate(token: string): Promise<Principal> {
    let raw: unknown;
    try {
      raw = await this.jwt.verifyAsync<Record<string, unknown>>(token, {
        secret: this.environment.JWT_SECRET,
        algorithms: ['HS256'],
        issuer: this.environment.JWT_ISSUER,
        audience: this.environment.JWT_AUDIENCE,
      });
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    }
    const claims = claimsSchema.safeParse(raw);
    if (!claims.success) throw new UnauthorizedException('Access token không hợp lệ.');
    const session = await this.database.userSession.findUnique({
      where: { id: claims.data.sid },
      include: { user: true },
    });
    if (
      !session ||
      session.userId !== claims.data.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user.isActive
    ) {
      throw new UnauthorizedException('Phiên đăng nhập đã bị thu hồi.');
    }
    return { user: publicUser(session.user), sessionId: session.id };
  }
}
