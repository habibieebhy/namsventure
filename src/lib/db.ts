import { Pool } from "pg";

/*
  Direct connection to your self-hosted Supabase Postgres.
  Everything lives in its own schema "nams", which Supabase's public API
  does NOT expose — only this server can read or write it.

  Env:
    DATABASE_URL  postgresql://USER:PASSWORD@HOST:5432/postgres
    DATABASE_SSL  "true" if your Postgres requires SSL (self-host usually doesn't)
*/

export const SCHEMA_SQL = `
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
`;

/* Editable content + uploaded images (Telemetry → Content). */
export const CONTENT_SQL = `
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
`;

type G = { _namsPool?: Pool; _namsReady?: Promise<void> };
const g = globalThis as unknown as G;

export function hasDb() {
  return Boolean(process.env.DATABASE_URL);
}

export async function db(): Promise<Pool> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!g._namsPool) {
    g._namsPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    });
    g._namsPool.on("error", (e) => console.error("[db] idle client error", e.message));
  }
  if (!g._namsReady) {
    g._namsReady = g._namsPool
      .query(SCHEMA_SQL + CONTENT_SQL)
      .then(() => undefined)
      .catch((e) => {
        g._namsReady = undefined;
        throw e;
      });
  }
  await g._namsReady;
  return g._namsPool;
}
