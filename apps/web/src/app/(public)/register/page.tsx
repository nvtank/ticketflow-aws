import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AuthScene } from '@/components/auth/auth-scene';

export const metadata: Metadata = { title: 'Đăng ký' };
export default function RegisterPage() {
  return (
    <AuthScene>
      <Card className="w-full max-w-lg border-0 bg-transparent p-2 shadow-none sm:p-7">
        <Badge>Trải nghiệm bắt đầu từ đây</Badge>
        <h1 className="mt-5 text-3xl font-bold tracking-tight">Tạo tài khoản TikFlow.</h1>
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
    </AuthScene>
  );
}
