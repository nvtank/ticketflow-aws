import type { Metadata } from 'next';
import { SystemStatus } from '@/components/system-status';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Trạng thái hệ thống' };

export default function SystemPage() {
  return (
    <div className="container py-14 md:py-20">
      <Badge>Local development</Badge>
      <h1 className="mt-5 text-4xl font-bold tracking-tight">Trạng thái hệ thống</h1>
      <p className="mt-4 mb-10 max-w-2xl leading-7 text-muted-foreground">
        Thông tin được truy vấn trực tiếp từ backend. Nếu chưa khởi chạy Docker, PostgreSQL và Redis
        sẽ hiển thị chưa kết nối.
      </p>
      <SystemStatus />
    </div>
  );
}
