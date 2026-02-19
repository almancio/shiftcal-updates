import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getRequestIp, hashIp } from '@/lib/expo';
import { trackEvent } from '@/lib/services/events-service';

export const runtime = 'nodejs';

const eventPayloadSchema = z.object({
  eventType: z.enum(['update_check', 'update_served', 'update_none', 'asset_download', 'config_fetch', 'custom']),
  platform: z.string().optional(),
  runtimeVersion: z.string().optional(),
  channel: z.string().optional(),
  appVersion: z.string().optional(),
  deviceId: z.string().optional(),
  osName: z.string().optional(),
  osVersion: z.string().optional(),
  deviceModel: z.string().optional(),
  updateId: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional()
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = eventPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid payload.' }, { status: 400 });
  }

  await trackEvent({
    ...parsed.data,
    ipHash: hashIp(getRequestIp(request))
  });

  return NextResponse.json({ ok: true });
}
