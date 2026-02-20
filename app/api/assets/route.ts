import { NextResponse } from 'next/server';
import { access, readFile, stat } from 'fs/promises';

import { generateBsdiffPatch } from '@/lib/bsdiff';
import { getRequestIp, hashIp, resolveContentType } from '@/lib/expo';
import { readStoredAsset, resolveStoredAssetPath, resolveStoredPatchPath } from '@/lib/storage';
import { trackEvent } from '@/lib/services/events-service';
import { getUpdatesForDiffByIds } from '@/lib/services/updates-service';

export const runtime = 'nodejs';

type ParsedAimToken = {
  token: string;
  q: number;
  index: number;
};

type PatchAttemptInfo = {
  attempted: boolean;
  served: boolean;
  reason:
    | 'served'
    | 'not_requested'
    | 'missing_update_headers'
    | 'same_update'
    | 'updates_not_found'
    | 'incompatible_updates'
    | 'not_launch_asset_request'
    | 'base_launch_asset_missing'
    | 'requested_asset_missing'
    | 'base_asset_missing'
    | 'patch_read_failed'
    | 'patch_not_smaller'
    | 'bsdiff_not_installed'
    | 'bsdiff_timeout'
    | 'bsdiff_failed';
  source?: 'cache' | 'generated';
  baseUpdateId?: string;
  requestedUpdateId?: string;
  fullAssetBytes?: number;
  servedBytes?: number;
  savedBytes?: number;
  errorMessage?: string;
  patchBuffer?: Buffer;
};

function parseAimHeader(value: string | null): ParsedAimToken[] {
  if (!value?.trim()) {
    return [];
  }

  return value
    .split(',')
    .map((rawToken, index) => {
      const [tokenPart, ...params] = rawToken.split(';').map((part) => part.trim());
      const token = tokenPart.toLowerCase();
      if (!token) {
        return null;
      }

      const qParam = params.find((param) => param.toLowerCase().startsWith('q='));
      const parsedQ = qParam ? Number(qParam.split('=')[1]) : 1;

      return {
        token,
        q: Number.isFinite(parsedQ) ? Math.max(0, Math.min(1, parsedQ)) : 1,
        index
      };
    })
    .filter((token): token is ParsedAimToken => Boolean(token))
    .sort((a, b) => b.q - a.q || a.index - b.index);
}

function normalizeUpdateId(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/^"|"$/g, '');
  if (!normalized || !/^[a-zA-Z0-9._-]+$/.test(normalized)) {
    return null;
  }

  return normalized;
}

async function maybeServePatch(request: Request, fileName: string): Promise<PatchAttemptInfo> {
  const aImTokens = parseAimHeader(request.headers.get('a-im'));
  const acceptsBsdiff = aImTokens.some((token) => token.token === 'bsdiff' && token.q > 0);
  if (!acceptsBsdiff) {
    return {
      attempted: false,
      served: false,
      reason: 'not_requested'
    };
  }

  const currentUpdateId = normalizeUpdateId(request.headers.get('expo-current-update-id'));
  const requestedUpdateId = normalizeUpdateId(request.headers.get('expo-requested-update-id'));

  if (!currentUpdateId || !requestedUpdateId) {
    return {
      attempted: true,
      served: false,
      reason: 'missing_update_headers'
    };
  }

  if (currentUpdateId === requestedUpdateId) {
    return {
      attempted: true,
      served: false,
      reason: 'same_update',
      baseUpdateId: currentUpdateId,
      requestedUpdateId
    };
  }

  const updatesById = await getUpdatesForDiffByIds([currentUpdateId, requestedUpdateId]);
  const currentUpdate = updatesById.get(currentUpdateId);
  const requestedUpdate = updatesById.get(requestedUpdateId);

  if (!currentUpdate || !requestedUpdate) {
    return {
      attempted: true,
      served: false,
      reason: 'updates_not_found',
      baseUpdateId: currentUpdateId,
      requestedUpdateId
    };
  }

  if (
    currentUpdate.platform !== requestedUpdate.platform ||
    currentUpdate.runtimeVersion !== requestedUpdate.runtimeVersion
  ) {
    return {
      attempted: true,
      served: false,
      reason: 'incompatible_updates',
      baseUpdateId: currentUpdateId,
      requestedUpdateId
    };
  }

  if (!currentUpdate.launchAssetFile) {
    return {
      attempted: true,
      served: false,
      reason: 'base_launch_asset_missing',
      baseUpdateId: currentUpdateId,
      requestedUpdateId
    };
  }

  if (!requestedUpdate.launchAssetFile) {
    return {
      attempted: true,
      served: false,
      reason: 'requested_asset_missing',
      baseUpdateId: currentUpdateId,
      requestedUpdateId
    };
  }

  if (requestedUpdate.launchAssetFile !== fileName) {
    return {
      attempted: true,
      served: false,
      reason: 'not_launch_asset_request',
      baseUpdateId: currentUpdateId,
      requestedUpdateId
    };
  }

  const currentAssetPath = await resolveStoredAssetPath(currentUpdate.launchAssetFile);
  const requestedAssetPath = await resolveStoredAssetPath(requestedUpdate.launchAssetFile);

  try {
    await access(currentAssetPath);
  } catch {
    return {
      attempted: true,
      served: false,
      reason: 'base_asset_missing',
      baseUpdateId: currentUpdateId,
      requestedUpdateId
    };
  }

  let requestedAssetStats;
  try {
    requestedAssetStats = await stat(requestedAssetPath);
  } catch {
    return {
      attempted: true,
      served: false,
      reason: 'requested_asset_missing',
      baseUpdateId: currentUpdateId,
      requestedUpdateId
    };
  }
  const fullAssetBytes = requestedAssetStats.size;
  const patchPath = await resolveStoredPatchPath(currentUpdateId, requestedUpdateId);

  let patchBuffer: Buffer | null = null;
  let source: 'cache' | 'generated' = 'cache';

  try {
    patchBuffer = await readFile(patchPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      return {
        attempted: true,
        served: false,
        reason: 'patch_read_failed',
        baseUpdateId: currentUpdateId,
        requestedUpdateId,
        fullAssetBytes,
        errorMessage: (error as Error).message
      };
    }
  }

  if (!patchBuffer) {
    source = 'generated';
    const generated = await generateBsdiffPatch(currentAssetPath, requestedAssetPath, patchPath);
    if (!generated.ok) {
      return {
        attempted: true,
        served: false,
        reason: generated.reason,
        baseUpdateId: currentUpdateId,
        requestedUpdateId,
        fullAssetBytes,
        errorMessage: generated.message
      };
    }

    patchBuffer = await readFile(patchPath);
  }

  const servedBytes = patchBuffer.byteLength;
  const savedBytes = Math.max(0, fullAssetBytes - servedBytes);

  if (servedBytes >= fullAssetBytes) {
    return {
      attempted: true,
      served: false,
      reason: 'patch_not_smaller',
      source,
      baseUpdateId: currentUpdateId,
      requestedUpdateId,
      fullAssetBytes,
      servedBytes,
      savedBytes
    };
  }

  return {
    attempted: true,
    served: true,
    reason: 'served',
    source,
    baseUpdateId: currentUpdateId,
    requestedUpdateId,
    fullAssetBytes,
    servedBytes,
    savedBytes,
    patchBuffer
  };
}

export async function GET(request: Request) {
  const fileName = new URL(request.url).searchParams.get('file');

  if (!fileName) {
    return NextResponse.json({ error: 'Missing file query parameter.' }, { status: 400 });
  }

  const ipHash = hashIp(getRequestIp(request));

  try {
    const patchAttempt = await maybeServePatch(request, fileName);

    if (patchAttempt.served && patchAttempt.patchBuffer) {
      await trackEvent({
        eventType: 'asset_download',
        ipHash,
        updateId: patchAttempt.requestedUpdateId || null,
        details: {
          file: fileName,
          contentType: 'application/vnd.bsdiff',
          size: patchAttempt.servedBytes ?? patchAttempt.patchBuffer.byteLength,
          deliveryMode: 'patch',
          patchAttempted: true,
          patchServed: true,
          patchReason: 'served',
          patchSource: patchAttempt.source || 'cache',
          baseUpdateId: patchAttempt.baseUpdateId || null,
          requestedUpdateId: patchAttempt.requestedUpdateId || null,
          fullAssetBytes: patchAttempt.fullAssetBytes ?? null,
          servedBytes: patchAttempt.servedBytes ?? patchAttempt.patchBuffer.byteLength,
          savedBytes: patchAttempt.savedBytes ?? 0
        }
      });

      return new NextResponse(Uint8Array.from(patchAttempt.patchBuffer.values()), {
        status: 226,
        headers: {
          'content-type': 'application/vnd.bsdiff',
          'content-length': String(patchAttempt.patchBuffer.byteLength),
          'cache-control': 'private, no-store',
          im: 'bsdiff',
          'expo-base-update-id': patchAttempt.baseUpdateId || '',
          vary: 'a-im, expo-current-update-id, expo-requested-update-id',
          'x-expo-asset-delivery': 'patch',
          'x-expo-bsdiff-source': patchAttempt.source || 'cache'
        }
      });
    }

    const assetBuffer = await readStoredAsset(fileName);
    const contentType = resolveContentType(fileName);

    await trackEvent({
      eventType: 'asset_download',
      ipHash,
      updateId: patchAttempt.requestedUpdateId || null,
      details: {
        file: fileName,
        contentType,
        size: assetBuffer.byteLength,
        deliveryMode: 'full',
        patchAttempted: patchAttempt.attempted,
        patchServed: false,
        patchReason: patchAttempt.reason,
        patchSource: patchAttempt.source || null,
        baseUpdateId: patchAttempt.baseUpdateId || null,
        requestedUpdateId: patchAttempt.requestedUpdateId || null,
        fullAssetBytes: patchAttempt.fullAssetBytes ?? assetBuffer.byteLength,
        servedBytes: assetBuffer.byteLength,
        savedBytes: 0,
        patchError: patchAttempt.errorMessage || null
      }
    });

    return new NextResponse(Uint8Array.from(assetBuffer.values()), {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=31536000, immutable',
        vary: 'a-im, expo-current-update-id, expo-requested-update-id',
        'x-expo-asset-delivery': 'full',
        'x-expo-bsdiff-status': patchAttempt.attempted ? `fallback:${patchAttempt.reason}` : 'not_requested'
      }
    });
  } catch {
    return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
  }
}
