import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div role="status" aria-label="Đang tải trang" className="container py-16">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="mt-6 h-12 w-3/4 max-w-lg" />
      <Skeleton className="mt-5 h-5 w-1/2" />
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-56" />
        ))}
      </div>
    </div>
  );
}
