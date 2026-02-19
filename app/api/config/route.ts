import { NextResponse } from 'next/server';

import { getRequestIp, hashIp } from '@/lib/expo';
import { getRemoteConfig } from '@/lib/services/config-service';
import { trackEvent } from '@/lib/services/events-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
  const config = await getRemoteConfig();

  await trackEvent({
    eventType: 'config_fetch',
    platform: request.headers.get('x-platform'),
    runtimeVersion: request.headers.get('x-runtime-version'),
    channel: request.headers.get('x-channel') || 'production',
    appVersion: request.headers.get('x-app-version'),
    deviceId: request.headers.get('x-device-id'),
    ipHash: hashIp(getRequestIp(request)),
    osName: request.headers.get('x-os-name'),
    osVersion: request.headers.get('x-os-version'),
    deviceModel: request.headers.get('x-device-model')
  });

  return NextResponse.json(config, {
    status: 200,
    headers: {
      'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
      pragma: 'no-cache',
      expires: '0',
      'surrogate-control': 'no-store',
      'x-config-last-updated': String(config.lastUpdated || '')
    }
  });
}
