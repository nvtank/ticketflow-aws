import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowUpRight,
  Headphones,
  Lightbulb,
  Palette,
  Trophy,
  Ticket,
  MousePointer2,
  QrCode,
} from 'lucide-react';
import { Suspense } from 'react';
import { ExperienceHero } from '@/components/home/experience-hero';
import { EventCatalog } from '@/components/events/event-catalog';
import { ArtistCollection } from '@/components/discovery/artists';
import { ReviewFeed } from '@/components/discovery/reviews';
import { SectionHeading } from '@/components/discovery/section-heading';
import { FlowCta } from '@/components/discovery/flow-cta';
import { Reveal } from '@/components/motion/reveal';
import { Button } from '@/components/ui/button';
import { categories } from '@/lib/site';
const icons = [Headphones, Lightbulb, Palette, Trophy];
export default function HomePage() {
  return (
    <>
      <ExperienceHero />
      <section id="categories" className="container py-16 md:py-20">
        <Reveal>
          <SectionHeading
            eyebrow="Đi theo đam mê"
            title="Một thế giới. Nhiều nhịp cảm xúc."
            href="/events"
            linkLabel="Tất cả sự kiện"
          />
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category, index) => {
            const Icon = icons[index]!;
            return (
              <Reveal key={category.value} delay={index * 0.04}>
                <Link
                  href={`/events?category=${category.value}`}
                  className="group relative flex h-full flex-col rounded-2xl border bg-white p-6 transition-colors hover:border-violet-300 hover:bg-violet-50/40"
                >
                  <span className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      /{category.number}
                    </span>
                  </span>
                  <h3 className="mt-6 text-base font-bold">{category.name}</h3>
                  <p className="mt-2 text-xs text-muted-foreground">{category.description}</p>
                  <ArrowUpRight className="absolute right-5 bottom-5 size-4 text-primary transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>
      <section className="container pb-20">
        <Reveal>
          <SectionHeading
            eyebrow="Dành một chỗ cho niềm vui"
            title="Những cuộc hẹn đáng mong chờ."
            description="Lịch trình có thể bận. Nhưng đừng quên dành thời gian cho điều khiến bạn háo hức."
            href="/events"
            linkLabel="Xem lịch sự kiện"
          />
        </Reveal>
        <Suspense fallback={<p role="status">Đang tải sự kiện…</p>}>
          <EventCatalog />
        </Suspense>
      </section>
      <section className="bg-[#eeeaf8] py-16 md:py-20">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="Âm sắc & cá tính"
              title="Đằng sau mỗi sân khấu, một chất riêng."
              description="Tìm hiểu những gương mặt, phong cách âm nhạc và lịch hẹn tiếp theo cùng họ."
              href="/artists"
              linkLabel="Gặp gỡ nghệ sĩ"
            />
          </Reveal>
          <ArtistCollection />
        </div>
      </section>
      <section className="container grid items-center gap-10 py-20 lg:grid-cols-2 lg:gap-20">
        <Reveal className="relative">
          <div className="relative aspect-[1.1] overflow-hidden rounded-[28px]">
            <Image
              src="/images/live-crowd.jpg"
              alt="Khán giả hòa mình vào không gian lễ hội âm nhạc ngoài trời"
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
          <span className="absolute right-5 bottom-5 rounded-2xl bg-white/95 px-5 py-4 text-sm font-semibold backdrop-blur">
            Có những cảm xúc phải <span className="text-primary">ở đó.</span>
          </span>
        </Reveal>
        <Reveal>
          <p className="eyebrow">Một tấm vé, gần hơn với đam mê</p>
          <h2 className="section-title mt-4">
            Từ “muốn đi”
            <br />
            đến “mình đã ở đó”.
          </h2>
          <div className="mt-8 space-y-6">
            {[
              {
                icon: MousePointer2,
                title: 'Tìm đúng điều bạn thích',
                description: 'Khám phá sự kiện theo thể loại, địa điểm và thời gian của bạn.',
              },
              {
                icon: Ticket,
                title: 'Chọn chỗ cho khoảnh khắc',
                description: 'Xem sơ đồ ghế, chọn vị trí và xác nhận giữ chỗ trước khi thanh toán.',
              },
              {
                icon: QrCode,
                title: 'Mang theo vé. Sẵn sàng tận hưởng.',
                description: 'Vé QR được lưu trong tài khoản sau khi thanh toán được xác nhận.',
              },
            ].map(({ icon: Icon, title, description }, index) => (
              <div key={title} className="flex gap-4">
                <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl border bg-white text-primary">
                  <Icon className="size-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">
                    <span className="mr-2 text-slate-400">0{index + 1}</span>
                    {title}
                  </h3>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/guide" className="text-link mt-8">
            Xem hướng dẫn đặt vé
            <ArrowUpRight className="size-4" />
          </Link>
        </Reveal>
      </section>
      <section className="border-y bg-white py-16 md:py-20">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="Cộng đồng TixFlow"
              title="Trải nghiệm được kể bằng lời của bạn."
              description="Những chia sẻ về hành trình đặt vé, từ chính người mua. Không cần lời hoa mỹ, chỉ cần cảm nhận thật."
              href="/community"
              linkLabel="Ghé thăm cộng đồng"
            />
          </Reveal>
          <ReviewFeed compact />
        </div>
      </section>
      <section className="container grid gap-6 py-20 md:grid-cols-2">
        <Reveal className="rounded-[24px] bg-[#0b1020] p-8 text-white md:p-10">
          <p className="eyebrow text-cyan-300">Behind the flow</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Con người phía sau
            <br />
            những kết nối.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
            Chúng tôi xây dựng TixFlow với sự quan tâm dành cho từng chi tiết: từ tấm vé đầu tiên
            đến trải nghiệm của cả cộng đồng.
          </p>
          <Link href="/about" className="text-link mt-8 text-violet-300">
            Câu chuyện TixFlow
            <ArrowUpRight className="size-4" />
          </Link>
        </Reveal>
        <Reveal className="rounded-[24px] border border-violet-200 bg-violet-50 p-8 md:p-10">
          <p className="eyebrow">Dành cho nhà tổ chức</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Ý tưởng của bạn.
            <br />
            Sân khấu tiếp theo.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
            Tạo sự kiện, thiết lập sơ đồ ghế và theo dõi doanh thu. Một không gian để chăm chút hành
            trình của khán giả.
          </p>
          <Button asChild className="mt-8">
            <Link href="/organizer">
              Không gian nhà tổ chức
              <ArrowUpRight />
            </Link>
          </Button>
        </Reveal>
      </section>
      <FlowCta />
    </>
  );
}
