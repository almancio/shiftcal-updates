import crypto from 'crypto';
import { cookies } from 'next/headers';

import { requireEnv } from '@/lib/env';

export const ADMIN_COOKIE_NAME = 'sc_admin_session';

function timingSafeMatch(expected: string, candidate: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const candidateBuffer = Buffer.from(candidate);

  if (expectedBuffer.length !== candidateBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, candidateBuffer);
}

export function isValidAdminToken(candidate?: string | null): boolean {
  if (!candidate) {
    return false;
  }

  const adminToken = requireEnv('ADMIN_TOKEN');
  return timingSafeMatch(adminToken, candidate);
}

export function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(' ');
  if (!scheme || !token) {
    return null;
  }

  if (scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token.trim();
}

export async function getAdminSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE_NAME)?.value ?? null;
}

export async function assertAdmin(request: Request): Promise<boolean> {
  const bearer = getBearerToken(request);
  if (isValidAdminToken(bearer)) {
    return true;
  }

  const headerToken = request.headers.get('x-admin-token');
  if (isValidAdminToken(headerToken)) {
    return true;
  }

  const sessionToken = await getAdminSessionToken();
  return isValidAdminToken(sessionToken);
}
