import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Compass, Armchair, CreditCard, QrCode, Github } from 'lucide-react';
import { PageIntro, SectionHeading } from '@/components/discovery/section-heading';
import { GuideFaq } from '@/components/discovery/guide-faq';
import { Reveal } from '@/components/motion/reveal';
import { repositoryUrl } from '@/lib/site';
export const metadata: Metadata = { title: 'Hướng dẫn & câu hỏi thường gặp' };
export default function GuidePage() {
  return (
    <>
      <PageIntro
        eyebrow="Hướng dẫn đặt vé"
        title="Bớt băn khoăn. Thêm háo hức."
        description="Từ tìm sự kiện đến mở vé tại cổng — đây là những điều bạn cần biết để sẵn sàng cho trải nghiệm tiếp theo."
      />
      <section className="container py-14">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Compass,
              title: 'Tìm sự kiện',
              text: 'Chọn danh mục, ngày hoặc địa điểm. Đọc thông tin và chính sách của sự kiện.',
              href: '/events',
              label: 'Bắt đầu khám phá',
            },
            {
              icon: Armchair,
              title: 'Chọn & giữ ghế',
              text: 'Chọn ghế khả dụng và xác nhận giữ chỗ. Kiểm tra đồng hồ hết hạn sau khi giữ thành công.',
              href: '/events',
              label: 'Tìm chỗ ngồi',
            },
            {
              icon: CreditCard,
              title: 'Hoàn tất thanh toán',
              text: 'Kiểm tra ghế, tổng tiền và thời gian còn lại. Chờ hệ thống xác nhận kết quả thanh toán.',
              href: '/profile',
              label: 'Xem đơn hàng',
            },
            {
              icon: QrCode,
              title: 'Mở vé & tận hưởng',
              text: 'Vé QR nằm trong tài khoản của bạn. Xuất trình vé hợp lệ để nhân viên xác minh tại cổng.',
              href: '/my-tickets',
              label: 'Mở vé của tôi',
            },
          ].map(({ icon: Icon, title, text, href, label }, index) => (
            <Reveal key={title} delay={index * 0.04} className="rounded-2xl border bg-white p-6">
              <div className="flex items-center justify-between">
                <Icon className="size-6 text-primary" />
                <span className="text-xs text-slate-400">0{index + 1}</span>
              </div>
              <h2 className="mt-7 text-base font-semibold">{title}</h2>
              <p className="mt-3 text-xs leading-7 text-muted-foreground">{text}</p>
              <Link href={href} className="text-link mt-5">
                {label}
                <ArrowUpRight className="size-3" />
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
      <section id="faq" className="container grid gap-10 pt-4 pb-20 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <SectionHeading
            eyebrow="Câu hỏi thường gặp"
            title="Để bạn yên tâm hơn trước mỗi cuộc hẹn."
            description="Thông tin về giữ chỗ, thanh toán, vé QR và chia sẻ trải nghiệm."
          />
          <a
            href={`${repositoryUrl}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            <Github className="size-4" />
            Báo lỗi trên GitHub
            <ArrowUpRight className="size-4" />
          </a>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            Khi báo lỗi, không đăng mật khẩu, thông tin thanh toán hoặc mã QR của bạn.
          </p>
        </div>
        <GuideFaq />
      </section>
    </>
  );
}
