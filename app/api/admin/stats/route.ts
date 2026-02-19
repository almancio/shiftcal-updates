import { NextResponse } from 'next/server';

import { assertAdmin } from '@/lib/auth';
import { getDashboardStats } from '@/lib/services/stats-service';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!(await assertAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const daysParam = Number(new URL(request.url).searchParams.get('days') || 30);
  const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 120) : 30;

  const stats = await getDashboardStats(days);
  return NextResponse.json(stats);
}
