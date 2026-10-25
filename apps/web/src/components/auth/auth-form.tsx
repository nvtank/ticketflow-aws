'use client';

import Link from 'next/link';
import { GoogleAuthButton } from './google-auth-button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuthState } from '@/stores/auth';
import { apiRequest } from '@/lib/api-client';
import { authResponseSchema, roleHome, safeReturnTo } from '@/lib/auth-session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const params = useSearchParams();
  const user = useAuthState((state) => state.user);
  const status = useAuthState((state) => state.status);
  const schema = z
    .object({
      email: z.string().trim().toLowerCase().pipe(z.email('Email không hợp lệ.')),
      password: z
        .string()
        .min(12, 'Mật khẩu cần ít nhất 12 ký tự.')
        .refine(
          (value) => new TextEncoder().encode(value).length <= 72,
          'Mật khẩu tối đa 72 byte UTF-8.',
        ),
      name: z.string().trim().min(2, 'Họ tên cần ít nhất 2 ký tự.').max(100).optional(),
    })
    .superRefine((input, context) => {
      if (mode === 'register' && !input.name)
        context.addIssue({ code: 'custom', path: ['name'], message: 'Vui lòng nhập họ tên.' });
    });
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', ...(mode === 'register' ? { name: '' } : {}) },
  });
  const mutation = useMutation({
    mutationFn: (input: Values) =>
      apiRequest(
        'POST',
        `/auth/${mode}`,
        authResponseSchema,
        {
          email: input.email,
          password: input.password,
          ...(mode === 'register' ? { name: input.name } : {}),
        },
        { anonymous: true },
      ),
    onSuccess: (response) => {
      useAuthState.getState().accept(response);
      toast.success(mode === 'register' ? 'Tạo tài khoản thành công.' : 'Đăng nhập thành công.');
      router.replace(safeReturnTo(params.get('next'), roleHome(response.user.role)));
      router.refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  if (user)
    return (
      <div className="py-8">
        <p className="mb-6 text-sm text-muted-foreground">
          Bạn đang đăng nhập với tài khoản {user.email}.
        </p>
        <Button asChild>
          <Link href={roleHome(user.role)}>
            Về không gian của tôi
            <ArrowRight />
          </Link>
        </Button>
      </div>
    );

  return (
    <form
      onSubmit={form.handleSubmit((input) => mutation.mutate(input))}
      className="mt-8 space-y-5"
      noValidate
    >
      {mode === 'register' && (
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium">
            Họ và tên
          </label>
          <Input
            id="name"
            autoComplete="name"
            maxLength={100}
            {...form.register('name')}
            aria-invalid={!!form.formState.errors.name}
            aria-describedby="name-error"
          />
          <p id="name-error" className="mt-1 text-xs text-danger">
            {form.formState.errors.name?.message}
          </p>
        </div>
      )}
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          maxLength={254}
          placeholder="ban@example.com"
          {...form.register('email')}
          aria-invalid={!!form.formState.errors.email}
          aria-describedby="email-error"
        />
        <p id="email-error" className="mt-1 text-xs text-danger">
          {form.formState.errors.email?.message}
        </p>
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium">
          Mật khẩu
        </label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          {...form.register('password')}
          aria-invalid={!!form.formState.errors.password}
          aria-describedby="password-error password-help"
        />
        <p id="password-help" className="mt-2 text-xs leading-5 text-muted-foreground">
          Ít nhất 12 ký tự, tối đa 72 byte UTF-8.
        </p>
        <p id="password-error" className="mt-1 text-xs text-danger">
          {form.formState.errors.password?.message}
        </p>
      </div>
      {mutation.isError && (
        <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
          {mutation.error.message}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={mutation.isPending || status === 'loading'}
      >
        {mutation.isPending ? 'Đang xử lý…' : mode === 'register' ? 'Tạo tài khoản' : 'Đăng nhập'}
        <ArrowRight />
      </Button>
      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <LockKeyhole className="size-3.5" />
        Thông tin tài khoản được bảo vệ.
      </p>
      <GoogleAuthButton />
      <p className="pt-3 text-center text-sm text-muted-foreground">
        {mode === 'register' ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
        <Link
          className="font-semibold text-primary"
          href={`${mode === 'register' ? '/login' : '/register'}${params.get('next') ? `?next=${encodeURIComponent(params.get('next') ?? '')}` : ''}`}
        >
          {mode === 'register' ? 'Đăng nhập' : 'Đăng ký ngay'}
        </Link>
      </p>
    </form>
  );
}
