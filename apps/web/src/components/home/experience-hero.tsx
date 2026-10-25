'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { SectionLabel, WorldLink } from '@/components/world/primitives';

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

export function ExperienceHero() {
  const scope = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const split = SplitText.create('[data-hero-title]', { type: 'words', aria: 'auto' });
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from(split.words, { y: 65, opacity: 0, rotateX: -15, stagger: 0.055, duration: 1.1 })
          .from('[data-hero-detail]', { y: 18, opacity: 0, stagger: 0.1, duration: 0.8 }, 0.3)
          .from('[data-world-scene]', { scale: 1.08, duration: 1.8 }, 0);
        return () => split.revert();
      });
      media.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        gsap.to('[data-world-scene]', {
          yPercent: 13,
          scale: 1.04,
          ease: 'none',
          scrollTrigger: {
            trigger: scope.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.8,
          },
        });
        gsap.to('[data-world-coordinate]', {
          y: -65,
          ease: 'none',
          scrollTrigger: {
            trigger: scope.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 1,
          },
        });
      });
      return () => media.revert();
    },
    { scope },
  );

  return (
    <section className="world-hero" ref={scope} aria-labelledby="world-title">
      <div className="world-scene" data-world-scene>
        <Image
          src="/assets/hero/crystal-world.webp"
          alt="Những hòn đảo voxel phủ cây xanh, nối nhau bằng cầu treo giữa tầng mây và tinh thể"
          fill
          priority
          sizes="(max-width: 767px) 1500px, 100vw"
          className="object-cover"
        />
      </div>
      <div className="world-hero-shade" aria-hidden="true" />
      <div className="container world-hero-content">
        <SectionLabel className="world-hero-label">Mở lối đến những trải nghiệm thật</SectionLabel>
        <h1 id="world-title" className="world-hero-title" data-hero-title>
          Đừng chỉ
          <br />
          nghe kể.
          <br />
          <span>Hãy ở đó.</span>
        </h1>
        <div className="world-hero-bottom" data-hero-detail>
          <p>
            Khám phá sự kiện. Chọn chỗ của bạn.
            <br />
            Bước vào một thế giới đầy cảm xúc.
          </p>
          <WorldLink href="/events">Khám phá sự kiện</WorldLink>
        </div>
        <div className="world-coordinate" data-world-coordinate aria-hidden="true">
          <span>TF / OPEN WORLDS</span>
          <span>ÂM NHẠC · KẾT NỐI · TRẢI NGHIỆM</span>
        </div>
        <div className="world-hero-caption" data-hero-detail>
          <Link href="#categories" className="world-scroll-hint">
            <ArrowDown aria-hidden="true" /> Cuộn để khám phá
          </Link>
          <span className="world-caption-mark">
            Một tấm vé. Một thế giới mới. <ArrowUpRight aria-hidden="true" />
          </span>
        </div>
      </div>
    </section>
  );
}
