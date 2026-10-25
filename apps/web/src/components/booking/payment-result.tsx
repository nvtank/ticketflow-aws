'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { UserRole } from '@tixflow/shared';
import { CheckCircle2, Clock3, CircleAlert } from 'lucide-react';
import { AuthGate } from '@/components/auth/auth-gate';
import { apiGet } from '@/lib/api-client';
import { paymentSchema } from '@/lib/payments';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QueryNotice } from '@/components/events/event-detail';
import { formatCurrency } from '@/lib/utils';
export function PaymentResult({ id }: { id: string | null }) {
  return (
    <AuthGate roles={[UserRole.CUSTOMER]} embedded>
      <Result id={id} />
    </AuthGate>
  );
}
function Result({ id }: { id: string | null }) {
  const query = useQuery({
    queryKey: ['payments', id],
    queryFn: () => apiGet(`/payments/${id}/status`, paymentSchema),
    enabled: !!id,
    refetchOnMount: 'always',
    retry: false,
    refetchInterval: (q) => (q.state.data?.status === 'PENDING' ? 5000 : false),
  });
  if (!id)
    return (
      <div className="container py-16">
        <Card>
          <h1 className="text-2xl font-bold">Thiếu mã thanh toán</h1>
          <p className="my-4">Mở đơn hàng của bạn để kiểm tra trạng thái.</p>
          <Button asChild>
            <Link href="/profile">Lịch sử đơn hàng</Link>
          </Button>
        </Card>
      </div>
    );
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
  const p = query.data,
    paid = p.status === 'SUCCEEDED' && p.orderStatus === 'PAID',
    review = p.status === 'REFUND_REQUIRED',
    pending = p.status === 'PENDING';
  const Icon = paid ? CheckCircle2 : pending ? Clock3 : CircleAlert;
  return (
    <div className="container max-w-2xl py-16">
      <Card className="space-y-5">
        <Icon
          aria-hidden
          className={`size-12 ${paid ? 'text-success' : pending ? 'text-info' : review ? 'text-warning' : 'text-danger'}`}
        />
        <h1 className="text-3xl font-bold">
          {paid
            ? 'Thanh toán đã được xác nhận'
            : review
              ? 'Giao dịch cần xử lý hoàn tiền'
              : pending
                ? 'Đang chờ xác nhận thanh toán'
                : 'Thanh toán chưa hoàn tất'}
        </h1>
        <p className="leading-7 text-muted-foreground">
          {paid
            ? 'Vé đã được phát hành và có trong tài khoản của bạn.'
            : review
              ? p.orderStatus === 'PAID'
                ? 'Đơn đã có vé hợp lệ và có khoản tiền thêm cần đối soát hoàn lại. Các vé đã phát hành vẫn được giữ nguyên. Việc hoàn tiền cần được xử lý riêng.'
                : 'Máy chủ đã ghi nhận tiền nhưng đơn không đủ điều kiện phát hành vé. Giao dịch được đánh dấu để xử lý hoàn tiền; đây chưa phải xác nhận đã hoàn tiền.'
              : pending
                ? 'Máy chủ chưa xác nhận thanh toán thành công. Trang sẽ tự kiểm tra lại; chỉ chuyển hướng về đây không làm đơn thành công.'
                : 'Giao dịch đã thất bại hoặc bị hủy theo kết quả máy chủ xác minh.'}
        </p>
        <p className="font-semibold">Số tiền: {formatCurrency(p.amountVnd)}</p>
        <p className="break-all text-xs text-muted-foreground">Mã thanh toán: {p.id}</p>
        {query.isError && (
          <p role="alert">
            Chưa thể đồng bộ với nhà cung cấp. Kết quả dưới đây là lần xác minh gần nhất.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {paid && (
            <Button asChild>
              <Link href="/my-tickets">Xem vé của tôi</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={`/checkout/${p.orderId}`}>Xem đơn hàng</Link>
          </Button>
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Kiểm tra lại
          </Button>
        </div>
      </Card>
    </div>
  );
}
