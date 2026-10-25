import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { DashboardRole } from '@/components/layout/dashboard-shell';
import { SystemStatus } from '@/components/system-status';
import { WorkspaceAccount } from '@/components/auth/workspace-account';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

const content = {
  ORGANIZER: {
    heading: 'Không gian nhà tổ chức',
    subtitle: 'Từ ý tưởng đầu tiên đến những khán đài đầy cảm xúc.',
    title: 'Sẵn sàng cho sự kiện đầu tiên',
    description:
      'Quản lý sự kiện, sơ đồ ghế và doanh thu sẽ khả dụng ở Phase 3. Các chỉ số bán vé chưa được triển khai.',
  },
  STAFF: {
    heading: 'Không gian soát vé',
    subtitle: 'Đón chào khán giả. Kết nối những trải nghiệm.',
    title: 'Chưa mở phân hệ check-in',
    description:
      'Danh sách sự kiện được phân công và quét QR sẽ được triển khai ở Phase 6. Giao diện này chưa cấp quyền check-in.',
  },
  ADMIN: {
    heading: 'Tổng quan hệ thống',
    subtitle: 'Theo dõi nền tảng TikFlow trong môi trường local.',
    title: 'Chưa có dữ liệu quản trị',
    description:
      'Quản lý người dùng và phê duyệt sự kiện sẽ được bổ sung ở Phase 3 và 6. Các chỉ số kinh doanh không được giả lập.',
  },
} as const;

export function DashboardOverview({ role }: { role: DashboardRole }) {
  const copy = content[role];
  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">
            Workspace / Tổng quan
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{copy.heading}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">
            Xem trang chủ
            <ArrowUpRight />
          </Link>
        </Button>
      </div>
      <WorkspaceAccount workspace={role.toLowerCase() as 'organizer' | 'staff' | 'admin'} />
      <div className="mb-9">
        <EmptyState title={copy.title} description={copy.description} />
      </div>
      <SystemStatus />
    </>
  );
}
