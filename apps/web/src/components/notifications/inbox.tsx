'use client';
import { AccountNavigation } from '@/components/layout/account-navigation';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import { UserRole } from '@tixflow/shared';
import { AuthGate } from '@/components/auth/auth-gate';
import { apiGet, apiRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QueryNotice } from '@/components/events/event-detail';
import { dateTime } from '@/lib/events';
const inboxSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      title: z.string(),
      message: z.string(),
      readAt: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  unread: z.number(),
  pagination: z.object({ page: z.number(), totalPages: z.number() }),
});
export function InboxPage() {
  return (
    <AuthGate roles={Object.values(UserRole)} embedded>
      <Inbox />
    </AuthGate>
  );
}
function Inbox() {
  const [page, setPage] = useState(1),
    cache = useQueryClient();
  const query = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => apiGet(`/notifications/me?page=${page}`, inboxSchema),
    refetchInterval: 30000,
    retry: false,
  });
  const read = useMutation({
    mutationFn: (id: string) =>
      apiRequest('PATCH', `/notifications/${id}/read`, z.object({ read: z.boolean() })),
    onSuccess: () => cache.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (error) => toast.error(error.message),
  });
  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <AccountNavigation />
      <h1 className="text-3xl font-bold">Thông báo của tôi</h1>
      {query.data ? (
        <>
          <p className="text-sm text-muted-foreground">{query.data.unread} thông báo chưa đọc</p>
          {!query.data.items.length && <Card>Bạn chưa có thông báo.</Card>}
          {query.data.items.map((item) => (
            <Card key={item.id} className="space-y-3">
              <h2 className="text-lg font-semibold">
                {!item.readAt && (
                  <span
                    className="mr-2 inline-block size-2 rounded-full bg-primary"
                    aria-label="Chưa đọc"
                  />
                )}
                {item.title}
              </h2>
              <p className="whitespace-pre-wrap text-sm">{item.message}</p>
              <p className="text-xs text-muted-foreground">{dateTime(item.createdAt)}</p>
              {!item.readAt && (
                <Button
                  variant="outline"
                  disabled={read.isPending}
                  onClick={() => read.mutate(item.id)}
                >
                  Đánh dấu đã đọc
                </Button>
              )}
            </Card>
          ))}
          <div className="flex items-center justify-between">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Trang trước
            </Button>
            <span>Trang {page}</span>
            <Button
              variant="outline"
              disabled={page >= query.data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Trang sau
            </Button>
          </div>
        </>
      ) : (
        <QueryNotice
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      )}
    </div>
  );
}
