'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { ApiClientError } from '@/lib/api-client';
import { SessionProvider } from '@/components/auth/session-provider';
import { MotionProvider } from '@/components/motion/reveal';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: true,
            retry: (failureCount, error) =>
              failureCount < 1 &&
              (!(error instanceof ApiClientError) || error.status >= 500 || error.status === 0),
          },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <MotionProvider>
        <SessionProvider>{children}</SessionProvider>
      </MotionProvider>
      <Toaster richColors position="top-right" closeButton />
    </QueryClientProvider>
  );
}
