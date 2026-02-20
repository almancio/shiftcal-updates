import { eachDayOfInterval, format, startOfDay, subDays } from 'date-fns';

import { getSupabaseAdmin } from '@/lib/supabase';

type EventRow = {
  event_type: string;
  platform: string | null;
  runtime_version: string | null;
  channel: string | null;
  app_version: string | null;
  device_id: string | null;
  ip_hash: string | null;
  os_name: string | null;
  os_version: string | null;
  device_model: string | null;
  update_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

type UpdateRow = {
  id: string;
  platform: string;
  channel: string;
  runtime_version: string;
  app_version: string | null;
  message: string | null;
  created_at: string;
  assets_count: number;
};

export type DashboardStats = {
  summary: {
    totalChecks30d: number;
    checks24h: number;
    updatesServed30d: number;
    configFetches30d: number;
    uniqueDevices30d: number;
    totalPublishedUpdates: number;
    assetDownloads30d: number;
    patchAttempts30d: number;
    patchServed30d: number;
    patchFallback30d: number;
    patchSavedBytes30d: number;
  };
  daily: Array<{
    day: string;
    checks: number;
    served: number;
    configFetches: number;
    assetsDownloaded: number;
    patchesServed: number;
    patchFallbacks: number;
  }>;
  platforms: Array<{ label: string; value: number }>;
  versions: Array<{ label: string; value: number }>;
  runtimes: Array<{ label: string; value: number }>;
  channels: Array<{ label: string; value: number }>;
  recentDevices: Array<{
    device: string;
    platform: string;
    appVersion: string;
    runtimeVersion: string;
    os: string;
    lastSeen: string;
  }>;
  latestUpdates: Array<{
    id: string;
    platform: string;
    channel: string;
    runtimeVersion: string;
    appVersion: string;
    message: string;
    createdAt: string;
    assetsCount: number;
  }>;
  recentDiffingEvents: Array<{
    createdAt: string;
    file: string;
    deliveryMode: string;
    patchReason: string;
    patchSource: string;
    baseUpdateId: string;
    requestedUpdateId: string;
    servedBytes: number;
    fullAssetBytes: number;
    savedBytes: number;
  }>;
};

function countByLabel(values: Array<string | null | undefined>, fallback: string) {
  const map = new Map<string, number>();
  for (const value of values) {
    const label = value?.trim() || fallback;
    map.set(label, (map.get(label) || 0) + 1);
  }

  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export async function getDashboardStats(days = 30): Promise<DashboardStats> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const since = subDays(now, days);

  const [{ data: events, error: eventError }, { data: updates, error: updateError }] = await Promise.all([
    supabase
      .from('expo_events')
      .select(
        'event_type,platform,runtime_version,channel,app_version,device_id,ip_hash,os_name,os_version,device_model,update_id,details,created_at'
      )
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true })
      .limit(100000),
    supabase
      .from('expo_updates')
      .select('id,platform,channel,runtime_version,app_version,message,created_at,assets_count')
      .order('created_at', { ascending: false })
      .limit(200)
  ]);

  if (eventError) {
    throw new Error(`Unable to load event data: ${eventError.message}`);
  }

  if (updateError) {
    throw new Error(`Unable to load updates data: ${updateError.message}`);
  }

  const eventRows = (events || []) as EventRow[];
  const updateRows = (updates || []) as UpdateRow[];

  const start = startOfDay(since);
  const end = startOfDay(now);
  const dayKeys = eachDayOfInterval({ start, end }).map((date) => format(date, 'yyyy-MM-dd'));
  const dayMap = new Map(
    dayKeys.map((day) => [
      day,
      {
        day,
        checks: 0,
        served: 0,
        configFetches: 0,
        assetsDownloaded: 0,
        patchesServed: 0,
        patchFallbacks: 0
      }
    ])
  );

  const uniqueDevices = new Set<string>();
  const latestDeviceMap = new Map<string, DashboardStats['recentDevices'][number]>();
  const recentDiffingEvents: DashboardStats['recentDiffingEvents'] = [];

  let assetDownloads30d = 0;
  let patchAttempts30d = 0;
  let patchServed30d = 0;
  let patchFallback30d = 0;
  let patchSavedBytes30d = 0;
  let checks24h = 0;

  const threshold24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  function inferOsFallback(platform: string | null): string {
    if (platform === 'ios') {
      return 'iOS';
    }
    if (platform === 'android') {
      return 'Android';
    }
    return 'unknown';
  }

  function getDetails(event: EventRow): Record<string, unknown> {
    if (!event.details || typeof event.details !== 'object' || Array.isArray(event.details)) {
      return {};
    }

    return event.details;
  }

  function readBoolean(details: Record<string, unknown>, key: string): boolean {
    return details[key] === true;
  }

  function readNumber(details: Record<string, unknown>, key: string): number {
    const value = details[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return 0;
  }

  function readString(details: Record<string, unknown>, key: string, fallback = ''): string {
    const value = details[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }

    return fallback;
  }

  for (const event of eventRows) {
    const eventDate = new Date(event.created_at);
    const dayKey = format(eventDate, 'yyyy-MM-dd');
    const bucket = dayMap.get(dayKey);

    if (event.event_type === 'update_check') {
      if (bucket) {
        bucket.checks += 1;
      }

      if (eventDate > threshold24h) {
        checks24h += 1;
      }

      const identity = event.device_id || event.ip_hash;
      if (identity) {
        uniqueDevices.add(identity);

        const currentEntry = latestDeviceMap.get(identity);
        if (!currentEntry || new Date(currentEntry.lastSeen) < eventDate) {
          latestDeviceMap.set(identity, {
            device: event.device_id || event.ip_hash?.slice(0, 10) || 'Unknown',
            platform: event.platform || 'unknown',
            appVersion: event.app_version || event.runtime_version || 'unknown',
            runtimeVersion: event.runtime_version || 'unknown',
            os:
              [event.os_name, event.os_version].filter(Boolean).join(' ') ||
              inferOsFallback(event.platform),
            lastSeen: event.created_at
          });
        }
      }
    }

    if (event.event_type === 'update_served' && bucket) {
      bucket.served += 1;
    }

    if (event.event_type === 'config_fetch' && bucket) {
      bucket.configFetches += 1;
    }

    if (event.event_type === 'asset_download') {
      const details = getDetails(event);
      const patchAttempted = readBoolean(details, 'patchAttempted');
      const patchServed = readBoolean(details, 'patchServed');
      const savedBytes = readNumber(details, 'savedBytes');
      const servedBytes = readNumber(details, 'servedBytes');
      const fullAssetBytes = readNumber(details, 'fullAssetBytes');

      assetDownloads30d += 1;
      patchSavedBytes30d += savedBytes;

      if (bucket) {
        bucket.assetsDownloaded += 1;
      }

      if (patchAttempted) {
        patchAttempts30d += 1;
      }

      if (patchServed) {
        patchServed30d += 1;
        if (bucket) {
          bucket.patchesServed += 1;
        }
      } else if (patchAttempted) {
        patchFallback30d += 1;
        if (bucket) {
          bucket.patchFallbacks += 1;
        }
      }

      if (patchAttempted || patchServed) {
        recentDiffingEvents.push({
          createdAt: event.created_at,
          file: readString(details, 'file', 'unknown'),
          deliveryMode: readString(details, 'deliveryMode', patchServed ? 'patch' : 'full'),
          patchReason: readString(details, 'patchReason', patchServed ? 'served' : 'unknown'),
          patchSource: readString(details, 'patchSource', '-'),
          baseUpdateId: readString(details, 'baseUpdateId', '-'),
          requestedUpdateId: readString(details, 'requestedUpdateId', '-'),
          servedBytes,
          fullAssetBytes,
          savedBytes
        });
      }
    }
  }

  const updateChecks = eventRows.filter((event) => event.event_type === 'update_check');

  const platformBreakdown = countByLabel(
    updateChecks.map((event) => event.platform),
    'unknown'
  ).slice(0, 6);

  const versionBreakdown = countByLabel(
    updateChecks.map((event) => event.app_version || event.runtime_version),
    'unknown'
  ).slice(0, 8);

  const runtimeBreakdown = countByLabel(
    updateChecks.map((event) => event.runtime_version),
    'unknown'
  ).slice(0, 8);

  const channelBreakdown = countByLabel(
    updateChecks.map((event) => event.channel),
    'production'
  ).slice(0, 6);

  const latestDevices = [...latestDeviceMap.values()]
    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
    .slice(0, 10);

  const latestUpdates = updateRows.slice(0, 12).map((update) => ({
    id: update.id,
    platform: update.platform,
    channel: update.channel,
    runtimeVersion: update.runtime_version,
    appVersion: update.app_version || 'N/A',
    message: update.message || 'Sin descripción',
    createdAt: update.created_at,
    assetsCount: update.assets_count || 0
  }));

  return {
    summary: {
      totalChecks30d: updateChecks.length,
      checks24h,
      updatesServed30d: eventRows.filter((event) => event.event_type === 'update_served').length,
      configFetches30d: eventRows.filter((event) => event.event_type === 'config_fetch').length,
      uniqueDevices30d: uniqueDevices.size,
      totalPublishedUpdates: updateRows.length,
      assetDownloads30d,
      patchAttempts30d,
      patchServed30d,
      patchFallback30d,
      patchSavedBytes30d
    },
    daily: dayKeys.map((key) => dayMap.get(key)!).filter(Boolean),
    platforms: platformBreakdown,
    versions: versionBreakdown,
    runtimes: runtimeBreakdown,
    channels: channelBreakdown,
    recentDevices: latestDevices,
    latestUpdates,
    recentDiffingEvents: recentDiffingEvents
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12)
  };
}
