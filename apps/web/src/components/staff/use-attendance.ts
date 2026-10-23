'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import type { RealtimeClientEvents, RealtimeServerEvents } from '@tixflow/shared';
import { z } from 'zod';
import { useAuthState } from '@/stores/auth';
import { refreshSession } from '@/lib/auth-session';
export function useAttendance(eventId: string) {
  const cache = useQueryClient();
  useEffect(() => {
    let disposed = false,
      refreshing = false;
    const socket: Socket<RealtimeServerEvents, RealtimeClientEvents> = io(
      process.env.NEXT_PUBLIC_REALTIME_URL ?? `${location.protocol}//${location.hostname}:4000`,
      {
        transports: ['websocket'],
        auth: (cb) => cb({ token: useAuthState.getState().accessToken }),
      },
    );
    const resync = () => {
      void cache.invalidateQueries({ queryKey: ['staff'] });
    };
    socket.on('connect', () =>
      socket.timeout(5000).emit('staff:event:join', { eventId }, () => resync()),
    );
    socket.on('checkin:updated', (raw) => {
      const hint = z.object({ eventId: z.uuid(), revision: z.number().int() }).safeParse(raw);
      if (hint.success && hint.data.eventId === eventId) resync();
    });
    socket.on('connect_error', (error) => {
      const data: unknown = 'data' in error ? error.data : null;
      if (
        typeof data === 'object' &&
        data !== null &&
        'code' in data &&
        data.code === 'UNAUTHENTICATED' &&
        !refreshing
      ) {
        refreshing = true;
        void refreshSession()
          .then(() => {
            if (!disposed) socket.connect();
          })
          .catch(() => {})
          .finally(() => {
            refreshing = false;
          });
      }
    });
    return () => {
      disposed = true;
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [eventId, cache]);
}
