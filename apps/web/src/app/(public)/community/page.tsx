import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, ArrowUpRight } from 'lucide-react';
import { ReviewFeed } from '@/components/discovery/reviews';
import { FlowCta } from '@/components/discovery/flow-cta';
import { EditorialHero } from '@/components/world/editorial-hero';
import { DisplayHeading, SectionLabel } from '@/components/world/primitives';
export const metadata: Metadata = { title: 'Cộng đồng & đánh giá' };
export default function CommunityPage() {
  return (
    <div className="world-editorial">
      <EditorialHero
        eyebrow="Cộng đồng TikFlow"
        title={
          <>
            Có mặt.
            <br />
            <em>Có chuyện để kể.</em>
          </>
        }
        description="Những chia sẻ về hành trình đặt vé, từ chính người mua. Cảm nhận thật tạo nên một cộng đồng tốt hơn."
        image="/images/live-crowd.jpg"
        alt="Đám đông cùng tận hưởng một buổi diễn ngoài trời"
        action={{ href: '/my-tickets', label: 'Chia sẻ trải nghiệm đặt vé' }}
      >
        <p className="editorial-verification">
          <BadgeCheck aria-hidden="true" />
          Đánh giá từ người sở hữu vé đã thanh toán, còn hợp lệ.
        </p>
      </EditorialHero>
      <section className="world-section">
        <div className="container">
          <div className="world-section-top">
            <div>
              <SectionLabel>Tiếng nói từ cộng đồng</SectionLabel>
              <DisplayHeading>
                Trải nghiệm thật.
                <br />
                Góc nhìn riêng.
              </DisplayHeading>
            </div>
            <Link href="/my-tickets" className="text-link">
              Xem vé để tìm sự kiện của bạn <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <ReviewFeed />
        </div>
      </section>
      <FlowCta />
    </div>
  );
}
