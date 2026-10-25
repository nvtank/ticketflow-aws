'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, AudioLines, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api-client';
import { artistListSchema, artistDetailSchema, type Artist } from '@/lib/discovery';
import { QueryNotice } from '@/components/ui/query-notice';
import { EventGrid, EventEmptyHint } from '@/components/events/event-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Reveal } from '@/components/motion/reveal';
import { cn } from '@/lib/utils';

export function ArtistArtwork({
  artist,
  className,
}: {
  artist: Pick<Artist, 'name' | 'color' | 'genre'>;
  className?: string;
}) {
  const initials = artist.name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('');
  return (
    <div
      className={cn('artist-art aspect-[4/4.4]', className)}
      data-color={artist.color}
      aria-hidden="true"
    >
      <div className="artist-orbit" />
      <span className="absolute top-6 left-6 text-[9px] tracking-[.22em] uppercase">
        TikFlow / {artist.genre}
      </span>
      <AudioLines className="absolute top-6 right-6 size-5 opacity-70" />
      <span className="artist-initial">{initials}</span>
      <span className="absolute right-5 bottom-5 text-[9px] tracking-widest uppercase">
        Sound & soul ↗
      </span>
    </div>
  );
}
function ArtistCard({ artist }: { artist: Artist & { upcomingEvents: number } }) {
  return (
    <Link href={`/artists/${artist.slug}`} className="experience-card group block">
      <ArtistArtwork artist={artist} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-wide text-primary uppercase">
              {artist.genre}
            </p>
            <h3 className="mt-2 text-xl font-bold tracking-tight">{artist.name}</h3>
          </div>
          <ArrowUpRight className="mt-2 size-5 text-primary" />
        </div>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">{artist.tagline}</p>
        <div className="mt-4 flex flex-wrap justify-between gap-2 border-t pt-3 text-[10px] text-muted-foreground">
          <span>{artist.upcomingEvents} sự kiện sắp tới</span>
          {artist.isDemo && <span className="rounded-full bg-muted px-2 py-0.5">Hồ sơ demo</span>}
        </div>
      </div>
    </Link>
  );
}
export function ArtistCollection({ query = '', limit = 4 }: { query?: string; limit?: number }) {
  const params = new URLSearchParams(query);
  params.set('pageSize', String(limit));
  const artists = useQuery({
    queryKey: ['artists', params.toString()],
    queryFn: ({ signal }) =>
      apiGet(`/artists?${params}`, artistListSchema, { anonymous: true, signal }),
  });
  if (!artists.data)
    return (
      <QueryNotice
        pending={artists.isPending}
        error={artists.error}
        retry={() => void artists.refetch()}
      />
    );
  if (!artists.data.items.length)
    return (
      <EmptyState
        title="Âm sắc mới đang được chuẩn bị"
        description="Chưa có hồ sơ nghệ sĩ phù hợp. Hãy thử bộ lọc khác hoặc khám phá lịch sự kiện."
        action={
          <Button asChild variant="outline">
            <Link href="/events">Xem sự kiện</Link>
          </Button>
        }
      />
    );
  return (
    <div
      className={cn('grid gap-5 sm:grid-cols-2', limit <= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4')}
    >
      {artists.data.items.map((artist, index) => (
        <Reveal key={artist.id} delay={index * 0.04}>
          <ArtistCard artist={artist} />
        </Reveal>
      ))}
    </div>
  );
}
export function ArtistDirectory() {
  const params = useSearchParams(),
    router = useRouter();
  const query = useQuery({
    queryKey: ['artists', 'directory', params.toString()],
    queryFn: ({ signal }) =>
      apiGet(`/artists?${params}`, artistListSchema, { signal, anonymous: true }),
  });
  function go(page: number) {
    const next = new URLSearchParams(params.toString());
    next.set('page', String(page));
    router.push(`/artists?${next}`);
  }
  return (
    <div className="container py-12">
      <form
        key={params.toString()}
        className="mb-9 flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          const next = new URLSearchParams();
          for (const [key, value] of new FormData(event.currentTarget))
            if (String(value).trim()) next.set(key, String(value).trim());
          router.push(`/artists?${next}`);
        }}
      >
        <label className="sr-only" htmlFor="artist-search">
          Tìm nghệ sĩ
        </label>
        <Input
          id="artist-search"
          name="q"
          maxLength={100}
          defaultValue={params.get('q') ?? ''}
          placeholder="Tìm nghệ sĩ, tìm âm sắc của bạn…"
          className="flex-1"
        />
        <label className="sr-only" htmlFor="artist-genre">
          Thể loại nghệ sĩ
        </label>
        <select
          key={query.data?.genres.join('|') ?? 'loading'}
          id="artist-genre"
          name="genre"
          defaultValue={params.get('genre') ?? ''}
          className="h-11 rounded-xl border bg-card px-3 text-sm"
        >
          <option value="">Tất cả thể loại</option>
          {query.data?.genres.map((genre) => (
            <option key={genre}>{genre}</option>
          ))}
        </select>
        <Button type="submit">
          <Search />
          Tìm nghệ sĩ
        </Button>
        <Button asChild variant="ghost">
          <Link href="/artists">Xóa bộ lọc</Link>
        </Button>
      </form>
      {!query.data ? (
        <QueryNotice
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      ) : (
        <>
          <p className="mb-6 text-xs text-muted-foreground">
            {query.data.pagination.total} hồ sơ · Mỗi nghệ sĩ, một chất riêng
          </p>
          {query.data.items.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {query.data.items.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Chưa tìm thấy nghệ sĩ"
              description="Thử một tên hoặc thể loại khác nhé."
            />
          )}
          {query.data.pagination.totalPages > 1 && (
            <nav
              aria-label="Phân trang nghệ sĩ"
              className="mt-8 flex items-center justify-center gap-4"
            >
              <Button
                variant="outline"
                disabled={query.data.pagination.page <= 1}
                onClick={() => go(query.data.pagination.page - 1)}
              >
                Trang trước
              </Button>
              <span className="text-sm">
                {query.data.pagination.page}/{query.data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={query.data.pagination.page >= query.data.pagination.totalPages}
                onClick={() => go(query.data.pagination.page + 1)}
              >
                Trang sau
              </Button>
            </nav>
          )}
        </>
      )}
      <p className="mt-8 text-xs leading-6 text-muted-foreground">
        Các hồ sơ có nhãn “Demo” là nghệ sĩ hư cấu phục vụ trải nghiệm bản local. Hình đồ họa đại
        diện cho phong cách âm nhạc.
      </p>
    </div>
  );
}
export function ArtistProfile({ slug }: { slug: string }) {
  const query = useQuery({
    queryKey: ['artist', slug],
    queryFn: ({ signal }) =>
      apiGet(`/artists/${encodeURIComponent(slug)}`, artistDetailSchema, {
        signal,
        anonymous: true,
      }),
    retry: false,
  });
  return (
    <div className="container py-10 md:py-14">
      <Link href="/artists" className="text-link mb-8">
        <ArrowLeft className="size-4" />
        Tất cả nghệ sĩ
      </Link>
      {query.data ? (
        <>
          <div className="grid items-center gap-10 md:grid-cols-[.8fr_1.2fr]">
            <Reveal>
              <ArtistArtwork artist={query.data} className="max-h-[460px] rounded-[28px]" />
            </Reveal>
            <Reveal>
              <p className="eyebrow">Âm sắc / {query.data.genre}</p>
              <h1 className="display-title mt-4">{query.data.name}</h1>
              <p className="mt-5 text-xl leading-8 text-primary">{query.data.tagline}</p>
              <p className="mt-6 whitespace-pre-wrap text-sm leading-8 text-muted-foreground">
                {query.data.biography}
              </p>
              {query.data.isDemo && (
                <p className="mt-5 inline-block rounded-full bg-primary/10 px-3 py-1.5 text-xs text-primary">
                  Nghệ sĩ demo · Hồ sơ hư cấu
                </p>
              )}
              <div className="mt-8">
                <Button asChild>
                  <a href="#artist-events">
                    Xem lịch sự kiện
                    <ArrowUpRight />
                  </a>
                </Button>
              </div>
            </Reveal>
          </div>
          <section id="artist-events" className="pt-16 pb-8">
            <p className="eyebrow">Gặp nhau tại sân khấu</p>
            <h2 className="section-title mt-3 mb-8">Lịch hẹn cùng {query.data.name}</h2>
            {query.data.events.length ? (
              <EventGrid events={query.data.events} />
            ) : (
              <EventEmptyHint />
            )}
          </section>
        </>
      ) : (
        <QueryNotice
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      )}
    </div>
  );
}
