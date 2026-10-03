import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Đăng ký' };
export default function RegisterPage() {
  return (
    <div className="container flex justify-center py-12 md:py-20">
      <Card className="w-full max-w-lg p-7 md:p-10">
        <Badge>Trải nghiệm bắt đầu từ đây</Badge>
        <h1 className="mt-5 text-3xl font-bold tracking-tight">Tạo tài khoản TixFlow.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Một tài khoản, mở ra những khoảnh khắc mới.
        </p>
        <Suspense
          fallback={
            <p role="status" className="py-8">
              Đang tải biểu mẫu…
            </p>
          }
        >
          <AuthForm mode="register" />
        </Suspense>
      </Card>
    </div>
  );
}
