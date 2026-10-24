import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { EventCatalog } from '@/components/events/event-catalog';
import { PageIntro } from '@/components/discovery/section-heading';
import { categories } from '@/lib/site';
export const metadata: Metadata = { title: 'Khám phá sự kiện' };
export default function EventsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Khám phá sự kiện"
        title="Tìm khoảnh khắc tiếp theo."
        description="Một đêm nhạc, một góc nhìn mới, một cuộc gặp đáng nhớ. Bắt đầu bằng điều khiến bạn háo hức."
      >
        <div className="mt-7 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Link
              href={`/events?category=${category.value}`}
              key={category.value}
              className="rounded-full border bg-white px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-primary hover:text-primary"
            >
              {category.name} ↗
            </Link>
          ))}
        </div>
      </PageIntro>
      <div className="container py-10 md:py-14">
        <Suspense fallback={<p role="status">Đang tải bộ lọc…</p>}>
          <EventCatalog searchable />
        </Suspense>
      </div>
    </>
  );
}
