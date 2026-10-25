'use client';
import { Button } from './button';
import { EmptyState } from './empty-state';
import { Skeleton } from './skeleton';
export function QueryNotice({
  pending,
  error,
  retry,
}: {
  pending: boolean;
  error: Error | null;
  retry: () => void;
}) {
  if (pending)
    return (
      <div role="status" aria-label="Đang tải dữ liệu" className="space-y-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-64" />
      </div>
    );
  if (error)
    return (
      <EmptyState
        title="Chưa thể tải dữ liệu"
        description={error.message}
        action={
          <Button variant="outline" onClick={retry}>
            Thử lại
          </Button>
        }
      />
    );
  return null;
}
