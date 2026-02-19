import { NextResponse } from 'next/server';

import { assertAdmin } from '@/lib/auth';
import { getRemoteConfig, updateRemoteConfig } from '@/lib/services/config-service';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!(await assertAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await getRemoteConfig();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  if (!(await assertAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Config must be a JSON object.' }, { status: 400 });
  }

  const actor = request.headers.get('x-admin-actor');
  const updated = await updateRemoteConfig(payload as Record<string, unknown>, actor);

  return NextResponse.json(updated);
}
