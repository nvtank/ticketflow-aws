import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from '@/components/motion/reveal';
import { TeamGrid } from '@/components/discovery/team-grid';
import { FlowCta } from '@/components/discovery/flow-cta';
import { EditorialHero } from '@/components/world/editorial-hero';
import { DisplayHeading, SectionLabel } from '@/components/world/primitives';
export const metadata: Metadata = {
  title: 'Về chúng tôi',
  description: 'Câu chuyện và những con người xây dựng TikFlow.',
};
export default function AboutPage() {
  return (
    <div className="world-editorial">
      <EditorialHero
        eyebrow="Về TikFlow"
        title={
          <>
            Tin vào sức mạnh
            <br />
            <em>của việc có mặt.</em>
          </>
        }
        description="Có những điều chỉ chạm đến bạn khi ở đó. Chúng tôi xây dựng TikFlow để bạn đến gần hơn với những khoảnh khắc ấy."
        image="/images/live-stage.jpg"
        alt="Ánh sáng và khán giả trong một đêm nhạc trực tiếp"
        action={{ href: '/events', label: 'Khám phá những cuộc hẹn' }}
      />
      <section className="world-section">
        <div className="container editorial-story-grid">
          <Reveal>
            <SectionLabel>Chúng tôi là ai?</SectionLabel>
            <DisplayHeading>
              Cùng xây dựng.
              <br />
              Cùng kết nối.
            </DisplayHeading>
          </Reveal>
          <Reveal className="editorial-prose">
            <p>
              TikFlow là dự án nền tảng bán vé sự kiện của hoangphatdev, nguyen-van-hoan và nvtank.
              Cả nhóm cùng tìm hiểu cách tạo một hành trình đặt vé dễ dùng và chính xác.
            </p>
            <p>
              Từ khám phá sự kiện, giữ ghế đến nhận vé QR: mỗi phần phục vụ cùng một trải nghiệm.
            </p>
            <p className="editorial-note">
              Bản phát triển local. Sự kiện và nghệ sĩ có nhãn demo là dữ liệu minh họa.
            </p>
            <Link className="text-link" href="/contributors">
              Gặp đội ngũ phía sau TikFlow <ArrowUpRight className="size-4" />
            </Link>
          </Reveal>
        </div>
      </section>
      <section className="editorial-values">
        <div className="container">
          {[
            [
              '01',
              'Rõ ràng ở từng bước.',
              'Thông tin dễ hiểu. Trạng thái ghế, đơn hàng và vé được cập nhật từ hệ thống.',
            ],
            [
              '02',
              'Đúng với từng tấm vé.',
              'Giữ ghế, xác nhận thanh toán và check-in được kiểm tra tại máy chủ.',
            ],
            [
              '03',
              'Luôn có thể tốt hơn.',
              'Mã nguồn và tiến độ công khai trên GitHub. Góp ý của bạn giúp sản phẩm tiếp tục phát triển.',
            ],
          ].map(([number, title, text]) => (
            <Reveal key={number} className="editorial-value">
              <span>{number}</span>
              <h2>{title}</h2>
              <p>{text}</p>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="world-section">
        <div className="container">
          <div className="world-section-top">
            <div>
              <SectionLabel>The people behind the flow</SectionLabel>
              <DisplayHeading>
                Những người
                <br />
                đứng phía sau.
              </DisplayHeading>
            </div>
            <Link href="/contributors" className="text-link">
              Đội ngũ & cách đóng góp <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <TeamGrid />
        </div>
      </section>
      <FlowCta />
    </div>
  );
}
