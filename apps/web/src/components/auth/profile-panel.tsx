'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuthState } from '@/stores/auth';
import { apiRequest } from '@/lib/api-client';
import { authUserSchema } from '@/lib/auth-session';
import { LogoutButton } from './logout-button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Họ tên cần ít nhất 2 ký tự.').max(100),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => !value || /^\+?[0-9][0-9\s()-]{7,19}$/.test(value),
      'Số điện thoại không hợp lệ.',
    ),
});
const passwordSchema = z
  .object({
    currentPassword: z.string().min(12, 'Mật khẩu cần ít nhất 12 ký tự.'),
    newPassword: z
      .string()
      .min(12, 'Mật khẩu mới cần ít nhất 12 ký tự.')
      .refine(
        (value) => new TextEncoder().encode(value).length <= 72,
        'Mật khẩu tối đa 72 byte UTF-8.',
      ),
    confirmPassword: z.string(),
  })
  .refine((input) => input.newPassword === input.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận chưa khớp.',
  })
  .refine((input) => input.currentPassword !== input.newPassword, {
    path: ['newPassword'],
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
  });

export function ProfilePanel() {
  const user = useAuthState((state) => state.user);
  const profile = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? '', phone: user?.phone ?? '' },
  });
  const password = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const save = useMutation({
    mutationFn: (input: z.infer<typeof profileSchema>) =>
      apiRequest('PATCH', '/users/me', authUserSchema, {
        name: input.name,
        phone: input.phone || null,
      }),
    onSuccess: (updated) => {
      useAuthState.getState().updateUser(updated);
      toast.success('Đã cập nhật hồ sơ.');
    },
    onError: (error) => toast.error(error.message),
  });
  const change = useMutation({
    mutationFn: (input: z.infer<typeof passwordSchema>) =>
      apiRequest('POST', '/users/me/password', z.undefined(), {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
      }),
    onSuccess: () => {
      password.reset();
      useAuthState.getState().clear();
      toast.success('Đã đổi mật khẩu và thu hồi mọi phiên đăng nhập.');
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="container py-12 md:py-16">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Tài khoản TixFlow</p>
          <h1 className="mt-3 text-3xl font-bold">Hồ sơ của tôi</h1>
          <p className="mt-3 text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <LogoutButton />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">Thông tin cá nhân</h2>
          <form
            className="mt-6 space-y-5"
            onSubmit={profile.handleSubmit((input) => save.mutate(input))}
            noValidate
          >
            <div>
              <label htmlFor="profile-name" className="mb-2 block text-sm font-medium">
                Họ tên
              </label>
              <Input
                id="profile-name"
                autoComplete="name"
                {...profile.register('name')}
                aria-describedby="profile-name-error"
                aria-invalid={!!profile.formState.errors.name}
              />
              <p id="profile-name-error" className="mt-1 text-xs text-red-600">
                {profile.formState.errors.name?.message}
              </p>
            </div>
            <div>
              <label htmlFor="profile-phone" className="mb-2 block text-sm font-medium">
                Số điện thoại
              </label>
              <Input
                id="profile-phone"
                type="tel"
                autoComplete="tel"
                {...profile.register('phone')}
                aria-describedby="profile-phone-error"
                aria-invalid={!!profile.formState.errors.phone}
              />
              <p id="profile-phone-error" className="mt-1 text-xs text-red-600">
                {profile.formState.errors.phone?.message}
              </p>
            </div>
            <Button disabled={save.isPending} type="submit">
              {save.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
            </Button>
          </form>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold">Đổi mật khẩu</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Sau khi đổi mật khẩu, bạn cần đăng nhập lại trên tất cả thiết bị.
          </p>
          <form
            className="mt-6 space-y-5"
            onSubmit={password.handleSubmit((input) => change.mutate(input))}
            noValidate
          >
            {[
              { key: 'currentPassword', label: 'Mật khẩu hiện tại', complete: 'current-password' },
              { key: 'newPassword', label: 'Mật khẩu mới', complete: 'new-password' },
              { key: 'confirmPassword', label: 'Xác nhận mật khẩu mới', complete: 'new-password' },
            ].map(({ key, label, complete }) => {
              const field = key as keyof z.infer<typeof passwordSchema>;
              return (
                <div key={key}>
                  <label htmlFor={key} className="mb-2 block text-sm font-medium">
                    {label}
                  </label>
                  <Input
                    id={key}
                    type="password"
                    autoComplete={complete}
                    {...password.register(field)}
                    aria-invalid={!!password.formState.errors[field]}
                    aria-describedby={`${key}-error`}
                  />
                  <p id={`${key}-error`} className="mt-1 text-xs text-red-600">
                    {password.formState.errors[field]?.message}
                  </p>
                </div>
              );
            })}
            <Button disabled={change.isPending} type="submit">
              {change.isPending ? 'Đang cập nhật…' : 'Đổi mật khẩu'}
            </Button>
          </form>
        </Card>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Lịch sử đơn hàng và vé sẽ được mở khi phân hệ thanh toán và phát hành vé hoàn tất.
      </p>
    </div>
  );
}
