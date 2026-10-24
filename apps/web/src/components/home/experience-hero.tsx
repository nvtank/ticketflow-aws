'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, AudioLines, Search } from 'lucide-react';
import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Button } from '@/components/ui/button';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function ExperienceHero() {
  const scope = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-hero-line]', {
          yPercent: 105,
          duration: 1.05,
          stagger: 0.13,
          ease: 'power3.out',
          clearProps: 'transform',
        });
        gsap.from('[data-hero-detail]', {
          y: 18,
          opacity: 0.5,
          duration: 0.85,
          stagger: 0.1,
          delay: 0.2,
          clearProps: 'all',
        });
      });
      media.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        gsap.to('[data-hero-image]', {
          yPercent: 7,
          ease: 'none',
          scrollTrigger: { trigger: scope.current, start: 'top top', end: 'bottom top', scrub: 1 },
        });
      });
      return () => media.revert();
    },
    { scope },
  );
  return (
    <section ref={scope} className="experience-hero">
      <div className="container relative grid gap-12 py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:py-20">
        <div className="relative z-10 flex flex-col justify-center">
          <p
            data-hero-detail
            className="mb-7 flex items-center gap-2.5 text-[11px] font-semibold tracking-[.19em] text-violet-200 uppercase"
          >
            <span className="size-2 rounded-full bg-cyan-300" />
            Live moments. Real connections.
          </p>
          <h1 className="hero-title">
            <span className="block overflow-hidden pb-1">
              <span data-hero-line className="block">
                Đừng chỉ{' '}
              </span>
            </span>
            <span className="block overflow-hidden pb-1">
              <span data-hero-line className="block">
                nghe kể.
              </span>
            </span>
            <span className="block overflow-hidden pb-3">
              <span data-hero-line className="block text-violet-300">
                Hãy ở đó<span className="text-cyan-300">.</span>
              </span>
            </span>
          </h1>
          <p
            data-hero-detail
            className="mt-5 max-w-md text-sm leading-8 text-slate-300 md:text-base"
          >
            Một đêm nhạc khiến bạn quên thời gian.
            <br className="hidden sm:block" /> Một cuộc gặp mở ra điều mới. Tất cả bắt đầu từ một
            tấm vé.
          </p>
          <form action="/events" data-hero-detail className="hero-search mt-8">
            <Search className="ml-1 size-5 shrink-0 text-violet-300" />
            <label htmlFor="hero-search" className="sr-only">
              Tìm trải nghiệm của bạn
            </label>
            <input
              id="hero-search"
              name="q"
              type="search"
              maxLength={120}
              placeholder="Bạn muốn đi đâu, nghe gì?"
              className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none"
            />
            <Button
              type="submit"
              aria-label="Tìm sự kiện"
              size="icon"
              className="rounded-xl bg-violet-500 hover:bg-violet-400"
            >
              <ArrowUpRight />
            </Button>
          </form>
          <div
            data-hero-detail
            className="mt-7 flex flex-wrap items-center gap-5 text-xs text-slate-300"
          >
            <Link
              href="/events"
              className="inline-flex items-center gap-2 font-semibold text-white"
            >
              Khám phá sự kiện
              <ArrowUpRight className="size-4" />
            </Link>
            <span className="h-4 w-px bg-white/20" />
            <Link href="/#categories" className="inline-flex items-center gap-2 hover:text-white">
              Tìm cảm hứng
              <ArrowDown className="size-3.5" />
            </Link>
          </div>
        </div>
        <div data-hero-detail className="hero-collage">
          <div className="hero-photo">
            <Image
              data-hero-image
              src="/images/live-stage.jpg"
              alt="Ánh đèn rực rỡ trên sân khấu một đêm nhạc, khán giả cùng giơ tay hòa nhịp"
              fill
              priority
              sizes="(min-width: 1024px) 52vw, 95vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1020]/90 via-transparent to-transparent" />
            <div className="absolute right-5 bottom-8 left-6">
              <span className="text-[10px] tracking-[.24em] text-cyan-200 uppercase">
                Your next core memory
              </span>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                Cảm xúc thật.
                <br />
                Khoảnh khắc của bạn.
              </p>
            </div>
            <span className="absolute top-5 left-5 rounded-full border border-white/25 bg-black/20 px-3 py-2 text-[10px] tracking-[.17em] backdrop-blur-md">
              THE LIVE EXPERIENCE
            </span>
          </div>
          <Link href="/artists" className="hero-note group">
            <span className="flex size-11 items-center justify-center rounded-full bg-violet-100 text-primary">
              <AudioLines />
            </span>
            <div>
              <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
                Tìm chất riêng
              </p>
              <p className="mt-1 text-sm font-semibold">Gặp gỡ những âm sắc mới</p>
            </div>
            <ArrowUpRight className="size-5 text-primary transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </Link>
          <span className="hero-stamp" aria-hidden="true">
            FEEL
            <br />
            THE FLOW ↗
          </span>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container flex flex-wrap justify-between gap-4 py-5 text-[10px] font-medium tracking-[.18em] text-slate-400 uppercase">
          <span className="text-cyan-200">Find your flow</span>
          <span>Âm nhạc & đam mê</span>
          <span>Tri thức & kết nối</span>
          <span className="hidden sm:inline">Một tấm vé. Vạn trải nghiệm.</span>
        </div>
      </div>
    </section>
  );
}
