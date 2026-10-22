import type { Principal } from './auth.types';

// Business modules depend on this boundary, not on JWT or a future Cognito SDK.
export abstract class AuthProvider {
  abstract authenticate(token: string): Promise<Principal>;
  abstract issue(
    userId: string,
    sessionId: string,
  ): Promise<{ accessToken: string; expiresIn: number }>;
}
