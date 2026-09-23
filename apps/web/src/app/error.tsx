'use client';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div id="main-content" className="container py-16">
      <EmptyState
        title="Trải nghiệm bị gián đoạn"
        description="Có lỗi khi tải trang. Hãy thử lại sau ít phút."
        action={<Button onClick={reset}>Thử lại</Button>}
      />
    </div>
  );
}
