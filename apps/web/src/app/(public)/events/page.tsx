import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EventCatalog } from '@/components/events/event-catalog';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Khám phá sự kiện' };

export default function EventsPage() {
  return (
    <div className="container py-14 md:py-20">
      <Badge>Khám phá theo cách của bạn</Badge>
      <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
        Tìm khoảnh khắc tiếp theo.
      </h1>
      <p className="mt-4 mb-10 text-muted-foreground">
        Âm nhạc, tri thức, thể thao và những điều bạn yêu.
      </p>
      <Suspense fallback={<p role="status">Đang tải bộ lọc…</p>}>
        <EventCatalog searchable />
      </Suspense>
    </div>
  );
}
