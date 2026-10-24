import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Heart, Fingerprint, Sparkles } from 'lucide-react';
import { Reveal } from '@/components/motion/reveal';
import { PageIntro, SectionHeading } from '@/components/discovery/section-heading';
import { TeamGrid } from '@/components/discovery/team-grid';
import { FlowCta } from '@/components/discovery/flow-cta';
export const metadata: Metadata = {
  title: 'Về chúng tôi',
  description:
    'Câu chuyện TixFlow và những con người xây dựng nền tảng kết nối khán giả với sự kiện.',
};
export default function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="Về TixFlow"
        title="Chúng tôi tin vào sức mạnh của việc có mặt."
        description="Có những giai điệu chỉ chạm đến bạn khi được nghe giữa đám đông. Có những kết nối chỉ bắt đầu khi bạn bước ra ngoài. TixFlow được xây dựng cho những khoảnh khắc ấy."
      />
      <section className="container py-14">
        <Reveal className="relative min-h-[360px] overflow-hidden rounded-[28px] md:min-h-[480px]">
          <Image
            src="/images/live-crowd.jpg"
            alt="Không gian lễ hội với khán giả và những chùm ánh sáng trên sân khấu"
            fill
            priority
            sizes="95vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-transparent" />
          <div className="absolute right-7 bottom-8 left-7 md:left-12">
            <p className="eyebrow text-cyan-200">More than a ticket</p>
            <p className="mt-4 max-w-2xl text-3xl leading-tight font-semibold tracking-tight text-white md:text-5xl">
              Không chỉ là chỗ ngồi.
              <br />
              Là một phần của khoảnh khắc.
            </p>
          </div>
        </Reveal>
      </section>
      <section className="container grid gap-10 pt-4 pb-20 md:grid-cols-[1fr_1.2fr]">
        <Reveal>
          <p className="eyebrow">Chúng tôi là ai?</p>
          <h2 className="section-title mt-4">
            Một nhóm xây dựng.
            <br />
            Một niềm quan tâm chung.
          </h2>
        </Reveal>
        <Reveal className="space-y-5 text-sm leading-8 text-muted-foreground">
          <p>
            TixFlow là dự án nền tảng bán vé sự kiện được phát triển bởi nhóm hoangphatdev,
            nguyen-van-hoan và nvtank. Chúng tôi cùng tìm hiểu cách một trải nghiệm đặt vé có thể
            vừa dễ sử dụng, vừa xử lý chính xác khi nhiều người chọn cùng một chỗ ngồi.
          </p>
          <p>
            Từ công cụ cho nhà tổ chức, sơ đồ ghế cập nhật trực tiếp đến tấm vé QR trong tài khoản,
            từng phần được xây dựng để cùng phục vụ một hành trình xuyên suốt.
          </p>
          <p>
            Hiện TixFlow là bản phát triển local. Những sự kiện và nghệ sĩ mang nhãn demo giúp bạn
            trải nghiệm sản phẩm; chúng không phải thông báo mở bán hay lịch biểu diễn thực tế.
          </p>
          <Link href="/contributors" className="text-link">
            Gặp đội ngũ phía sau TixFlow
            <ArrowUpRight className="size-4" />
          </Link>
        </Reveal>
      </section>
      <section className="border-y bg-white py-16">
        <div className="container">
          <SectionHeading
            eyebrow="Điều chúng tôi theo đuổi"
            title="Chăm chút điều nhỏ. Tôn trọng trải nghiệm lớn."
          />
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Heart,
                title: 'Bắt đầu từ người dùng',
                text: 'Thông tin rõ ràng, thao tác dễ hiểu và lối đi liền mạch từ khám phá đến nhận vé.',
              },
              {
                icon: Fingerprint,
                title: 'Đúng với từng tấm vé',
                text: 'Quyền giữ ghế, xác nhận thanh toán và kiểm tra vé được xử lý tại máy chủ, với các bước kiểm thử thực tế.',
              },
              {
                icon: Sparkles,
                title: 'Luôn sẵn sàng cải thiện',
                text: 'Mã nguồn và tiến độ được chia sẻ trên GitHub. Mỗi góp ý là một cơ hội để sản phẩm tốt hơn.',
              },
            ].map(({ icon: Icon, title, text }) => (
              <Reveal key={title} className="border-t pt-6">
                <Icon className="size-7 text-primary" strokeWidth={1.5} />
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="container py-20">
        <SectionHeading
          eyebrow="The people behind the flow"
          title="Được xây dựng cùng nhau."
          href="/contributors"
          linkLabel="Đội ngũ & cách đóng góp"
        />
        <TeamGrid />
      </section>
      <FlowCta />
    </>
  );
}
