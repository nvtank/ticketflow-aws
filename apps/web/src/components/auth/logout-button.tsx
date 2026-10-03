'use client';

import { useMutation } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';
import { useAuthState } from '@/stores/auth';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const logout = useMutation({
    mutationFn: () => apiRequest('POST', '/auth/logout', z.undefined()),
    onSuccess: () => {
      useAuthState.getState().clear();
      toast.success('Đã đăng xuất và thu hồi phiên đăng nhập.');
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <Button variant="outline" disabled={logout.isPending} onClick={() => logout.mutate()}>
      <LogOut />
      {logout.isPending ? 'Đang đăng xuất…' : 'Đăng xuất'}
    </Button>
  );
}
