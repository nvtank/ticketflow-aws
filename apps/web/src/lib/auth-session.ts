'use client';

import { UserRole } from '@tixflow/shared';
import { z } from 'zod';
import { useAuthState } from '@/stores/auth';

export const authUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
  phone: z.string().nullable(),
  role: z.enum(UserRole),
});
export const authResponseSchema = z.object({
  user: authUserSchema,
  accessToken: z.string().min(10),
  expiresIn: z.number().int().positive(),
});

export class SessionRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

let refreshFlight: Promise<void> | undefined;

async function rotateSession(): Promise<void> {
  const epoch = useAuthState.getState().epoch;
  let response: Response;
  try {
    response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    useAuthState.getState().fail();
    throw new SessionRequestError('Không kết nối được máy chủ.', 0);
  }
  if (!response.ok) {
    if (response.status === 401 && useAuthState.getState().epoch === epoch)
      useAuthState.getState().clear();
    else if (response.status !== 401) useAuthState.getState().fail();
    throw new SessionRequestError('Không thể khôi phục phiên đăng nhập.', response.status);
  }
  const result = authResponseSchema.safeParse(await response.json().catch(() => null));
  if (!result.success) {
    useAuthState.getState().fail();
    throw new SessionRequestError('Dữ liệu phiên đăng nhập không hợp lệ.', 502);
  }
  if (useAuthState.getState().epoch === epoch) useAuthState.getState().accept(result.data);
}

export function refreshSession(): Promise<void> {
  refreshFlight ??= (async () => {
    // Serialize refresh across same-origin tabs, so a second tab sends the new
    // cookie rather than replaying a consumed token. Dedupe requests in this tab.
    if (typeof navigator !== 'undefined' && navigator.locks)
      await navigator.locks.request('tixflow-refresh-session', rotateSession);
    else await rotateSession();
  })().finally(() => {
    refreshFlight = undefined;
  });
  return refreshFlight;
}

export function roleHome(role: UserRole): string {
  return { CUSTOMER: '/profile', ORGANIZER: '/organizer', STAFF: '/staff', ADMIN: '/admin' }[role];
}

export function safeReturnTo(value: string | null, fallback: string): string {
  if (!value?.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  const parsed = new URL(value, 'http://local.invalid');
  if (parsed.origin !== 'http://local.invalid' || ['/login', '/register'].includes(parsed.pathname))
    return fallback;
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
