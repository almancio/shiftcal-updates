import { defaultConfig, type RemoteConfig } from '@/lib/default-config';
import type { Json } from '@/lib/database.types';
import { getSupabaseAdmin } from '@/lib/supabase';

function withLastUpdated(config: RemoteConfig): RemoteConfig {
  return {
    ...config,
    lastUpdated: new Date().toISOString()
  };
}

function isRemoteConfig(value: Json): value is RemoteConfig {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeRemoteConfig(value: Record<string, unknown>): RemoteConfig {
  return JSON.parse(JSON.stringify(value)) as RemoteConfig;
}

export async function getRemoteConfig(): Promise<RemoteConfig> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('app_config')
    .select('config')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load config: ${error.message}`);
  }

  if (!data?.config || !isRemoteConfig(data.config)) {
    const seededConfig = withLastUpdated(defaultConfig);
    const { error: seedError } = await supabase.from('app_config').upsert({
      id: 1,
      config: seededConfig,
      updated_at: new Date().toISOString()
    });

    if (seedError) {
      throw new Error(`Unable to seed config: ${seedError.message}`);
    }

    return seededConfig;
  }

  return data.config as RemoteConfig;
}

export async function updateRemoteConfig(
  nextConfig: Record<string, unknown>,
  actor: string | null
): Promise<RemoteConfig> {
  const supabase = getSupabaseAdmin();
  const currentConfig = await getRemoteConfig();
  const updatedConfig = withLastUpdated(normalizeRemoteConfig(nextConfig));

  const now = new Date().toISOString();

  const { error: updateError } = await supabase.from('app_config').upsert({
    id: 1,
    config: updatedConfig,
    updated_at: now
  });

  if (updateError) {
    throw new Error(`Unable to persist config: ${updateError.message}`);
  }

  const { error: historyError } = await supabase.from('app_config_history').insert({
    config: updatedConfig,
    previous_config: currentConfig,
    updated_by: actor,
    created_at: now
  });

  if (historyError) {
    console.error('Failed to write config history', historyError.message);
  }

  return updatedConfig;
}
