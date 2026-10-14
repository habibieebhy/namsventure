import type { Pool } from "pg";

export type Row = { label: string; n: number };

const TZ = "Asia/Kolkata";

async function rows<T = Record<string, unknown>>(pool: Pool, sql: string, params: unknown[]) {
  const r = await pool.query(sql, params);
  return r.rows as T[];
}

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function loadDashboard(pool: Pool, days: number) {
  const span = `${days} days`;
  const W = "ts >= now() - $1::interval";

  const totalsSql = (where: string) => `
    with s as (
      select session_id,
             count(*) filter (where type = 'pageview') as pv,
             coalesce(sum(value) filter (where type = 'engage'), 0) as ms
        from nams.events
       where ${where} and session_id is not null
       group by session_id
      having count(*) filter (where type = 'pageview') > 0
    )
    select
      (select count(*) from nams.events where ${where} and type = 'pageview') as pageviews,
      (select count(distinct visitor) from nams.events where ${where} and type = 'pageview') as visitors,
      (select count(*) from nams.events where ${where} and type = 'lead') as leads,
      (select count(*) from s) as sessions,
      (select coalesce(avg(ms), 0) from s) as avg_ms,
      (select coalesce(avg(case when pv <= 1 and ms < 10000 then 1.0 else 0 end), 0) from s) as bounce
  `;

  const [
    cur,
    prev,
    live,
    daily,
    channels,
    referrers,
    aiRefs,
    campaigns,
    devices,
    browsers,
    oses,
    countries,
    sections,
    funnel,
    clicks,
    scroll,
    vitals,
    bots,
    botKinds,
    leads,
    leadStatus,
  ] = await Promise.all([
    rows(pool, totalsSql(W), [span]),
    rows(pool, totalsSql("ts >= now() - ($1::interval * 2) and ts < now() - $1::interval"), [span]),
    rows(pool, "select count(distinct visitor) as n from nams.events where ts >= now() - interval '5 minutes'", []),
    rows<{ day: string; visitors: string; pageviews: string; leads: string }>(
      pool,
      `with d as (
         select generate_series(
           date_trunc('day', now() at time zone '${TZ}') - ($2::int - 1) * interval '1 day',
           date_trunc('day', now() at time zone '${TZ}'),
           interval '1 day') as day)
       select to_char(d.day, 'YYYY-MM-DD') as day,
              coalesce(count(distinct e.visitor) filter (where e.type = 'pageview'), 0) as visitors,
              coalesce(count(*) filter (where e.type = 'pageview'), 0) as pageviews,
              coalesce(count(*) filter (where e.type = 'lead'), 0) as leads
         from d
         left join nams.events e
           on date_trunc('day', e.ts at time zone '${TZ}') = d.day
          and e.ts >= now() - $1::interval - interval '1 day'
        group by d.day order by d.day`,
      [span, days],
    ),
    rows<Row>(pool, `select coalesce(channel,'direct') as label, count(distinct visitor) as n from nams.events where ${W} and type='pageview' group by 1 order by 2 desc`, [span]),
    rows<Row>(pool, `select referrer as label, count(distinct visitor) as n from nams.events where ${W} and type='pageview' and referrer is not null group by 1 order by 2 desc limit 10`, [span]),
    rows<Row>(pool, `select coalesce(referrer, utm_source) as label, count(distinct visitor) as n from nams.events where ${W} and type='pageview' and channel='ai' group by 1 order by 2 desc limit 10`, [span]),
    rows<Row>(pool, `select concat_ws(' / ', utm_source, utm_medium, utm_campaign) as label, count(distinct visitor) as n from nams.events where ${W} and type='pageview' and utm_source is not null group by 1 order by 2 desc limit 10`, [span]),
    rows<Row>(pool, `select device as label, count(distinct visitor) as n from nams.events where ${W} and type='pageview' group by 1 order by 2 desc`, [span]),
    rows<Row>(pool, `select browser as label, count(distinct visitor) as n from nams.events where ${W} and type='pageview' group by 1 order by 2 desc limit 8`, [span]),
    rows<Row>(pool, `select os as label, count(distinct visitor) as n from nams.events where ${W} and type='pageview' group by 1 order by 2 desc limit 8`, [span]),
    rows<Row>(pool, `select coalesce(country,'Unknown') as label, count(distinct visitor) as n from nams.events where ${W} and type='pageview' group by 1 order by 2 desc limit 10`, [span]),
    rows<Row>(pool, `select name as label, count(distinct session_id) as n from nams.events where ${W} and type='section' group by 1 order by 2 desc`, [span]),
    rows(pool, `
      select
        count(distinct session_id) filter (where type='pageview') as visited,
        count(distinct session_id) filter (where type='section' and name='range') as range,
        count(distinct session_id) filter (where type='section' and name='dealers') as dealers,
        count(distinct session_id) filter (where type='form_start') as started,
        count(distinct session_id) filter (where type='lead') as leads
      from nams.events where ${W}`, [span]),
    rows<Row>(pool, `select name as label, count(*) as n from nams.events where ${W} and type='click' group by 1 order by 2 desc limit 12`, [span]),
    rows<Row>(pool, `select value::int::text as label, count(distinct session_id) as n from nams.events where ${W} and type='scroll' group by 1 order by min(value)`, [span]),
    rows<{ name: string; p75: string; n: string }>(pool, `select name, percentile_cont(0.75) within group (order by value) as p75, count(*) as n from nams.events where ${W} and type='vital' group by 1`, [span]),
    rows<{ bot: string; kind: string; n: string; last: Date }>(pool, `select bot, kind, count(*) as n, max(ts) as last from nams.bot_hits where ${W} group by 1,2 order by 3 desc limit 20`, [span]),
    rows<Row>(pool, `select kind as label, count(*) as n from nams.bot_hits where ${W} group by 1 order by 2 desc`, [span]),
    rows<{ id: string; created_at: Date; name: string; shop: string; town: string; phone: string; categories: string[]; message: string | null; status: string; channel: string | null; referrer: string | null }>(
      pool,
      `select id, created_at, name, shop, town, phone, categories, message, status, channel, referrer from nams.leads where created_at >= now() - $1::interval order by created_at desc limit 100`,
      [span],
    ),
    rows<Row>(pool, `select status as label, count(*) as n from nams.leads where created_at >= now() - $1::interval group by 1 order by 2 desc`, [span]),
  ]);

  const toRows = (r: { label: unknown; n: unknown }[]): Row[] => r.map((x) => ({ label: String(x.label ?? "—"), n: num(x.n) }));
  const t = (r: Record<string, unknown>) => ({
    pageviews: num(r.pageviews),
    visitors: num(r.visitors),
    leads: num(r.leads),
    sessions: num(r.sessions),
    avgMs: num(r.avg_ms),
    bounce: num(r.bounce),
  });

  const f = funnel[0] || {};
  return {
    cur: t(cur[0] || {}),
    prev: t(prev[0] || {}),
    live: num(live[0]?.n),
    daily: daily.map((d) => ({ day: d.day, visitors: num(d.visitors), pageviews: num(d.pageviews), leads: num(d.leads) })),
    channels: toRows(channels),
    referrers: toRows(referrers),
    aiRefs: toRows(aiRefs),
    campaigns: toRows(campaigns),
    devices: toRows(devices),
    browsers: toRows(browsers),
    oses: toRows(oses),
    countries: toRows(countries),
    sections: toRows(sections),
    funnel: [
      { label: "Visited the site", n: num(f.visited) },
      { label: "Saw the product range", n: num(f.range) },
      { label: "Reached the dealer form", n: num(f.dealers) },
      { label: "Started filling the form", n: num(f.started) },
      { label: "Sent an enquiry", n: num(f.leads) },
    ],
    clicks: toRows(clicks),
    scroll: toRows(scroll),
    vitals: vitals.map((v) => ({ name: v.name, p75: num(v.p75), n: num(v.n) })),
    bots: bots.map((b) => ({ bot: b.bot, kind: b.kind, n: num(b.n), last: b.last })),
    botKinds: toRows(botKinds),
    leads,
    leadStatus: toRows(leadStatus),
  };
}

export type Dashboard = Awaited<ReturnType<typeof loadDashboard>>;
