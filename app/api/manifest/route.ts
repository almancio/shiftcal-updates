import { NextResponse } from 'next/server';

import {
  expoResponseHeaders,
  getRequestIp,
  hashIp,
  isSupportedExpoPlatform,
  maybeSignManifest,
  negotiateManifestContentType,
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

  if (context.protocolVersion && context.protocolVersion !== '1') {
    return NextResponse.json(
      { error: `Unsupported expo-protocol-version: ${context.protocolVersion}` },
      { status: 406 }
    );
  }

  if (!context.runtimeVersion || !context.platform) {
    return NextResponse.json(
      { error: 'Missing expo-runtime-version or expo-platform headers.' },
      { status: 400 }
    );
  }

  if (!isSupportedExpoPlatform(context.platform)) {
    return NextResponse.json(
      { error: `Unsupported expo-platform: ${context.platform}. Use ios or android.` },
      { status: 400 }
    );
  }

  if (context.expectSignatureHeader && !context.expectSignatureValid) {
    return NextResponse.json({ error: 'Invalid expo-expect-signature header format.' }, { status: 400 });
  }

  const negotiatedContentType = negotiateManifestContentType(request);
  if (!negotiatedContentType) {
    return NextResponse.json(
      {
        error: 'Not acceptable. Supported manifest content types: application/expo+json, application/json.'
      },
      { status: 406 }
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

  const headers = expoResponseHeaders({
    vary: [
      'accept',
      'expo-protocol-version',
      'expo-platform',
      'expo-runtime-version',
      'expo-channel-name',
      'expo-current-update-id',
      'expo-expect-signature'
    ]
  });

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
  const expectedKeyId =
    typeof context.expectSignature?.keyid === 'string' ? context.expectSignature.keyid : null;
  const expectedAlg = typeof context.expectSignature?.alg === 'string' ? context.expectSignature.alg : null;
  const signatureResult = maybeSignManifest(payload, {
    shouldSign: Boolean(context.expectSignatureHeader),
    expectedKeyId,
    expectedAlg
  });
  const signature = signatureResult.signature;

  if (context.expectSignatureHeader && !signature) {
    const reason = signatureResult.reason || 'unknown';
    const status = reason === 'algorithm_mismatch' || reason === 'key_id_mismatch' ? 406 : 500;
    return NextResponse.json(
      {
        error: `Unable to produce signed manifest (${reason}).`
      },
      { status }
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
      'content-type': `${negotiatedContentType}; charset=utf-8`,
      ...(signature ? { 'expo-signature': signature } : {})
    }
  });
}
