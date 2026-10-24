import Link from 'next/link';
import { ArrowUpRight, Github, AudioLines } from 'lucide-react';
import { Brand } from './brand';
import { repositoryUrl } from '@/lib/site';

const groups = [
  {
    title: 'Khám phá',
    links: [
      ['Tất cả sự kiện', '/events'],
      ['Nghệ sĩ', '/artists'],
      ['Âm nhạc', '/events?category=MUSIC'],
      ['Cộng đồng', '/community'],
    ],
  },
  {
    title: 'Về TixFlow',
    links: [
      ['Câu chuyện của chúng tôi', '/about'],
      ['Đội ngũ đóng góp', '/contributors'],
      ['Nhà tổ chức', '/organizer'],
      ['Mã nguồn GitHub', repositoryUrl],
    ],
  },
  {
    title: 'Luôn đồng hành',
    links: [
      ['Hướng dẫn đặt vé', '/guide'],
      ['Câu hỏi thường gặp', '/guide#faq'],
      ['Vé của tôi', '/my-tickets'],
      ['Trạng thái hệ thống', '/system'],
    ],
  },
];
export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="container flex flex-wrap items-center justify-between gap-6 border-b border-white/10 py-10">
        <p className="max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">
          Những điều đáng nhớ
          <br />
          <span className="text-violet-300">bắt đầu khi bạn có mặt.</span>
        </p>
        <Link
          href="/events"
          className="flex size-14 items-center justify-center rounded-full border border-white/25 transition-colors hover:bg-white/10"
          aria-label="Khám phá tất cả sự kiện"
        >
          <ArrowUpRight className="size-6" />
        </Link>
      </div>
      <div className="container grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Brand light />
          <p className="mt-5 max-w-xs text-sm leading-7 text-slate-400">
            Nơi những đam mê gặp gỡ.
            <br />
            Từ lần nhấn đặt vé đến khoảnh khắc vỡ òa, TixFlow đi cùng bạn.
          </p>
          <a
            href={repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs hover:border-violet-400"
          >
            <Github className="size-4" />
            Cùng xây dựng TixFlow
            <ArrowUpRight className="size-3" />
          </a>
        </div>
        {groups.map((group) => (
          <div key={group.title}>
            <p className="text-xs font-semibold tracking-wide text-white">{group.title}</p>
            <div className="mt-5 flex flex-col gap-3">
              {group.links.map(([label, href]) =>
                href!.startsWith('https:') ? (
                  <a
                    key={href}
                    className="footer-link inline-flex items-center gap-1"
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {label}
                    <ArrowUpRight className="size-3" />
                  </a>
                ) : (
                  <Link key={href} href={href!} className="footer-link">
                    {label}
                  </Link>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="container flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-6 text-[11px] text-slate-400">
        <p>© {new Date().getFullYear()} TixFlow · Dự án phát triển local</p>
        <p className="flex items-center gap-2">
          <AudioLines className="size-4 text-violet-300" />
          Made for memorable moments
        </p>
        <Link href="/contributors" className="hover:text-white">
          Built together, with care ↗
        </Link>
      </div>
    </footer>
  );
}
