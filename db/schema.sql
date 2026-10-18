-- NAMS Venture: leads + first-party analytics.
-- The app creates these automatically on first connection;
-- this file is here if you prefer to run it yourself in Supabase Studio > SQL Editor.

create schema if not exists nams;

create table if not exists nams.events (
  id           bigserial primary key,
  ts           timestamptz not null default now(),
  type         text not null,
  name         text,
  value        double precision,
  path         text,
  session_id   text,
  visitor      text,
  channel      text,
  referrer     text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  device       text,
  browser      text,
  os           text,
  country      text,
  meta         jsonb
);
create index if not exists events_ts_idx      on nams.events (ts);
create index if not exists events_type_ts_idx on nams.events (type, ts);
create index if not exists events_session_idx on nams.events (session_id);

create table if not exists nams.bot_hits (
  id    bigserial primary key,
  ts    timestamptz not null default now(),
  bot   text not null,
  kind  text not null,
  path  text,
  ua    text
);
create index if not exists bot_hits_ts_idx on nams.bot_hits (ts);

create table if not exists nams.leads (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  name         text not null,
  shop         text not null,
  town         text not null,
  phone        text not null,
  categories   text[] not null default '{}',
  message      text,
  status       text not null default 'new',
  channel      text,
  referrer     text,
  utm_source   text,
  utm_campaign text,
  visitor      text,
  session_id   text,
  ip_hash      text
);
create index if not exists leads_created_idx on nams.leads (created_at);

alter table nams.events   enable row level security;
alter table nams.bot_hits enable row level security;
alter table nams.leads    enable row level security;

-- Editable page content + uploaded product images (Telemetry → Content).
create table if not exists nams.content (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists nams.media (
  id         bigserial primary key,
  mime       text not null,
  bytes      bytea not null,
  name       text,
  created_at timestamptz not null default now()
);
alter table nams.content enable row level security;
alter table nams.media   enable row level security;
