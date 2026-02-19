import { redirect } from 'next/navigation';

import { DashboardNav } from '@/components/dashboard-nav';
import { LogoutButton } from '@/components/logout-button';
import { getAdminSessionToken, isValidAdminToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const token = await getAdminSessionToken();

  if (!isValidAdminToken(token)) {
    redirect('/login');
  }

  return (
    <main className="main-shell nav-shell">
      <aside className="panel sidebar">
        <h1 className="brand">ShiftCal OTA Hub</h1>
        <p className="brand-sub">Self-hosted updates · Config · Analytics</p>

        <DashboardNav />
      </aside>

      <section className="panel content">
        <div className="top-row">
          <LogoutButton />
        </div>
        {children}
      </section>
    </main>
  );
}
