'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Headphones,
  Lightbulb,
  Compass,
  Trophy,
} from 'lucide-react';
import { useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { categories } from '@/lib/site';
import { DisplayHeading, SectionLabel } from './primitives';

gsap.registerPlugin(useGSAP, ScrollTrigger);
const artwork = [
  {
    image: '/images/live-stage.jpg',
    icon: Headphones,
    caption: 'Feel the frequency',
    tone: 'forest',
  },
  {
    image: '/assets/hero/crystal-world.webp',
    icon: Lightbulb,
    caption: 'Find a new perspective',
    tone: 'cyan',
  },
  {
    image: '/images/microphone.jpg',
    icon: Compass,
    caption: 'Make something happen',
    tone: 'sand',
  },
  { image: '/images/live-crowd.jpg', icon: Trophy, caption: 'Share the energy', tone: 'forest' },
] as const;

export function BiomeGallery() {
  const scope = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-biome-card]', {
          y: 55,
          rotate: 2,
          stagger: 0.12,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: scope.current,
            start: 'top 70%',
            once: true,
          },
        });
      });
      return () => media.revert();
    },
    { scope },
  );
  const move = (direction: number) => {
    const el = rail.current;
    if (!el || !el.firstElementChild) return;
    const width = el.firstElementChild.getBoundingClientRect().width + 24;
    el.scrollBy({
      left: direction * width,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  };
  return (
    <section
      id="categories"
      className="world-section world-biomes"
      ref={scope}
      aria-label="Khám phá theo đam mê"
    >
      <div className="container">
        <div className="world-section-top" data-world-reveal>
          <div>
            <SectionLabel>01 / Chọn thế giới của bạn</SectionLabel>
            <DisplayHeading>
              Đi theo
              <br />
              <span className="world-green">đam mê.</span>
            </DisplayHeading>
          </div>
          <div className="world-side-note">
            <p>
              Mỗi sở thích, một lối đi.
              <br />
              Bạn muốn bắt đầu từ đâu?
            </p>
            <div className="world-gallery-controls">
              <button onClick={() => move(-1)} disabled={index === 0} aria-label="Danh mục trước">
                <ArrowLeft />
              </button>
              <span aria-live="polite">0{index + 1} / 04</span>
              <button onClick={() => move(1)} disabled={atEnd} aria-label="Danh mục tiếp theo">
                <ArrowRight />
              </button>
            </div>
          </div>
        </div>
        <div
          ref={rail}
          className="biome-rail"
          role="region"
          aria-label="Danh mục sự kiện"
          tabIndex={0}
          onScroll={() => {
            const el = rail.current;
            if (!el || !el.firstElementChild) return;
            const width = el.firstElementChild.getBoundingClientRect().width + 24;
            setIndex(Math.min(3, Math.round(el.scrollLeft / width)));
            setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 3);
          }}
        >
          {categories.map((category, i) => {
            const art = artwork[i]!;
            const Icon = art.icon;
            return (
              <Link
                key={category.value}
                href={`/events?category=${category.value}`}
                className={`biome-card biome-${art.tone}`}
                data-biome-card
              >
                <div className="biome-card-image">
                  <Image
                    src={art.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 38vw, 82vw"
                    className="object-cover"
                  />
                  <span className="biome-index">WORLD / {category.number}</span>
                  <Icon className="biome-icon" aria-hidden="true" />
                </div>
                <div className="biome-card-caption">
                  <div>
                    <p>{art.caption}</p>
                    <h3>{category.name}</h3>
                  </div>
                  <ArrowUpRight aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
