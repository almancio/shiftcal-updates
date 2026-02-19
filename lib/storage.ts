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

async function ensureAssetDirectory() {
  const dir = getAssetDirectory();
  await mkdir(dir, { recursive: true });
  return dir;
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

export async function readStoredAsset(filename: string): Promise<Buffer> {
  const cleanFileName = sanitizeFileName(filename);
  const dir = await ensureAssetDirectory();
  const absolutePath = path.join(dir, cleanFileName);

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
