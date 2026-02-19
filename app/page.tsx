import { redirect } from 'next/navigation';

import { getAdminSessionToken, isValidAdminToken } from '@/lib/auth';

export default async function HomePage() {
  const token = await getAdminSessionToken();

  if (isValidAdminToken(token)) {
    redirect('/dashboard');
  }

  redirect('/login');
}
