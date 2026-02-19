import { redirect } from 'next/navigation';

import { DashboardNav } from '@/components/dashboard-nav';
import { LogoutButton } from '@/components/logout-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAdminSessionToken, isValidAdminToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const token = await getAdminSessionToken();

  if (!isValidAdminToken(token)) {
    redirect('/login');
  }

  return (
    <main className="mx-auto grid w-full max-w-[1450px] grid-cols-1 gap-4 p-3 sm:p-4 lg:grid-cols-[285px_1fr]">
      <Card className="h-fit overflow-hidden border-teal-900/20 bg-gradient-to-br from-teal-50/90 via-card to-amber-50/40 lg:sticky lg:top-4">
        <CardHeader className="pb-4">
          <div className="mb-2 flex items-center gap-2">
            <Badge className="rounded-md px-2 py-1 text-[10px] uppercase tracking-wide">Control Plane</Badge>
          </div>
          <CardTitle className="text-xl">ShiftCal OTA Hub</CardTitle>
          <CardDescription>Gestiona releases OTA, remote config y observabilidad en un solo panel.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <DashboardNav />
        </CardContent>
      </Card>

      <Card className="border-teal-900/15 bg-card/95 backdrop-blur">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex justify-end">
            <LogoutButton />
          </div>
          {children}
        </CardContent>
      </Card>
    </main>
  );
}
