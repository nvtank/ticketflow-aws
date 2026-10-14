'use client';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiGet, apiRequest } from '@/lib/api-client';
import { paymentConfigSchema, paymentSchema, verifiedCheckoutUrl } from '@/lib/payments';
import { Button } from '@/components/ui/button';
export function PaymentAction({ orderId }: { orderId: string }) {
  const router = useRouter();
  const key = useRef<string | null>(null);
  const config = useQuery({
    queryKey: ['payments', 'config'],
    queryFn: () => apiGet('/payments/config', paymentConfigSchema, { anonymous: true }),
  });
  const pay = useMutation({
    mutationFn: () => {
      key.current ??= crypto.randomUUID();
      return apiRequest('POST', '/payments/create', paymentSchema, {
        orderId,
        idempotencyKey: key.current,
      });
    },
    onSuccess: (session) => {
      if (session.status !== 'PENDING') {
        router.push(`/payment/success?paymentId=${session.id}`);
        return;
      }
      if (!session.checkoutUrl) {
        toast.error('Chưa có liên kết thanh toán. Hãy thử lại.');
        return;
      }
      try {
        window.location.assign(verifiedCheckoutUrl(session.checkoutUrl, session.provider));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Liên kết không hợp lệ.');
      }
    },
    onError: (e) => toast.error(e.message),
  });
  if (config.isPending)
    return <p className="text-sm text-muted-foreground">Đang tải phương thức thanh toán…</p>;
  if (config.isError)
    return (
      <Button variant="outline" onClick={() => void config.refetch()}>
        Tải lại phương thức thanh toán
      </Button>
    );
  if (!config.data?.available)
    return (
      <p className="text-sm text-muted-foreground">
        Thanh toán chưa được cấu hình. Bạn có thể hủy đơn và chọn lại sau.
      </p>
    );
  return (
    <div className="mb-5 space-y-3">
      <Button className="w-full" disabled={pay.isPending} onClick={() => pay.mutate()}>
        {pay.isPending
          ? 'Đang tạo liên kết…'
          : config.data.provider === 'payos'
            ? 'Thanh toán qua PayOS'
            : 'Thanh toán mô phỏng (local)'}
      </Button>
      <p className="text-xs leading-6 text-muted-foreground">
        Thanh toán không gia hạn giữ ghế. Vé chỉ được phát hành sau khi máy chủ xác minh giao dịch.
      </p>
    </div>
  );
}
