import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ArtistDirectory } from '@/components/discovery/artists';
import { PageIntro } from '@/components/discovery/section-heading';
import { FlowCta } from '@/components/discovery/flow-cta';
export const metadata: Metadata = { title: 'Nghệ sĩ & âm sắc' };
export default function ArtistsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Nghệ sĩ"
        title="Tìm âm sắc chạm đến bạn."
        description="Một giọng hát, một ban nhạc, một chất riêng. Khám phá những câu chuyện âm nhạc và lịch hẹn cùng nghệ sĩ trên TixFlow."
      />
      <Suspense
        fallback={
          <p role="status" className="container py-16">
            Đang tải nghệ sĩ…
          </p>
        }
      >
        <ArtistDirectory />
      </Suspense>
      <FlowCta />
    </>
  );
}
