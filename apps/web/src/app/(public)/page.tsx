import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  CalendarDays,
  Drama,
  MicVocal,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Suspense } from 'react';
import { StageArt } from '@/components/home/stage-art';
import { EventCatalog } from '@/components/events/event-catalog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const categories = [
  {
    name: 'Âm nhạc',
    value: 'MUSIC',
    icon: MicVocal,
    color: 'bg-violet-50 text-violet-600',
    description: 'Hòa cùng nhịp đam mê',
  },
  {
    name: 'Hội nghị & Workshop',
    value: 'CONFERENCE',
    icon: Sparkles,
    color: 'bg-cyan-50 text-cyan-700',
    description: 'Mở rộng những góc nhìn',
  },
  {
    name: 'Thể thao',
    value: 'SPORTS',
    icon: Trophy,
    color: 'bg-orange-50 text-orange-600',
    description: 'Bùng nổ từng giây phút',
  },
  {
    name: 'Nghệ thuật',
    value: 'ARTS',
    icon: Drama,
    color: 'bg-pink-50 text-pink-600',
    description: 'Cảm nhận điều khác biệt',
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero-grid relative overflow-hidden bg-[#0b1020] text-white">
        <div className="absolute -top-64 -left-72 size-[600px] rounded-full bg-indigo-700/10 blur-3xl" />
        <div className="container relative grid items-center gap-8 pt-14 pb-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-16 lg:pb-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[11px] font-medium tracking-[.12em] text-indigo-200 uppercase">
              <span className="size-1.5 rounded-full bg-cyan-400" />
              Nơi trải nghiệm bắt đầu
            </span>
            <h1 className="mt-7 text-[clamp(2.8rem,5.1vw,4.5rem)] leading-[1.13] font-extrabold tracking-[-.05em]">
              Đừng chỉ nghe kể.
              <br />
              Hãy{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent">
                ở đó.
              </span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-8 text-slate-400">
              Tiếng nhạc đầu tiên. Khoảnh khắc vỡ òa. Những kết nối bất ngờ. Tìm trải nghiệm tiếp
              theo của bạn cùng TixFlow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/events">
                  Khám phá sự kiện
                  <ArrowUpRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/15 text-white hover:bg-white/10"
              >
                <Link href="#categories">
                  Tìm cảm hứng
                  <ArrowDown />
                </Link>
              </Button>
            </div>
            <div className="mt-10 flex items-center gap-3 text-xs text-slate-400">
              <AudioLines className="size-5 text-violet-400" />
              <span>Mỗi đam mê đều xứng đáng có một chỗ ngồi.</span>
            </div>
          </div>
          <StageArt />
        </div>
        <div className="border-t border-white/10 bg-white/[.02]">
          <div className="container flex flex-wrap items-center justify-between gap-5 py-5 text-[11px] font-semibold tracking-[.18em] text-slate-400 uppercase">
            <span className="flex items-center gap-2 text-slate-200">
              <span className="size-1.5 rounded-full bg-cyan-400" />
              Find your flow
            </span>
            <span>Âm nhạc & đam mê</span>
            <span>Tri thức & kết nối</span>
            <span className="hidden sm:block">Thể thao & cảm xúc</span>
            <span className="text-violet-300">Một tấm vé. Vạn trải nghiệm.</span>
          </div>
        </div>
      </section>

      <section id="categories" className="container scroll-mt-6 py-16 md:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[.16em] text-primary uppercase">
              Theo đuổi điều bạn yêu
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Bạn thuộc về trải nghiệm nào?
            </h2>
          </div>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            Tất cả sự kiện
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map(({ name, value, icon: Icon, color, description }) => (
            <Link
              key={value}
              href={`/events?category=${value}`}
              className="group flex items-center gap-4 rounded-2xl border bg-white p-5 transition-colors hover:border-indigo-300"
            >
              <span
                className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${color}`}
              >
                <Icon className="size-6" />
              </span>
              <div>
                <h3 className="text-sm font-semibold group-hover:text-primary">{name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container pb-16 md:pb-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge>
              <CalendarDays className="size-3.5" />
              Lên lịch cho niềm vui
            </Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Những cuộc hẹn đáng mong chờ</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Dành một chỗ cho trải nghiệm tiếp theo của bạn.
            </p>
          </div>
        </div>
        <Suspense fallback={<p role="status">Đang tải sự kiện…</p>}>
          <EventCatalog />
        </Suspense>
      </section>

      <section className="container pb-20">
        <div className="relative overflow-hidden rounded-[24px] bg-[#eeedff] px-7 py-10 md:flex md:items-center md:justify-between md:gap-10 md:px-12">
          <div className="absolute -top-24 right-20 size-72 rounded-full border-[32px] border-indigo-200/30" />
          <div className="relative">
            <p className="text-xs font-semibold tracking-[.14em] text-primary uppercase">
              Dành cho nhà tổ chức
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
              Sự kiện của bạn.
              <br />
              Khởi đầu những kết nối.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">
              Cùng xây dựng không gian cho những ý tưởng lớn và những cộng đồng đầy đam mê.
            </p>
          </div>
          <Button asChild size="lg" className="relative mt-6 md:mt-0">
            <Link href="/organizer">
              Không gian nhà tổ chức
              <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
