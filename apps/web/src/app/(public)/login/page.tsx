import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AuthScene } from '@/components/auth/auth-scene';

export const metadata: Metadata = { title: 'Đăng nhập' };
export default function LoginPage() {
  return (
    <AuthScene>
      <Card className="w-full max-w-lg border-0 bg-transparent p-2 shadow-none sm:p-7">
        <Badge>Chào mừng trở lại</Badge>
        <h1 className="mt-5 text-3xl font-bold tracking-tight">Tiếp tục dòng cảm xúc.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Đăng nhập để kết nối với những trải nghiệm của bạn.
        </p>
        <Suspense
          fallback={
            <p role="status" className="py-8">
              Đang tải biểu mẫu…
            </p>
          }
        >
          <AuthForm mode="login" />
        </Suspense>
      </Card>
    </AuthScene>
  );
}
