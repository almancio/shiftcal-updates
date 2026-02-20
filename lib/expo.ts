import crypto from 'crypto';
import { lookup as lookupMime } from 'mime-types';

import { getEnv } from '@/lib/env';

const SUPPORTED_PLATFORMS = new Set(['ios', 'android']);
const SUPPORTED_MANIFEST_CONTENT_TYPES = ['application/expo+json', 'application/json'] as const;

export type SupportedManifestContentType = (typeof SUPPORTED_MANIFEST_CONTENT_TYPES)[number];
export type SfvDictionary = Record<string, string | boolean>;

export type ExpoUpdateRequestContext = {
  protocolVersion: string | null;
  platform: string;
  runtimeVersion: string;
  channel: string;
  currentUpdateId: string | null;
  expectSignatureHeader: string | null;
  expectSignature: SfvDictionary | null;
  expectSignatureValid: boolean;
  appVersion: string | null;
  deviceId: string | null;
  osName: string | null;
  osVersion: string | null;
  deviceModel: string | null;
};

type ParsedAcceptItem = {
  mediaType: string;
  quality: number;
  specificity: number;
  index: number;
};

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseAcceptHeader(accept: string): ParsedAcceptItem[] {
  const parts = splitCsv(accept);

  return parts
    .map((part, index) => {
      const [rawMediaType, ...rawParams] = part.split(';').map((item) => item.trim());
      const mediaType = rawMediaType.toLowerCase();
      if (!mediaType.includes('/')) {
        return null;
      }

      let quality = 1;
      for (const parameter of rawParams) {
        const [key, value] = parameter.split('=').map((item) => item.trim());
        if (key?.toLowerCase() === 'q') {
          const parsed = Number(value);
          if (Number.isFinite(parsed)) {
            quality = Math.max(0, Math.min(1, parsed));
          }
        }
      }

      let specificity = 0;
      if (mediaType === '*/*') {
        specificity = 0;
      } else if (mediaType.endsWith('/*')) {
        specificity = 1;
      } else {
        specificity = 2;
      }

      return {
        mediaType,
        quality,
        specificity,
        index
      };
    })
    .filter((entry): entry is ParsedAcceptItem => Boolean(entry));
}

function mediaTypeMatches(accepted: string, supported: SupportedManifestContentType): boolean {
  if (accepted === '*/*') {
    return true;
  }

  const [acceptedType, acceptedSubtype] = accepted.split('/');
  const [supportedType, supportedSubtype] = supported.split('/');

  if (!acceptedType || !acceptedSubtype) {
    return false;
  }

  if (acceptedSubtype === '*') {
    return acceptedType === supportedType;
  }

  return accepted === supported;
}

function parseStructuredDictionary(raw: string): { valid: boolean; value: SfvDictionary | null } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: true, value: {} };
  }

  const dictionary: SfvDictionary = {};
  const members = splitCsv(trimmed);

  for (const member of members) {
    const [rawKey, ...rawValueParts] = member.split('=');
    const key = rawKey?.trim();

    if (!key || !/^[a-z*][a-z0-9_.*-]*$/i.test(key)) {
      return { valid: false, value: null };
    }

    if (!rawValueParts.length) {
      dictionary[key] = true;
      continue;
    }

    const rawValue = rawValueParts.join('=').trim();

    if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
      dictionary[key] = rawValue.slice(1, -1).replace(/\\"/g, '"');
      continue;
    }

    if (rawValue.startsWith(':') && rawValue.endsWith(':')) {
      dictionary[key] = rawValue;
      continue;
    }

    dictionary[key] = rawValue;
  }

  return { valid: true, value: dictionary };
}

function serializeStructuredDictionary(dictionary: Record<string, string>): string {
  const entries = Object.entries(dictionary).filter(([key, value]) => key && value !== undefined);
  if (!entries.length) {
    return '';
  }

  return entries
    .map(([key, value]) => {
      const safeKey = key.toLowerCase().replace(/[^a-z0-9_.*-]/g, '-');
      const safeValue = String(value).replace(/"/g, '\\"');
      return `${safeKey}="${safeValue}"`;
    })
    .join(', ');
}

export function isSupportedExpoPlatform(platform: string): boolean {
  return SUPPORTED_PLATFORMS.has(platform);
}

export function negotiateManifestContentType(request: Request): SupportedManifestContentType | null {
  const accept = request.headers.get('accept');
  if (!accept || !accept.trim()) {
    return 'application/expo+json';
  }

  const accepted = parseAcceptHeader(accept)
    .filter((entry) => entry.quality > 0)
    .sort((a, b) => {
      if (b.quality !== a.quality) {
        return b.quality - a.quality;
      }
      if (b.specificity !== a.specificity) {
        return b.specificity - a.specificity;
      }
      return a.index - b.index;
    });

  for (const acceptedEntry of accepted) {
    for (const supported of SUPPORTED_MANIFEST_CONTENT_TYPES) {
      if (mediaTypeMatches(acceptedEntry.mediaType, supported)) {
        return supported;
      }
    }
  }

  return null;
}

export function parseExpoContextFromRequest(request: Request): ExpoUpdateRequestContext {
  const platform = request.headers.get('expo-platform')?.toLowerCase().trim() || '';
  const expectSignatureHeader = request.headers.get('expo-expect-signature');
  const parsedExpectSignature = expectSignatureHeader
    ? parseStructuredDictionary(expectSignatureHeader)
    : { valid: true, value: null };

  return {
    protocolVersion: request.headers.get('expo-protocol-version'),
    platform,
    runtimeVersion: request.headers.get('expo-runtime-version') || '',
    channel: request.headers.get('expo-channel-name') || 'production',
    currentUpdateId: request.headers.get('expo-current-update-id'),
    expectSignatureHeader,
    expectSignature: parsedExpectSignature.value,
    expectSignatureValid: parsedExpectSignature.valid,
    appVersion: request.headers.get('x-app-version'),
    deviceId: request.headers.get('x-device-id'),
    osName: request.headers.get('x-os-name'),
    osVersion: request.headers.get('x-os-version'),
    deviceModel: request.headers.get('x-device-model')
  };
}

export function expoResponseHeaders(options?: {
  manifestFilters?: Record<string, string>;
  serverDefinedHeaders?: Record<string, string>;
  cacheControl?: string;
  vary?: string[];
}) {
  return {
    'expo-protocol-version': '1',
    'expo-sfv-version': '0',
    'expo-manifest-filters': serializeStructuredDictionary(options?.manifestFilters || {}),
    'expo-server-defined-headers': serializeStructuredDictionary(options?.serverDefinedHeaders || {}),
    'cache-control': options?.cacheControl || 'private, max-age=0',
    vary: options?.vary?.join(', ') || 'accept, expo-platform, expo-runtime-version, expo-channel-name'
  };
}

export function resolveContentType(filePath: string, fallback = 'application/octet-stream'): string {
  if (filePath.endsWith('.hbc') || filePath.endsWith('.bundle')) {
    return 'application/javascript';
  }

  return lookupMime(filePath) || fallback;
}

export function maybeSignManifest(
  manifestBody: string,
  options: {
    shouldSign: boolean;
    expectedKeyId?: string | null;
    expectedAlg?: string | null;
  }
): { signature: string | null; reason?: string } {
  if (!options.shouldSign) {
    return { signature: null };
  }

  const { EXPO_PRIVATE_KEY_PEM, EXPO_CODE_SIGN_KEY_ID, EXPO_CODE_SIGN_ALG } = getEnv();
  if (!EXPO_PRIVATE_KEY_PEM) {
    return { signature: null, reason: 'missing_private_key' };
  }

  if (options.expectedKeyId && options.expectedKeyId !== EXPO_CODE_SIGN_KEY_ID) {
    return { signature: null, reason: 'key_id_mismatch' };
  }

  if (options.expectedAlg && options.expectedAlg !== EXPO_CODE_SIGN_ALG) {
    return { signature: null, reason: 'algorithm_mismatch' };
  }

  const privateKey = EXPO_PRIVATE_KEY_PEM.replace(/\\n/g, '\n');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(manifestBody);
  signer.end();

  const signature = signer.sign(privateKey, 'base64');
  return {
    signature: `sig=:${signature}:, keyid="${EXPO_CODE_SIGN_KEY_ID}", alg="${EXPO_CODE_SIGN_ALG}"`
  };
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
