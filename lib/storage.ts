import { access, mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';

import { getEnv } from '@/lib/env';
import { sanitizeFileName, sha256Base64Url } from '@/lib/utils';

function normalizeExtension(extension?: string): string {
  if (!extension) {
    return '';
  }

  const cleaned = extension.replace(/^\./, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return cleaned ? `.${cleaned}` : '';
}

function getAssetDirectory() {
  const { STORAGE_DIR } = getEnv();
  return path.resolve(process.cwd(), STORAGE_DIR, 'assets');
}

function getDiffDirectory() {
  const { STORAGE_DIR } = getEnv();
  return path.resolve(process.cwd(), STORAGE_DIR, 'update-diffs');
}

async function ensureAssetDirectory() {
  const dir = getAssetDirectory();
  await mkdir(dir, { recursive: true });
  return dir;
}

function sanitizeUpdateId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || !/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    throw new Error('Invalid update id');
  }
  return trimmed;
}

export async function storeImmutableAsset(buffer: Buffer, extension?: string) {
  const hash = sha256Base64Url(buffer);
  const normalizedExt = normalizeExtension(extension);
  const filename = `${hash}${normalizedExt}`;

  const dir = await ensureAssetDirectory();
  const absolutePath = path.join(dir, filename);

  try {
    await access(absolutePath);
  } catch {
    await writeFile(absolutePath, buffer);
  }

  return {
    hash,
    filename,
    relativeUrl: `/api/assets?file=${encodeURIComponent(filename)}`
  };
}

export async function resolveStoredAssetPath(filename: string): Promise<string> {
  const cleanFileName = sanitizeFileName(filename);
  const dir = await ensureAssetDirectory();
  return path.join(dir, cleanFileName);
}

export async function readStoredAsset(filename: string): Promise<Buffer> {
  const absolutePath = await resolveStoredAssetPath(filename);
  return readFile(absolutePath);
}

export async function deleteStoredAsset(filename: string): Promise<boolean> {
  const cleanFileName = sanitizeFileName(filename);
  const dir = await ensureAssetDirectory();
  const absolutePath = path.join(dir, cleanFileName);

  try {
    await unlink(absolutePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export async function resolveStoredPatchPath(baseUpdateId: string, requestedUpdateId: string): Promise<string> {
  const safeBaseUpdateId = sanitizeUpdateId(baseUpdateId);
  const safeRequestedUpdateId = sanitizeUpdateId(requestedUpdateId);
  const diffDir = getDiffDirectory();
  const patchDirectory = path.join(diffDir, safeBaseUpdateId);
  await mkdir(patchDirectory, { recursive: true });
  return path.join(patchDirectory, `${safeRequestedUpdateId}.bsdiff`);
}
