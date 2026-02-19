create extension if not exists pgcrypto;

create table if not exists app_config (
  id integer primary key default 1 check (id = 1),
  config jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists app_config_history (
  id uuid primary key default gen_random_uuid(),
  config jsonb not null,
  previous_config jsonb,
  updated_by text,
  created_at timestamptz not null default now()
);

create table if not exists expo_updates (
  id uuid primary key,
  platform text not null check (platform in ('ios', 'android')),
  channel text not null default 'production',
  runtime_version text not null,
  app_version text,
  message text,
  manifest jsonb not null,
  assets_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists expo_updates_lookup_idx
  on expo_updates (platform, runtime_version, channel, created_at desc);

create table if not exists expo_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  platform text,
  runtime_version text,
  channel text,
  app_version text,
  device_id text,
  ip_hash text,
  os_name text,
  os_version text,
  device_model text,
  update_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists expo_events_created_at_idx on expo_events (created_at desc);
create index if not exists expo_events_event_type_idx on expo_events (event_type);
create index if not exists expo_events_device_idx on expo_events (device_id, ip_hash);

insert into app_config (id, config)
values (
  1,
  '{
    "forceUpdate": {
      "enabled": false,
      "minVersionIOS": "2.0.0",
      "minVersionAndroid": "2.0.0"
    },
    "features": {
      "reviewEmailSignInEnabled": true
    },
    "lastUpdated": "2026-01-22T12:00:00Z"
  }'::jsonb
)
on conflict (id) do nothing;
