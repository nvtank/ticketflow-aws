import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Github } from 'lucide-react';
import { GuideFaq } from '@/components/discovery/guide-faq';
import { Reveal } from '@/components/motion/reveal';
import { EditorialHero } from '@/components/world/editorial-hero';
import { DisplayHeading, SectionLabel } from '@/components/world/primitives';
import { FlowCta } from '@/components/discovery/flow-cta';
import { repositoryUrl } from '@/lib/site';
export const metadata: Metadata = { title: 'Hướng dẫn & câu hỏi thường gặp' };
export default function GuidePage() {
  return (
    <div className="world-editorial">
      <EditorialHero
        eyebrow="Hướng dẫn đặt vé"
        title={
          <>
            Bớt băn khoăn.
            <br />
            <em>Thêm háo hức.</em>
          </>
        }
        description="Từ lần nhấn đầu tiên đến khoảnh khắc có mặt. Bốn bước để bạn sẵn sàng."
        image="/images/live-stage.jpg"
        alt="Ánh sáng sân khấu trong một buổi diễn âm nhạc"
        action={{ href: '#booking-guide', label: 'Bắt đầu hành trình' }}
      />
      <section id="booking-guide" className="world-section">
        <div className="container editorial-guide-layout">
          <div className="editorial-guide-sticky">
            <SectionLabel>Từ khám phá đến nhận vé</SectionLabel>
            <DisplayHeading>
              Đi từng bước.
              <br />
              Đến đúng nơi.
            </DisplayHeading>
            <Link href="#faq" className="text-link">
              Đi đến câu hỏi thường gặp <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <div>
            {[
              {
                title: 'Tìm sự kiện.',
                text: 'Chọn danh mục, ngày hoặc địa điểm. Đọc thông tin và chính sách của sự kiện.',
                href: '/events',
                label: 'Bắt đầu khám phá',
              },
              {
                title: 'Chọn & giữ ghế.',
                text: 'Chọn vị trí khả dụng và xác nhận giữ chỗ. Đồng hồ 5 phút bắt đầu khi máy chủ xác nhận thành công.',
                href: '/events',
                label: 'Tìm chỗ ngồi',
              },
              {
                title: 'Thanh toán.',
                text: 'Kiểm tra ghế, tổng tiền và thời gian còn lại. Chờ hệ thống xác nhận thanh toán.',
                href: '/profile',
                label: 'Xem đơn hàng',
              },
              {
                title: 'Có mặt. Tận hưởng.',
                text: 'Mở vé QR trong tài khoản và xuất trình vé hợp lệ để nhân viên xác minh tại cổng.',
                href: '/my-tickets',
                label: 'Mở vé của tôi',
              },
            ].map((step, index) => (
              <Reveal key={step.title} className="editorial-guide-step">
                <span className="editorial-step-number">0{index + 1}</span>
                <div>
                  <h2>{step.title}</h2>
                  <p>{step.text}</p>
                  <Link href={step.href} className="text-link">
                    {step.label}
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section id="faq" className="editorial-faq world-section">
        <div className="container editorial-story-grid">
          <div>
            <SectionLabel>Câu hỏi thường gặp</SectionLabel>
            <DisplayHeading>Cần biết thêm?</DisplayHeading>
            <a
              href={`${repositoryUrl}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link mt-8"
            >
              <Github className="size-4" />
              Báo lỗi trên GitHub <ArrowUpRight className="size-4" />
            </a>
            <p className="editorial-note mt-4">
              Không đăng mật khẩu, thông tin thanh toán hoặc mã QR khi báo lỗi.
            </p>
          </div>
          <GuideFaq />
        </div>
      </section>
      <FlowCta />
    </div>
  );
}
