import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { OAuth2Client, LoginTicket, VerifyIdTokenOptions } from 'google-auth-library';
import { z } from 'zod';
import { ENVIRONMENT } from '../../config/configuration.module';
import type { Environment } from '../../config/environment';
export const GOOGLE_OAUTH_CLIENT = Symbol('GOOGLE_OAUTH_CLIENT');
export interface GoogleVerificationClient {
  verifyIdToken(options: VerifyIdTokenOptions): Promise<LoginTicket>;
}
export function createGoogleVerificationClient(): GoogleVerificationClient {
  let client: Promise<OAuth2Client> | undefined;
  return {
    async verifyIdToken(options) {
      client ??= import('google-auth-library').then(
        ({ OAuth2Client }) =>
          new OAuth2Client({ transporterOptions: { timeout: 5000, retry: false } }),
      );
      return (await client).verifyIdToken(options);
    },
  };
}

const claims = z.object({
  sub: z.string().min(1).max(255),
  email: z.email().max(254),
  email_verified: z.literal(true),
  name: z.string().optional(),
  nonce: z.string().min(32).max(128),
});
export interface GoogleIdentity {
  subject: string;
  email: string;
  name: string;
}
export function verifiedGoogleIdentity(payload: unknown, nonce: string): GoogleIdentity {
  const result = claims.safeParse(payload);
  if (!result.success || result.data.nonce !== nonce)
    throw new UnauthorizedException('Thông tin Google hoặc phiên đăng nhập không hợp lệ.');
  const email = result.data.email.trim().toLowerCase();
  return {
    subject: result.data.sub,
    email,
    name: (result.data.name?.trim() || email.split('@')[0] || 'Khách TixFlow').slice(0, 100),
  };
}
@Injectable()
export class GoogleTokenVerifier {
  constructor(
    @Inject(ENVIRONMENT) private readonly env: Environment,
    @Inject(GOOGLE_OAUTH_CLIENT) private readonly client: GoogleVerificationClient,
  ) {}
  async verify(credential: string, nonce: string): Promise<GoogleIdentity> {
    if (!this.env.GOOGLE_CLIENT_ID)
      throw new ServiceUnavailableException('Đăng nhập Google chưa được cấu hình.');
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: this.env.GOOGLE_CLIENT_ID,
      });
      return verifiedGoogleIdentity(ticket.getPayload(), nonce);
    } catch {
      throw new UnauthorizedException('Google chưa xác minh được đăng nhập. Hãy bắt đầu lại.');
    }
  }
}
