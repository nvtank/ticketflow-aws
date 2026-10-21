'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/api-client';
import { eventDetailSchema, type EventDetail } from '@/lib/events';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
export function WaitingSettings({ event }: { event: EventDetail }) {
  const cache = useQueryClient(),
    [enabled, setEnabled] = useState(event.waitingRoomEnabled),
    [capacity, setCapacity] = useState(event.waitingRoomCapacity);
  const save = useMutation({
    mutationFn: () =>
      apiRequest('PATCH', `/events/${event.id}/waiting-room/settings`, eventDetailSchema, {
        enabled,
        capacity,
      }),
    onSuccess: async () => {
      toast.success('Đã cập nhật phòng chờ.');
      await cache.invalidateQueries({ queryKey: ['organizer'] });
      await cache.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <Card className="space-y-4">
      <h2 className="text-xl font-semibold">Phòng chờ trước khi đặt vé</h2>
      <p className="text-sm text-muted-foreground">
        Giới hạn số phiên được chọn ghế cùng lúc. Khi giảm giới hạn, lượt đã cấp tiếp tục đến khi
        hết hạn. Đơn đang giữ ghế vẫn được thanh toán.
      </p>
      <label className="flex items-center gap-3">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Bật phòng chờ
      </label>
      <label className="block space-y-2">
        <span>Số phiên đặt vé đồng thời</span>
        <input
          className="block w-full rounded-xl border bg-background p-3"
          type="number"
          min={1}
          max={500}
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
        />
      </label>
      <Button
        disabled={save.isPending || !Number.isInteger(capacity) || capacity < 1 || capacity > 500}
        onClick={() => save.mutate()}
      >
        Lưu cấu hình phòng chờ
      </Button>
    </Card>
  );
}
