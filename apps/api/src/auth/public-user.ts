import { UserRole } from '@tixflow/shared';
import type { AuthUser } from '@tixflow/shared';
import type { User } from '../generated/prisma/client';

export function publicUser(user: Pick<User, 'id' | 'email' | 'name' | 'phone' | 'role'>): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: UserRole[user.role],
  };
}
