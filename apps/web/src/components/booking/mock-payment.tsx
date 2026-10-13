'use client';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { UserRole } from '@tixflow/shared';
import { toast } from 'sonner';
import { AuthGate } from '@/components/auth/auth-gate';
import { apiGet, apiRequest } from '@/lib/api-client';
import { paymentSchema } from '@/lib/payments';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QueryNotice } from '@/components/events/event-detail';
export function MockPayment({ id }: { id: string }) {
  return (
    <AuthGate roles={[UserRole.CUSTOMER]} embedded>
      <Simulation id={id} />
    </AuthGate>
  );
}
function Simulation({ id }: { id: string }) {
  const router = useRouter();
  const query = useQuery({
    queryKey: ['payments', id],
    queryFn: () => apiGet(`/payments/${id}/status`, paymentSchema),
    retry: false,
  });
  const simulate = useMutation({
    mutationFn: (outcome: string) =>
      apiRequest('POST', `/payments/${id}/simulate`, paymentSchema, { outcome }),
    onSuccess: (p) =>
      router.push(
        `/payment/${p.status === 'FAILED' || p.status === 'CANCELLED' ? 'failed' : 'success'}?paymentId=${id}`,
      ),
    onError: (e) => toast.error(e.message),
  });
  if (!query.data)
    return (
      <div className="container py-16">
        <QueryNotice
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      </div>
    );
  if (query.data.provider !== 'mock')
    return (
      <div className="container py-16">
        <Card>Thanh toán này không hỗ trợ mô phỏng.</Card>
      </div>
    );
  return (
    <div className="container max-w-2xl py-16">
      <Card className="space-y-5">
        <p className="text-sm text-primary">Chỉ dành cho phát triển local/test</p>
        <h1 className="text-3xl font-bold">Mô phỏng thanh toán</h1>
        <p className="text-muted-foreground">
          Các thao tác được backend xác thực chủ đơn. Không áp dụng cho kênh PayOS thật.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['success', 'Thanh toán thành công'],
            ['failed', 'Thanh toán thất bại'],
            ['cancelled', 'Hủy thanh toán'],
            ['delayed', 'Thanh toán chậm 10 giây'],
            ['duplicate', 'Gửi callback trùng'],
          ].map(([value, label]) => (
            <Button
              key={value}
              variant={value === 'success' ? 'default' : 'outline'}
              disabled={simulate.isPending}
              onClick={() => simulate.mutate(value!)}
            >
              {label}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
