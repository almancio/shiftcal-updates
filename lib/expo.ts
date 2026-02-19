import crypto from 'crypto';
import { lookup as lookupMime } from 'mime-types';

import { getEnv } from '@/lib/env';

export type ExpoUpdateRequestContext = {
  platform: string;
  runtimeVersion: string;
  channel: string;
  currentUpdateId: string | null;
  expectSignature: string | null;
  appVersion: string | null;
  deviceId: string | null;
  osName: string | null;
  osVersion: string | null;
  deviceModel: string | null;
};

export function parseExpoContextFromRequest(request: Request): ExpoUpdateRequestContext {
  return {
    platform: (request.headers.get('expo-platform') || 'android').toLowerCase(),
    runtimeVersion: request.headers.get('expo-runtime-version') || '',
    channel: request.headers.get('expo-channel-name') || 'production',
    currentUpdateId: request.headers.get('expo-current-update-id'),
    expectSignature: request.headers.get('expo-expect-signature'),
    appVersion: request.headers.get('x-app-version'),
    deviceId: request.headers.get('x-device-id'),
    osName: request.headers.get('x-os-name'),
    osVersion: request.headers.get('x-os-version'),
    deviceModel: request.headers.get('x-device-model')
  };
}

export function expoResponseHeaders() {
  return {
    'expo-protocol-version': '1',
    'expo-sfv-version': '0',
    'cache-control': 'private, max-age=0'
  };
}

export function resolveContentType(filePath: string, fallback = 'application/octet-stream'): string {
  if (filePath.endsWith('.hbc') || filePath.endsWith('.bundle')) {
    return 'application/javascript';
  }

  return lookupMime(filePath) || fallback;
}

export function maybeSignManifest(manifestBody: string, shouldSign: boolean) {
  if (!shouldSign) {
    return null;
  }

  const { EXPO_PRIVATE_KEY_PEM, EXPO_CODE_SIGN_KEY_ID, EXPO_CODE_SIGN_ALG } = getEnv();
  if (!EXPO_PRIVATE_KEY_PEM) {
    return null;
  }

  const privateKey = EXPO_PRIVATE_KEY_PEM.replace(/\\n/g, '\n');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(manifestBody);
  signer.end();

  const signature = signer.sign(privateKey, 'base64');
  return `sig=:${signature}:, keyid="${EXPO_CODE_SIGN_KEY_ID}", alg="${EXPO_CODE_SIGN_ALG}"`;
}

export function hashIp(ipAddress: string | null): string | null {
  if (!ipAddress) {
    return null;
  }

  const { ANALYTICS_SALT } = getEnv();
  return crypto.createHash('sha256').update(`${ANALYTICS_SALT}:${ipAddress}`).digest('hex');
}

export function getRequestIp(request: Request): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (!forwardedFor) {
    return null;
  }

  return forwardedFor.split(',')[0]?.trim() || null;
}
