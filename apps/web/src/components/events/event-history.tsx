'use client';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { historySchema, dateTime } from '@/lib/events';
import { Card } from '@/components/ui/card';
import { QueryNotice } from './event-detail';
const labels: Record<string, string> = {
  EVENT_CREATED: 'Tạo sự kiện',
  EVENT_EDITED: 'Chỉnh sửa bản nháp',
  EVENT_GRID_GENERATED: 'Tạo sơ đồ ghế',
  EVENT_SEAT_CONFIGURED: 'Cấu hình ghế',
  EVENT_SUBMITTED: 'Gửi duyệt',
  EVENT_APPROVED: 'Phê duyệt',
  EVENT_REJECTED: 'Từ chối',
  EVENT_STAFF_ASSIGNED: 'Phân công nhân viên',
  EVENT_STAFF_REMOVED: 'Gỡ phân công',
};
export function EventHistory({ id, admin = false }: { id: string; admin?: boolean }) {
  const scope = admin ? 'admin' : 'organizer';
  const query = useQuery({
    queryKey: [scope, 'history', id],
    queryFn: () => apiGet(`/${scope}/events/${id}/history`, historySchema),
  });
  return (
    <Card>
      <h2 className="text-xl font-semibold">Lịch sử hoạt động và phê duyệt</h2>
      {query.data ? (
        <ol className="mt-5 space-y-4">
          {query.data.length ? (
            query.data.map((item) => (
              <li key={item.id} className="border-l-2 border-indigo-100 pl-4">
                <p className="text-sm font-medium">{labels[item.action] ?? item.action}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.actor?.name ?? 'Hệ thống'} · {dateTime(item.createdAt)}
                </p>
                {typeof item.metadata === 'object' &&
                  item.metadata !== null &&
                  'reason' in item.metadata && (
                    <p className="mt-2 text-sm text-red-600">{String(item.metadata.reason)}</p>
                  )}
              </li>
            ))
          ) : (
            <li>Chưa có hoạt động.</li>
          )}
        </ol>
      ) : (
        <QueryNotice
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      )}
    </Card>
  );
}
