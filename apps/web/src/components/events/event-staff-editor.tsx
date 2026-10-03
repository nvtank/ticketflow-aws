'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import { apiGet, apiRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QueryNotice } from './event-detail';
const assignment = z.object({
  id: z.string(),
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }),
});
export function EventStaffEditor({ id }: { id: string }) {
  const [email, setEmail] = useState(''),
    [removing, setRemoving] = useState<string | null>(null),
    cache = useQueryClient();
  const query = useQuery({
    queryKey: ['organizer', 'staff', id],
    queryFn: () => apiGet(`/organizer/events/${id}/staff`, z.array(assignment)),
  });
  const done = async () => {
    setEmail('');
    setRemoving(null);
    await cache.invalidateQueries({ queryKey: ['organizer'] });
  };
  const add = useMutation({
    mutationFn: () => apiRequest('POST', `/organizer/events/${id}/staff`, assignment, { email }),
    onSuccess: async () => {
      toast.success('Đã phân công nhân viên.');
      await done();
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (staffId: string) =>
      apiRequest('DELETE', `/organizer/events/${id}/staff/${staffId}`, z.undefined()),
    onSuccess: async () => {
      toast.success('Đã gỡ phân công.');
      await done();
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <Card>
      <h2 className="text-xl font-semibold">Nhân viên sự kiện</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Phân công tài khoản STAFF bằng email. Quyền soát vé chỉ áp dụng cho sự kiện được phân công
        khi phân hệ check-in mở.
      </p>
      <form
        className="mt-5 flex flex-wrap gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <label className="sr-only" htmlFor="staff-email">
          Email nhân viên
        </label>
        <Input
          id="staff-email"
          className="min-w-0 flex-1"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="staff@tixflow.local"
        />
        <Button disabled={add.isPending} type="submit">
          Phân công
        </Button>
      </form>
      {query.data ? (
        <ul className="mt-5 space-y-3">
          {query.data.length ? (
            query.data.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"
              >
                <span className="text-sm">
                  {item.user.name}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {item.user.email}
                  </span>
                </span>
                <Button variant="ghost" onClick={() => setRemoving(item.user.id)}>
                  Gỡ phân công
                </Button>
              </li>
            ))
          ) : (
            <li className="text-sm text-muted-foreground">Chưa phân công nhân viên.</li>
          )}
        </ul>
      ) : (
        <QueryNotice
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      )}
      <Dialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Gỡ phân công nhân viên?</DialogTitle>
          <DialogDescription className="mt-3 text-sm text-muted-foreground">
            Nhân viên này sẽ không còn được phân công cho sự kiện.
          </DialogDescription>
          <Button
            className="mt-5"
            disabled={remove.isPending}
            onClick={() => {
              if (removing) remove.mutate(removing);
            }}
          >
            Xác nhận gỡ
          </Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
