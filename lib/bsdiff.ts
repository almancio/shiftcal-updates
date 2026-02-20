import { execFile } from 'child_process';
import { promisify } from 'util';

import { getEnv } from '@/lib/env';

const execFileAsync = promisify(execFile);

export type GenerateBsdiffResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: 'bsdiff_not_installed' | 'bsdiff_timeout' | 'bsdiff_failed';
      message: string;
    };

export async function generateBsdiffPatch(
  baseFilePath: string,
  targetFilePath: string,
  patchOutputPath: string
): Promise<GenerateBsdiffResult> {
  const { BSDIFF_BINARY } = getEnv();

  try {
    await execFileAsync(BSDIFF_BINARY, [baseFilePath, targetFilePath, patchOutputPath], {
      timeout: 15000,
      maxBuffer: 1024 * 1024 * 10
    });

    return { ok: true };
  } catch (error) {
    const err = error as NodeJS.ErrnoException & {
      killed?: boolean;
      signal?: string | null;
      stderr?: string;
      stdout?: string;
      code?: string | number;
    };

    if (err.code === 'ENOENT') {
      return {
        ok: false,
        reason: 'bsdiff_not_installed',
        message: 'bsdiff binary is not available on server'
      };
    }

    if (err.killed || err.signal === 'SIGTERM') {
      return {
        ok: false,
        reason: 'bsdiff_timeout',
        message: 'bsdiff execution timed out'
      };
    }

    const stderr = (err.stderr || '').toString().trim();
    const stdout = (err.stdout || '').toString().trim();
    const message = [stderr, stdout].filter(Boolean).join(' | ') || String(err.code || err.message || error);

    return {
      ok: false,
      reason: 'bsdiff_failed',
      message
    };
  }
}
