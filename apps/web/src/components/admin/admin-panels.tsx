'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { z } from 'zod';
import { apiGet, apiRequest } from '@/lib/api-client';
import {
  adminDashboardSchema,
  adminUsersSchema,
  adminUserSchema,
  organizationsSchema,
  organizationSchema,
  monitorSchema,
} from '@/lib/reporting';
import { formatCurrency } from '@/lib/utils';
import { MetricGrid } from '@/components/analytics/report-widgets';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { QueryNotice } from '@/components/events/event-detail';
export function AdminOverview() {
  const q = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => apiGet('/admin/dashboard', adminDashboardSchema),
    refetchInterval: 10000,
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Tổng quan hệ thống</h1>
      <p className="text-muted-foreground">Dữ liệu đơn hàng, vé và tổ chức từ hệ thống hiện tại.</p>
      {q.data ? (
        <>
          <MetricGrid
            items={[
              { label: 'Người dùng', value: q.data.users },
              { label: 'Tổ chức', value: q.data.organizations },
              { label: 'Sự kiện', value: q.data.events },
              { label: 'Vé hợp lệ đã bán', value: q.data.tickets },
              { label: 'Doanh thu đơn PAID', value: formatCurrency(q.data.revenueVnd) },
              { label: 'Sự kiện chờ duyệt', value: q.data.pendingEvents },
              { label: 'Đã check-in', value: q.data.checkIns },
              { label: 'Cần xử lý hoàn tiền', value: q.data.refundRequired },
            ]}
          />
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/admin/events">Duyệt sự kiện</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/organizations">
                Tổ chức chờ duyệt ({q.data.pendingOrganizations})
              </Link>
            </Button>
          </div>
        </>
      ) : (
        <QueryNotice pending={q.isPending} error={q.error} retry={() => void q.refetch()} />
      )}
    </div>
  );
}
export function AdminUsers() {
  const cache = useQueryClient(),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [role, setRole] = useState(''),
    [target, setTarget] = useState<z.infer<typeof adminUserSchema> | null>(null),
    [reason, setReason] = useState('');
  const q = useQuery({
    queryKey: ['admin', 'users', page, search, role],
    queryFn: () =>
      apiGet(
        `/admin/users?page=${page}&q=${encodeURIComponent(search)}${role ? '&role=' + role : ''}`,
        adminUsersSchema,
      ),
  });
  const action = useMutation({
    mutationFn: () =>
      apiRequest('PATCH', `/admin/users/${target?.id}/access`, adminUserSchema, {
        isActive: !target?.isActive,
        reason,
      }),
    onSuccess: () => {
      toast.success('Đã cập nhật quyền truy cập tài khoản.');
      setTarget(null);
      setReason('');
      void cache.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Quản lý người dùng</h1>
      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-sm"
          aria-label="Tìm người dùng"
          placeholder="Tên hoặc email"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="rounded-xl border bg-card p-3 text-sm"
          aria-label="Lọc vai trò"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Mọi vai trò</option>
          {['CUSTOMER', 'ORGANIZER', 'STAFF', 'ADMIN'].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>
      {q.data ? (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="py-4">
                      {u.name}
                      <br />
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                      {u.phone && <p className="text-xs">{u.phone}</p>}
                    </td>
                    <td>{u.role}</td>
                    <td>{u.isActive ? 'Hoạt động' : 'Đã khóa'}</td>
                    <td>
                      <Button
                        variant="outline"
                        disabled={u.role === 'ADMIN'}
                        onClick={() => {
                          setTarget(u);
                          setReason('');
                        }}
                      >
                        {u.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!q.data.items.length && <p className="py-8">Không tìm thấy tài khoản.</p>}
          </Card>
          <Pages page={page} total={q.data.pagination.totalPages} setPage={setPage} />
        </>
      ) : (
        <QueryNotice pending={q.isPending} error={q.error} retry={() => void q.refetch()} />
      )}
      <Dialog
        open={!!target}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <DialogContent>
          <DialogTitle>{target?.isActive ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}</DialogTitle>
          <DialogDescription className="my-4">
            {target?.name} · {target?.email}. Khóa tài khoản sẽ thu hồi các phiên đăng nhập.
          </DialogDescription>
          <label className="text-sm">
            Lý do
            <Input
              aria-label="Lý do thay đổi quyền truy cập"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <Button
            className="mt-5"
            disabled={reason.trim().length < 10 || action.isPending}
            onClick={() => action.mutate()}
          >
            Xác nhận thay đổi
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function AdminOrganizations() {
  const cache = useQueryClient(),
    [page, setPage] = useState(1),
    [status, setStatus] = useState('PENDING'),
    [target, setTarget] = useState<z.infer<typeof organizationSchema> | null>(null),
    [decision, setDecision] = useState('APPROVED'),
    [reason, setReason] = useState('');
  const q = useQuery({
    queryKey: ['admin', 'organizations', page, status],
    queryFn: () =>
      apiGet(
        `/admin/organizations?page=${page}${status ? '&status=' + status : ''}`,
        organizationsSchema,
      ),
  });
  const review = useMutation({
    mutationFn: () =>
      apiRequest('PATCH', `/admin/organizations/${target?.id}/review`, organizationSchema, {
        decision,
        reason,
      }),
    onSuccess: () => {
      toast.success('Đã ghi nhận quyết định duyệt tổ chức.');
      setTarget(null);
      void cache.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Quản lý tổ chức</h1>
      <select
        className="rounded-xl border bg-card p-3"
        aria-label="Trạng thái tổ chức"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          setPage(1);
        }}
      >
        <option value="">Mọi trạng thái</option>
        <option value="PENDING">Chờ duyệt</option>
        <option value="APPROVED">Đã duyệt</option>
        <option value="REJECTED">Bị từ chối</option>
      </select>
      {q.data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {q.data.items.length ? (
              q.data.items.map((o) => (
                <Card key={o.id}>
                  <h2 className="text-lg font-semibold">{o.name}</h2>
                  <p className="my-3 text-sm">{o.status}</p>
                  {o.rejectionReason && (
                    <p className="mb-3 text-sm text-muted-foreground">{o.rejectionReason}</p>
                  )}
                  {o.status === 'PENDING' && (
                    <Button
                      onClick={() => {
                        setTarget(o);
                        setDecision('APPROVED');
                        setReason('');
                      }}
                    >
                      Xem xét tổ chức
                    </Button>
                  )}
                </Card>
              ))
            ) : (
              <Card>Không có tổ chức trong trạng thái này.</Card>
            )}
          </div>
          <Pages page={page} total={q.data.pagination.totalPages} setPage={setPage} />
        </>
      ) : (
        <QueryNotice pending={q.isPending} error={q.error} retry={() => void q.refetch()} />
      )}
      <Dialog
        open={!!target}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Phê duyệt tổ chức</DialogTitle>
          <DialogDescription className="my-4">{target?.name}</DialogDescription>
          <label className="block text-sm">
            Quyết định
            <select
              className="my-3 block w-full rounded-xl border p-3"
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
            >
              <option value="APPROVED">Duyệt tổ chức</option>
              <option value="REJECTED">Từ chối</option>
            </select>
          </label>
          <label className="text-sm">
            Lý do
            <Input
              aria-label="Lý do duyệt tổ chức"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <Button
            className="mt-5"
            disabled={reason.trim().length < 10 || review.isPending}
            onClick={() => review.mutate()}
          >
            Xác nhận quyết định
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Pages({
  page,
  total,
  setPage,
}: {
  page: number;
  total: number;
  setPage: (n: number) => void;
}) {
  return (
    <div className="flex justify-center gap-3">
      <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
        Trang trước
      </Button>
      <Button variant="outline" disabled={page >= total} onClick={() => setPage(page + 1)}>
        Trang sau
      </Button>
    </div>
  );
}
export function AdminMonitoring() {
  const q = useQuery({
    queryKey: ['admin', 'monitoring'],
    queryFn: () => apiGet('/admin/monitoring', monitorSchema),
    refetchInterval: 5000,
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Giám sát hệ thống</h1>
      <p className="text-sm text-muted-foreground">
        HTTP/Socket counters thuộc tiến trình API hiện tại; ghế đang giữ được đếm trực tiếp từ
        database.
      </p>
      {q.data ? (
        <>
          <MetricGrid
            items={[
              { label: 'HTTP requests', value: q.data.httpRequestsTotal },
              { label: 'Lỗi HTTP', value: q.data.httpErrorsTotal },
              { label: 'Socket đang kết nối', value: q.data.socketConnections },
              { label: 'Ghế đang giữ hợp lệ', value: q.data.validHeldSeats },
              { label: 'Giữ ghế thành công', value: q.data.seatHoldsSucceeded },
              { label: 'Giữ ghế thất bại', value: q.data.seatHoldsFailed },
              { label: 'Uptime (giây)', value: q.data.uptimeSeconds },
            ]}
          />
          <Card>
            <h2 className="mb-4 text-xl font-semibold">Phản hồi HTTP</h2>
            {Object.entries(q.data.requestsByStatus).map(([status, count]) => (
              <p className="border-t py-3 text-sm" key={status}>
                HTTP {status}: {count}
              </p>
            ))}
          </Card>
        </>
      ) : (
        <QueryNotice pending={q.isPending} error={q.error} retry={() => void q.refetch()} />
      )}
    </div>
  );
}
