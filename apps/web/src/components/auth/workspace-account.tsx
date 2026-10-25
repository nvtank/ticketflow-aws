'use client';

import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiGet } from '@/lib/api-client';
import { authUserSchema } from '@/lib/auth-session';
import { useAuthState } from '@/stores/auth';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function WorkspaceAccount({ workspace }: { workspace: 'organizer' | 'staff' | 'admin' }) {
  const userId = useAuthState((state) => state.user?.id);
  const account = useQuery({
    queryKey: ['workspace', workspace, userId],
    queryFn: ({ signal }) =>
      apiGet(
        `/workspaces/${workspace}`,
        z.object({ workspace: z.string(), user: authUserSchema }),
        { signal },
      ),
    retry: false,
  });
  const organizations = useQuery({
    queryKey: ['organizations', userId],
    queryFn: ({ signal }) =>
      apiGet(
        '/organizations/me',
        z.array(z.object({ id: z.uuid(), name: z.string(), status: z.string() })),
        { signal },
      ),
    enabled: workspace === 'organizer',
  });
  return (
    <Card className="mb-8">
      <h2 className="font-semibold">Tài khoản được xác minh</h2>
      {account.isPending ? (
        <Skeleton className="mt-4 h-5 w-48" />
      ) : account.isError ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {account.error.message}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {account.data.user.name} · {account.data.user.email}
        </p>
      )}
      {workspace === 'organizer' && (
        <div className="mt-5 border-t pt-4">
          <h3 className="text-sm font-medium">Tổ chức của tôi</h3>
          {organizations.isPending ? (
            <Skeleton className="mt-3 h-5 w-40" />
          ) : organizations.isError ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {organizations.error.message}
            </p>
          ) : organizations.data?.length ? (
            <ul className="mt-2 space-y-2">
              {organizations.data.map((organization) => (
                <li key={organization.id} className="text-sm text-muted-foreground">
                  {organization.name} ·{' '}
                  {organization.status === 'APPROVED'
                    ? 'Đã duyệt'
                    : organization.status === 'PENDING'
                      ? 'Chờ duyệt'
                      : 'Bị từ chối'}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Bạn chưa được gán vào tổ chức nào.</p>
          )}
        </div>
      )}
    </Card>
  );
}
