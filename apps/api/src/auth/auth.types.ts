import type { AuthResponse, AuthUser } from '@tixflow/shared';
import type { ContextRequest } from '../common/http/request-context';

export interface Principal {
  user: AuthUser;
  sessionId: string;
}

export interface AuthRequest extends ContextRequest {
  principal?: Principal;
}

export interface AuthResult extends AuthResponse {
  refreshToken: string;
  refreshExpiresAt: Date;
}
