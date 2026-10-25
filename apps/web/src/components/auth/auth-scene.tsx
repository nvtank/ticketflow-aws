import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, AudioLines } from 'lucide-react';
export function AuthScene({ children }: { children: React.ReactNode }) {
  return (
    <div className="container grid gap-8 py-10 md:py-14 lg:grid-cols-[1fr_1fr] lg:gap-12">
      <div className="relative hidden min-h-[650px] overflow-hidden rounded-[28px] bg-slate-950 lg:block">
        <Image
          src="/images/live-stage.jpg"
          alt="Không gian đêm nhạc với những tia sáng trên sân khấu"
          fill
          priority
          sizes="45vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1020] via-[#0b1020]/30 to-[#0b1020]/20" />
        <span className="absolute top-8 left-8 flex items-center gap-2 text-xs font-medium text-white">
          <AudioLines className="size-5" />
          Find your flow
        </span>
        <div className="absolute right-10 bottom-10 left-10 text-white">
          <p className="eyebrow text-primary">A ticket to your next story</p>
          <p className="mt-5 text-5xl leading-[1.12] font-semibold tracking-tight">
            Bạn thuộc về
            <br />
            những khoảnh khắc
            <br />
            <span className="text-primary">đáng nhớ.</span>
          </p>
          <p className="mt-6 text-sm leading-7 text-slate-300">
            Một tài khoản để lưu những tấm vé,
            <br />
            và bắt đầu những trải nghiệm mới.
          </p>
          <Link href="/about" className="mt-7 inline-flex items-center gap-2 text-xs font-semibold">
            Tìm hiểu về TikFlow
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>
      <div className="flex items-center justify-center">{children}</div>
    </div>
  );
}
