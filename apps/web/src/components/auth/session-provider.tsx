'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/stores/auth';
import { refreshSession } from '@/lib/auth-session';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const expiresAt = useAuthState((state) => state.expiresAt);
  useEffect(() => {
    void refreshSession().catch(() => {});
  }, []);
  useEffect(
    () =>
      useAuthState.subscribe((state, previous) => {
        if (state.user?.id !== previous.user?.id) {
          // Reset prior-account data without destroying entries: during hydration
          // even an in-flight public query can briefly have zero observers.
          // clear()/removeQueries() can orphan that observer in its loading state.
          void queryClient.resetQueries();
        }
      }),
    [queryClient],
  );
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(
      () => {
        void refreshSession().catch(() => {});
      },
      Math.max(0, expiresAt - Date.now() - 30_000),
    );
    return () => clearTimeout(timer);
  }, [expiresAt]);
  return children;
}
