import { NextResponse } from 'next/server';

import {
  expoResponseHeaders,
  getRequestIp,
  hashIp,
  maybeSignManifest,
  parseExpoContextFromRequest
} from '@/lib/expo';
import { trackEvent } from '@/lib/services/events-service';
import { resolveLatestUpdate } from '@/lib/services/updates-service';
import { getEnv } from '@/lib/env';
import { inferOriginFromRequest } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const context = parseExpoContextFromRequest(request);
  const ipHash = hashIp(getRequestIp(request));

  if (!context.runtimeVersion || !context.platform) {
    return NextResponse.json(
      { error: 'Missing expo-runtime-version or expo-platform headers.' },
      { status: 400 }
    );
  }

  const origin = getEnv().APP_BASE_URL || inferOriginFromRequest(request);

  await trackEvent({
    eventType: 'update_check',
    platform: context.platform,
    runtimeVersion: context.runtimeVersion,
    channel: context.channel,
    appVersion: context.appVersion,
    deviceId: context.deviceId,
    ipHash,
    osName: context.osName,
    osVersion: context.osVersion,
    deviceModel: context.deviceModel,
    updateId: context.currentUpdateId,
    details: {
      expectSignature: Boolean(context.expectSignature)
    }
  });

  const manifest = await resolveLatestUpdate({
    platform: context.platform,
    runtimeVersion: context.runtimeVersion,
    channel: context.channel,
    currentUpdateId: context.currentUpdateId,
    origin
  });

  const headers = expoResponseHeaders();

  if (!manifest) {
    await trackEvent({
      eventType: 'update_none',
      platform: context.platform,
      runtimeVersion: context.runtimeVersion,
      channel: context.channel,
      appVersion: context.appVersion,
      deviceId: context.deviceId,
      ipHash,
      osName: context.osName,
      osVersion: context.osVersion,
      deviceModel: context.deviceModel,
      updateId: context.currentUpdateId,
      details: {
        reason: 'no_update_available'
      }
    });

    return new NextResponse(null, {
      status: 204,
      headers
    });
  }

  const payload = JSON.stringify(manifest);
  const signature = maybeSignManifest(payload, Boolean(context.expectSignature));

  if (context.expectSignature && !signature) {
    return NextResponse.json(
      {
        error:
          'Client requested signed manifest but EXPO_PRIVATE_KEY_PEM is missing or invalid on server.'
      },
      { status: 500 }
    );
  }

  await trackEvent({
    eventType: 'update_served',
    platform: context.platform,
    runtimeVersion: context.runtimeVersion,
    channel: context.channel,
    appVersion: context.appVersion,
    deviceId: context.deviceId,
    ipHash,
    osName: context.osName,
    osVersion: context.osVersion,
    deviceModel: context.deviceModel,
    updateId: manifest.id,
    details: {
      launchAsset: manifest.launchAsset.url,
      assetsCount: manifest.assets.length
    }
  });

  return new NextResponse(payload, {
    status: 200,
    headers: {
      ...headers,
      'content-type': 'application/expo+json; charset=utf-8',
      ...(signature ? { 'expo-signature': signature } : {})
    }
  });
}
