import { randomUUID } from 'crypto';
import JSZip from 'jszip';
import path from 'path';

import { resolveContentType } from '@/lib/expo';
import { deleteStoredAsset, storeImmutableAsset } from '@/lib/storage';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sha256Base64Url } from '@/lib/utils';

export type UpdatePlatform = 'ios' | 'android';

type ExportAssetEntry =
  | string
  | {
      path?: string;
      ext?: string;
      fileExtension?: string;
      contentType?: string;
      key?: string;
      hash?: string;
    };

type ExportPlatformMetadata = {
  bundle?: string;
  assets?: ExportAssetEntry[];
};

type ParsedExportMetadata = {
  fileMetadata: Record<string, ExportPlatformMetadata>;
};

export type ExpoManifestAsset = {
  key: string;
  contentType: string;
  url: string;
  hash: string;
  fileExtension?: string;
};

export type ExpoManifest = {
  id: string;
  createdAt: string;
  runtimeVersion: string;
  launchAsset: ExpoManifestAsset;
  assets: ExpoManifestAsset[];
  metadata: {
    message: string | null;
    appVersion: string | null;
    channel: string;
  };
  extra: {
    appVersion: string | null;
    channel: string;
  };
};

export type UpdateRecord = {
  id: string;
  channel: string;
  platform: UpdatePlatform;
  runtime_version: string;
  app_version: string | null;
  message: string | null;
  manifest: ExpoManifest;
  created_at: string;
};

export type PublishArchiveInput = {
  archiveBuffer: Buffer;
  channel: string;
  runtimeVersion: string;
  appVersion?: string;
  message?: string;
};

function normalizeZipPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');
}

function readZipFile(zip: JSZip, filePath: string) {
  const normalized = normalizeZipPath(filePath);
  return zip.file(normalized) || zip.file(`./${normalized}`);
}

function parseMetadataFile(contents: string): ParsedExportMetadata {
  const metadata = JSON.parse(contents) as Partial<ParsedExportMetadata>;

  if (!metadata.fileMetadata || typeof metadata.fileMetadata !== 'object') {
    throw new Error('The uploaded archive does not contain valid expo metadata (fileMetadata missing).');
  }

  return {
    fileMetadata: metadata.fileMetadata
  };
}

function normalizePlatform(value: string): UpdatePlatform | null {
  const platform = value.toLowerCase();
  if (platform === 'ios' || platform === 'android') {
    return platform;
  }

  return null;
}

function getAssetPath(entry: ExportAssetEntry): string | null {
  if (typeof entry === 'string') {
    return entry;
  }

  return entry.path || null;
}

function getAssetExtension(entry: ExportAssetEntry, fallbackPath: string): string | undefined {
  if (typeof entry !== 'string') {
    const explicit = entry.fileExtension || entry.ext;
    if (explicit) {
      return explicit.replace(/^\./, '');
    }
  }

  const ext = path.extname(fallbackPath).replace(/^\./, '');
  return ext || undefined;
}

function toAbsoluteUrl(url: string, origin: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return new URL(url, origin).toString();
}

function cloneManifestWithOrigin(manifest: ExpoManifest, origin: string): ExpoManifest {
  return {
    ...manifest,
    launchAsset: {
      ...manifest.launchAsset,
      url: toAbsoluteUrl(manifest.launchAsset.url, origin)
    },
    assets: manifest.assets.map((asset) => ({
      ...asset,
      url: toAbsoluteUrl(asset.url, origin)
    }))
  };
}

function normalizeCurrentUpdateId(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.replace(/^"|"$/g, '');
}

export async function publishUpdateArchive(input: PublishArchiveInput): Promise<UpdateRecord[]> {
  const zip = await JSZip.loadAsync(input.archiveBuffer);
  const metadataFile = zip.file('metadata.json') || zip.file('./metadata.json');

  if (!metadataFile) {
    throw new Error('metadata.json not found in archive. Export with "expo export" before uploading.');
  }

  const metadataContents = await metadataFile.async('string');
  const metadata = parseMetadataFile(metadataContents);

  const platformEntries = Object.entries(metadata.fileMetadata)
    .map(([platformName, platformMetadata]) => {
      const platform = normalizePlatform(platformName);
      if (!platform || !platformMetadata?.bundle) {
        return null;
      }

      return {
        platform,
        bundle: platformMetadata.bundle,
        assets: platformMetadata.assets || []
      };
    })
    .filter((entry): entry is { platform: UpdatePlatform; bundle: string; assets: ExportAssetEntry[] } => !!entry);

  if (!platformEntries.length) {
    throw new Error('No iOS/Android bundle metadata found in archive.');
  }

  const supabase = getSupabaseAdmin();
  const createdAt = new Date().toISOString();
  const published: UpdateRecord[] = [];

  for (const entry of platformEntries) {
    const launchFile = readZipFile(zip, entry.bundle);
    if (!launchFile) {
      throw new Error(`Launch bundle missing in archive: ${entry.bundle}`);
    }

    const launchBuffer = await launchFile.async('nodebuffer');
    const launchExt = path.extname(entry.bundle).replace(/^\./, '') || 'js';
    const launchStored = await storeImmutableAsset(launchBuffer, launchExt);
    const launchHash = sha256Base64Url(launchBuffer);

    const manifestAssets: ExpoManifestAsset[] = [];

    for (const assetEntry of entry.assets) {
      const assetPath = getAssetPath(assetEntry);
      if (!assetPath) {
        continue;
      }

      const zipAsset = readZipFile(zip, assetPath);
      if (!zipAsset) {
        throw new Error(`Asset referenced in metadata is missing: ${assetPath}`);
      }

      const assetBuffer = await zipAsset.async('nodebuffer');
      const extension = getAssetExtension(assetEntry, assetPath);
      const storedAsset = await storeImmutableAsset(assetBuffer, extension);
      const hash = sha256Base64Url(assetBuffer);
      const keyFromMetadata = typeof assetEntry === 'string' ? null : assetEntry.key || assetEntry.hash;

      manifestAssets.push({
        key: keyFromMetadata || hash,
        contentType:
          typeof assetEntry === 'string'
            ? resolveContentType(assetPath)
            : assetEntry.contentType || resolveContentType(assetPath),
        url: storedAsset.relativeUrl,
        hash,
        fileExtension: extension ? `.${extension}` : undefined
      });
    }

    const updateId = randomUUID();

    const manifest: ExpoManifest = {
      id: updateId,
      createdAt,
      runtimeVersion: input.runtimeVersion,
      launchAsset: {
        key: launchHash,
        contentType: 'application/javascript',
        url: launchStored.relativeUrl,
        hash: launchHash,
        fileExtension: `.${launchExt}`
      },
      assets: manifestAssets,
      metadata: {
        message: input.message || null,
        appVersion: input.appVersion || null,
        channel: input.channel
      },
      extra: {
        appVersion: input.appVersion || null,
        channel: input.channel
      }
    };

    const { data, error } = await supabase
      .from('expo_updates')
      .insert({
        id: updateId,
        platform: entry.platform,
        channel: input.channel,
        runtime_version: input.runtimeVersion,
        app_version: input.appVersion || null,
        message: input.message || null,
        manifest,
        created_at: createdAt,
        assets_count: manifestAssets.length
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Unable to persist published update: ${error.message}`);
    }

    published.push(data as UpdateRecord);
  }

  return published;
}

export async function listPublishedUpdates(limit = 100): Promise<UpdateRecord[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('expo_updates')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Unable to list updates: ${error.message}`);
  }

  return (data || []) as UpdateRecord[];
}

export type ResolveUpdateInput = {
  platform: string;
  runtimeVersion: string;
  channel: string;
  currentUpdateId: string | null;
  origin: string;
};

export type DeleteUpdateResult = {
  deleted: boolean;
  updateId: string;
  assetsDeleted: number;
  eventsDeleted: number;
  warnings: string[];
};

function extractFilenameFromAssetUrl(assetUrl: string | undefined): string | null {
  if (!assetUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(assetUrl, 'http://local.placeholder');
    const file = parsedUrl.searchParams.get('file');
    if (!file) {
      return null;
    }

    return decodeURIComponent(file);
  } catch {
    return null;
  }
}

function collectManifestAssetFilenames(manifest: ExpoManifest): Set<string> {
  const fileNames = new Set<string>();

  const launchAssetName = extractFilenameFromAssetUrl(manifest.launchAsset?.url);
  if (launchAssetName) {
    fileNames.add(launchAssetName);
  }

  for (const asset of manifest.assets || []) {
    const fileName = extractFilenameFromAssetUrl(asset.url);
    if (fileName) {
      fileNames.add(fileName);
    }
  }

  return fileNames;
}

export async function deletePublishedUpdate(updateId: string): Promise<DeleteUpdateResult> {
  const normalizedId = updateId.trim();
  if (!normalizedId) {
    throw new Error('updateId is required.');
  }

  const supabase = getSupabaseAdmin();

  const { data: existing, error: existingError } = await supabase
    .from('expo_updates')
    .select('id,manifest')
    .eq('id', normalizedId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Unable to find update: ${existingError.message}`);
  }

  if (!existing) {
    return {
      deleted: false,
      updateId: normalizedId,
      assetsDeleted: 0,
      eventsDeleted: 0,
      warnings: []
    };
  }

  const manifest = existing.manifest as ExpoManifest;
  const candidateFiles = collectManifestAssetFilenames(manifest);

  const { error: deleteUpdateError } = await supabase.from('expo_updates').delete().eq('id', normalizedId);
  if (deleteUpdateError) {
    throw new Error(`Unable to delete update: ${deleteUpdateError.message}`);
  }

  const warnings: string[] = [];
  let eventsDeleted = 0;

  const { count: eventsDeletedCount, error: deleteEventsError } = await supabase
    .from('expo_events')
    .delete({ count: 'exact' })
    .eq('update_id', normalizedId);

  if (deleteEventsError) {
    warnings.push(`Could not remove related events: ${deleteEventsError.message}`);
  } else {
    eventsDeleted = eventsDeletedCount || 0;
  }

  const { data: remainingUpdates, error: remainingError } = await supabase.from('expo_updates').select('manifest');
  if (remainingError) {
    warnings.push(`Could not verify shared assets: ${remainingError.message}`);
  }

  const referencedFiles = new Set<string>();
  if (!remainingError) {
    for (const row of remainingUpdates || []) {
      if (!row?.manifest) {
        continue;
      }

      for (const fileName of collectManifestAssetFilenames(row.manifest as ExpoManifest)) {
        referencedFiles.add(fileName);
      }
    }
  }

  let assetsDeleted = 0;
  if (!remainingError) {
    for (const fileName of candidateFiles) {
      if (referencedFiles.has(fileName)) {
        continue;
      }

      try {
        if (await deleteStoredAsset(fileName)) {
          assetsDeleted += 1;
        }
      } catch (error) {
        warnings.push(`Could not remove asset ${fileName}: ${(error as Error).message}`);
      }
    }
  }

  return {
    deleted: true,
    updateId: normalizedId,
    assetsDeleted,
    eventsDeleted,
    warnings
  };
}

export async function resolveLatestUpdate(input: ResolveUpdateInput): Promise<ExpoManifest | null> {
  const platform = normalizePlatform(input.platform);
  if (!platform || !input.runtimeVersion) {
    return null;
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('expo_updates')
    .select('manifest')
    .eq('platform', platform)
    .eq('runtime_version', input.runtimeVersion)
    .eq('channel', input.channel || 'production')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to resolve latest update: ${error.message}`);
  }

  if (!data?.manifest) {
    return null;
  }

  const manifest = data.manifest as ExpoManifest;
  const requestedCurrent = normalizeCurrentUpdateId(input.currentUpdateId);
  if (requestedCurrent && requestedCurrent === manifest.id) {
    return null;
  }

  return cloneManifestWithOrigin(manifest, input.origin);
}
