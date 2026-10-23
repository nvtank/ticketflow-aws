import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import Redis from 'ioredis';
import { z } from 'zod';
import { ENVIRONMENT } from '../../config/configuration.module';
import type { Environment } from '../../config/environment';
export const GOOGLE_CHALLENGE_COOKIE = 'tixflow_google_challenge';
const lifetime = 300;
const record = z.object({
  nonce: z.string(),
  intent: z.enum(['login', 'link']),
  userId: z.string().nullable(),
  sessionId: z.string().nullable(),
});
@Injectable()
export class GoogleChallengeService implements OnApplicationShutdown {
  readonly redis: Redis;
  constructor(@Inject(ENVIRONMENT) private readonly env: Environment) {
    this.redis = new Redis(env.REDIS_URL, {
      lazyConnect: false,
      enableOfflineQueue: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      commandTimeout: 4000,
    });
    this.redis.on('error', () => {});
  }
  onApplicationShutdown() {
    this.redis.disconnect();
  }
  private options(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/google',
    };
  }
  private key(cookie: string) {
    return 'auth:google:' + createHash('sha256').update(cookie).digest('hex');
  }
  private configured() {
    if (!this.env.GOOGLE_CLIENT_ID)
      throw new ServiceUnavailableException('Đăng nhập Google chưa được cấu hình.');
  }
  async create(
    response: Response,
    intent: 'login' | 'link',
    userId: string | null = null,
    sessionId: string | null = null,
  ) {
    this.configured();
    const value = randomBytes(32).toString('base64url'),
      nonce = randomBytes(32).toString('base64url');
    try {
      await this.redis.set(
        this.key(value),
        JSON.stringify({ nonce, intent, userId, sessionId }),
        'EX',
        lifetime,
        'NX',
      );
    } catch {
      throw new ServiceUnavailableException('Chưa tạo được phiên Google. Vui lòng thử lại.');
    }
    response.setHeader('Cache-Control', 'no-store');
    response.cookie(GOOGLE_CHALLENGE_COOKIE, value, { ...this.options(), maxAge: lifetime * 1000 });
    return { nonce, expiresIn: lifetime, clientId: this.env.GOOGLE_CLIENT_ID };
  }
  clear(response: Response) {
    response.clearCookie(GOOGLE_CHALLENGE_COOKIE, this.options());
    response.setHeader('Cache-Control', 'no-store');
  }
  async inspect(
    request: Request,
    intent: 'login' | 'link',
    userId: string | null = null,
    sessionId: string | null = null,
  ) {
    this.configured();
    const cookies: unknown = request.cookies;
    const value =
      typeof cookies === 'object' && cookies !== null && GOOGLE_CHALLENGE_COOKIE in cookies
        ? (Reflect.get(cookies, GOOGLE_CHALLENGE_COOKIE) as unknown)
        : undefined;
    if (typeof value !== 'string' || !/^[-_A-Za-z0-9]{43}$/.test(value))
      throw new UnauthorizedException('Phiên Google đã hết hạn. Vui lòng thử lại.');
    const key = this.key(value);
    let raw: string | null;
    try {
      raw = await this.redis.get(key);
    } catch {
      throw new ServiceUnavailableException('Chưa kiểm tra được phiên Google.');
    }
    let payload: unknown;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      throw new UnauthorizedException('Phiên Google không hợp lệ.');
    }
    const parsed = record.safeParse(payload);
    if (
      !parsed.success ||
      parsed.data.intent !== intent ||
      parsed.data.userId !== userId ||
      parsed.data.sessionId !== sessionId
    )
      throw new UnauthorizedException('Phiên Google không khớp tài khoản hoặc đã hết hạn.');
    return { key, raw, nonce: parsed.data.nonce };
  }
  async consume(proof: { key: string; raw: string | null }) {
    let raw: string | null;
    try {
      raw = await this.redis.getdel(proof.key);
    } catch {
      throw new ServiceUnavailableException('Chưa hoàn tất được phiên Google.');
    }
    if (!raw || raw !== proof.raw)
      throw new UnauthorizedException('Phiên Google đã được sử dụng. Vui lòng thử lại.');
  }
}
