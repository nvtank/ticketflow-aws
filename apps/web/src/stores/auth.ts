'use client';

import { create } from 'zustand';
import type { AuthResponse, AuthUser } from '@tixflow/shared';

interface AuthState {
  status: 'loading' | 'authenticated' | 'anonymous' | 'error';
  user: AuthUser | null;
  accessToken: string | null;
  expiresAt: number;
  epoch: number;
  accept: (response: AuthResponse) => void;
  updateUser: (user: AuthUser) => void;
  clear: () => void;
  fail: () => void;
}

// Never add persistence: refresh credentials are in an HttpOnly cookie and the
// access JWT only lives in this tab's memory.
export const useAuthState = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  accessToken: null,
  expiresAt: 0,
  epoch: 0,
  accept: (response) =>
    set((state) => ({
      status: 'authenticated',
      user: response.user,
      accessToken: response.accessToken,
      expiresAt: Date.now() + response.expiresIn * 1000,
      epoch: state.epoch + 1,
    })),
  updateUser: (user) => set({ user }),
  clear: () =>
    set((state) => ({
      status: 'anonymous',
      user: null,
      accessToken: null,
      expiresAt: 0,
      epoch: state.epoch + 1,
    })),
  fail: () => set((state) => (state.user ? {} : { status: 'error' })),
}));
