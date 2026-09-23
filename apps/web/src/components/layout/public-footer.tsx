import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Brand } from './brand';

export function PublicFooter() {
  return (
    <footer id="about" className="border-t bg-white">
      <div className="container grid gap-10 py-12 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Brand />
          <p className="mt-4 max-w-xs text-sm leading-7 text-muted-foreground">
            Nơi những đam mê gặp gỡ.
            <br />
            Cùng TixFlow chạm vào khoảnh khắc của bạn.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Khám phá</p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
            <Link href="/events" className="hover:text-primary">
              Tất cả sự kiện
            </Link>
            <Link href="/#categories" className="hover:text-primary">
              Danh mục sự kiện
            </Link>
            <Link href="/organizer" className="hover:text-primary">
              Dành cho nhà tổ chức
            </Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Kết nối & hỗ trợ</p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
            <Link href="/system" className="inline-flex items-center gap-1 hover:text-primary">
              Trạng thái hệ thống
              <ArrowUpRight className="size-3.5" />
            </Link>
            <p>Chính sách và kênh hỗ trợ sẽ được công bố khi mở bán.</p>
          </div>
        </div>
      </div>
      <div className="container flex flex-wrap items-center justify-between gap-3 border-t py-5 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} TixFlow.</p>
        <p>Bản phát triển local · Phase 1</p>
        <span className="inline-flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary" />
          Made for memorable moments
        </span>
      </div>
    </footer>
  );
}
