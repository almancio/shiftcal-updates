import { getSupabaseAdmin } from '@/lib/supabase';

export type EventType =
  | 'update_check'
  | 'update_served'
  | 'update_none'
  | 'asset_download'
  | 'config_fetch'
  | 'custom';

export type TrackEventInput = {
  eventType: EventType;
  platform?: string | null;
  runtimeVersion?: string | null;
  channel?: string | null;
  appVersion?: string | null;
  deviceId?: string | null;
  ipHash?: string | null;
  osName?: string | null;
  osVersion?: string | null;
  deviceModel?: string | null;
  updateId?: string | null;
  details?: Record<string, unknown> | null;
};

export async function trackEvent(input: TrackEventInput) {
  const supabase = getSupabaseAdmin();
  const safeDetails = input.details ? JSON.parse(JSON.stringify(input.details)) : {};

  const { error } = await supabase.from('expo_events').insert({
    event_type: input.eventType,
    platform: input.platform ?? null,
    runtime_version: input.runtimeVersion ?? null,
    channel: input.channel ?? null,
    app_version: input.appVersion ?? null,
    device_id: input.deviceId ?? null,
    ip_hash: input.ipHash ?? null,
    os_name: input.osName ?? null,
    os_version: input.osVersion ?? null,
    device_model: input.deviceModel ?? null,
    update_id: input.updateId ?? null,
    details: safeDetails
  });

  if (error) {
    console.error('Failed to track event', error.message);
  }
}
