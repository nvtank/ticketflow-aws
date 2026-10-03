import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Đăng nhập' };
export default function LoginPage() {
  return (
    <div className="container flex justify-center py-12 md:py-20">
      <Card className="w-full max-w-lg p-7 md:p-10">
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
    </div>
  );
}
