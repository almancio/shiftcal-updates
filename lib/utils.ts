import crypto from 'crypto';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sha256Base64Url(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('base64url');
}

export function safeJsonParse<T>(value: string): T {
  return JSON.parse(value) as T;
}

export function inferOriginFromRequest(request: Request): string {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host');

  if (host) {
    const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https');
    return `${protocol}://${host}`;
  }

  return 'http://localhost:3000';
}

export function sanitizeFileName(value: string): string {
  if (value.includes('..') || value.includes('/') || value.includes('\\')) {
    throw new Error('Invalid file path');
  }
  return value;
}
