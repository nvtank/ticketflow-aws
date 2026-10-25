import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ArtistDirectory } from '@/components/discovery/artists';
import { FlowCta } from '@/components/discovery/flow-cta';
import { EditorialHero } from '@/components/world/editorial-hero';
export const metadata: Metadata = { title: 'Nghệ sĩ & âm sắc' };
export default function ArtistsPage() {
  return (
    <div className="world-editorial">
      <EditorialHero
        eyebrow="Nghệ sĩ"
        title={
          <>
            Mỗi âm sắc.
            <br />
            <em>Một thế giới.</em>
          </>
        }
        description="Tìm một chất riêng. Đọc câu chuyện phía sau âm nhạc. Hẹn gặp nhau ở sân khấu tiếp theo."
        image="/images/microphone.jpg"
        alt="Microphone trên sân khấu, hình minh họa cho không gian âm nhạc"
        action={{ href: '#artist-directory', label: 'Gặp gỡ nghệ sĩ' }}
      />
      <div id="artist-directory" className="editorial-directory">
        <Suspense
          fallback={
            <p role="status" className="container py-16">
              Đang tải nghệ sĩ…
            </p>
          }
        >
          <ArtistDirectory />
        </Suspense>
      </div>
      <FlowCta />
    </div>
  );
}
