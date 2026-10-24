import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, ArrowUpRight } from 'lucide-react';
import { PageIntro } from '@/components/discovery/section-heading';
import { ReviewFeed } from '@/components/discovery/reviews';
import { FlowCta } from '@/components/discovery/flow-cta';
export const metadata: Metadata = { title: 'Cộng đồng & đánh giá' };
export default function CommunityPage() {
  return (
    <>
      <PageIntro
        eyebrow="Cộng đồng TixFlow"
        title="Mỗi trải nghiệm, một câu chuyện riêng."
        description="Bạn chọn ghế thế nào? Nhận vé có thuận tiện không? Lắng nghe những chia sẻ về hành trình đặt vé từ chính người mua trên TixFlow."
      >
        <div className="mt-6 flex items-center gap-2 text-xs font-medium text-emerald-700">
          <BadgeCheck className="size-4" />
          Chỉ người có vé đã thanh toán, còn hợp lệ mới có thể đánh giá
        </div>
      </PageIntro>
      <section className="container py-14">
        <div className="mb-9 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Những chia sẻ mới nhất</h2>
          <Link href="/my-tickets" className="text-link">
            Xem vé để tìm sự kiện của bạn
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <ReviewFeed />
      </section>
      <FlowCta />
    </>
  );
}
