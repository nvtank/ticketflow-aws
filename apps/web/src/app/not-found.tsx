import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="container flex min-h-[70vh] flex-col items-center justify-center py-16 text-center"
    >
      <p className="text-sm font-semibold tracking-widest text-primary">404 · TIXFLOW</p>
      <h1 className="mt-5 text-3xl font-bold">Có vẻ bạn đã lạc nhịp.</h1>
      <p className="mt-4 max-w-md leading-7 text-muted-foreground">
        Trang này không tồn tại hoặc chưa được mở. Trở về trang chủ để tiếp tục khám phá.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">
          <ArrowLeft />
          Về trang chủ
        </Link>
      </Button>
    </main>
  );
}
