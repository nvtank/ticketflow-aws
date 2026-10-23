import { MyOrders } from '@/components/booking/my-orders';
import type { Metadata } from 'next';
import { AuthGate } from '@/components/auth/auth-gate';
import { ProfilePanel } from '@/components/auth/profile-panel';

export const metadata: Metadata = { title: 'Hồ sơ của tôi' };
export default function ProfilePage() {
  return (
    <AuthGate embedded>
      <>
        <ProfilePanel />
        <div className="container max-w-5xl pb-10">
          <MyOrders />
        </div>
      </>
    </AuthGate>
  );
}
