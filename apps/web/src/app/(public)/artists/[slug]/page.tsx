import type { Metadata } from 'next';
import { ArtistProfile } from '@/components/discovery/artists';
import { FlowCta } from '@/components/discovery/flow-cta';
export const metadata: Metadata = { title: 'Hồ sơ nghệ sĩ' };
export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <>
      <ArtistProfile slug={slug} />
      <FlowCta />
    </>
  );
}
