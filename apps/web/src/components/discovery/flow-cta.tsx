import Link from 'next/link';
import { ArrowUpRight, AudioLines } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';
export function FlowCta() {
  return (
    <section className="container pb-20">
      <Reveal className="flow-cta">
        <div>
          <p className="eyebrow text-violet-200">Cuộc hẹn tiếp theo đang chờ</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
            Đến vì đam mê.
            <br />Ở lại vì khoảnh khắc.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-indigo-100">
            Chọn trải nghiệm của bạn. TixFlow lo phần tấm vé.
          </p>
        </div>
        <div className="relative flex flex-col items-start gap-5">
          <AudioLines className="hidden size-20 text-violet-300/70 md:block" strokeWidth={1} />
          <Button asChild size="lg" className="bg-white text-indigo-950 hover:bg-indigo-50">
            <Link href="/events">
              Tìm sự kiện của bạn
              <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
