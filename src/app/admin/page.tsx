import type { Metadata } from "next";
import { cookies } from "next/headers";
import { db, hasDb } from "@/lib/db";
import { ADMIN_COOKIE, STATUSES, isValidToken } from "@/lib/admin-auth";
import { loadDashboard, type Dashboard, type Row } from "./queries";
import LeadStatus from "./lead-status";
import { gscConfigured, loadRankings, type Rankings } from "@/lib/gsc";
import "./admin.css";

export const metadata: Metadata = {
  title: "Telemetry",
  robots: { index: false, follow: false },
};

const RANGES = [
  { days: 1, label: "24h" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

const CHANNEL: Record<string, string> = {
  direct: "Direct / typed in",
  search: "Search engines",
  ai: "AI assistants",
  social: "Social & WhatsApp",
  referral: "Other websites",
  campaign: "Campaign links",
  paid: "Paid ads",
  email: "Email",
};

const BOT_KIND: Record<string, string> = {
  ai_crawler: "AI training crawlers",
  ai_search: "AI search indexes",
  ai_assistant: "AI fetching for a user",
  search: "Search engines",
  social: "Link previews",
  other: "Other bots",
};

const SECTION: Record<string, string> = {
  hero: "Hero",
  statement: "Why we exist",
  range: "What we carry",
  brands: "Brands",
  process: "How it works",
  reach: "Where we deliver",
  faq: "FAQ",
  dealers: "Dealer form",
};

/* Core Web Vitals thresholds (p75): [good, needs-improvement] */
const VITAL: Record<string, { label: string; unit: string; good: number; ok: number; scale?: number }> = {
  LCP: { label: "Largest Contentful Paint", unit: "s", good: 2500, ok: 4000, scale: 1000 },
  INP: { label: "Interaction to Next Paint", unit: "ms", good: 200, ok: 500 },
  CLS: { label: "Cumulative Layout Shift", unit: "", good: 100, ok: 250, scale: 1000 },
  FCP: { label: "First Contentful Paint", unit: "s", good: 1800, ok: 3000, scale: 1000 },
  TTFB: { label: "Time to First Byte", unit: "ms", good: 800, ok: 1800 },
};

const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));
const pct = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.1 ? 1 : 0)}%`;

function duration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

/* --------------------------------------------------------------- */

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; e?: string }>;
}) {
  const sp = await searchParams;
  const jar = await cookies();
  const authed = isValidToken(jar.get(ADMIN_COOKIE)?.value);

  if (!process.env.ADMIN_PASSWORD) {
    return (
      <Shell>
        <Notice title="Set an admin password first">
          Add <code>ADMIN_PASSWORD</code> to the site&rsquo;s environment (your <code>.env</code> file) and restart.
        </Notice>
      </Shell>
    );
  }

  if (!authed) return <Login failed={sp.e === "1"} />;

  if (!hasDb()) {
    return (
      <Shell>
        <Notice title="Database not connected">
          Add <code>DATABASE_URL</code> for your Supabase Postgres to the environment and restart. Tables are
          created automatically on first connection.
        </Notice>
      </Shell>
    );
  }

  const days = RANGES.find((r) => String(r.days) === sp.range)?.days ?? 30;

  let d: Dashboard;
  let ranks: Rankings | null = null;
  let ranksError: string | null = null;
  const ranksPromise = gscConfigured()
    ? loadRankings(days).catch((e: Error) => {
        ranksError = e.message;
        return null;
      })
    : Promise.resolve(null);
  try {
    [d, ranks] = await Promise.all([db().then((pool) => loadDashboard(pool, days)), ranksPromise]);
  } catch (e) {
    return (
      <Shell>
        <Notice title="Couldn't reach the database">
          <code>{(e as Error).message}</code>
          <br />
          Check <code>DATABASE_URL</code>, that Postgres is reachable from this container, and the password.
        </Notice>
      </Shell>
    );
  }

  const { cur, prev } = d;
  const conv = cur.visitors ? cur.leads / cur.visitors : 0;
  const prevConv = prev.visitors ? prev.leads / prev.visitors : 0;
  const aiVisitors = d.channels.find((c) => c.label === "ai")?.n ?? 0;

  return (
    <Shell>
      <header className="ad-top">
        <div>
          <p className="label">NAMS Venture</p>
          <h1>Telemetry</h1>
        </div>
        <div className="ad-topRight">
          <span className="ad-live">
            <i aria-hidden="true" /> {fmt(d.live)} on site now
          </span>
          <nav className="ad-ranges" aria-label="Date range">
            {RANGES.map((r) => (
              <a key={r.days} href={`/admin?range=${r.days}`} aria-current={r.days === days ? "page" : undefined}>
                {r.label}
              </a>
            ))}
          </nav>
          <form action="/api/admin/logout" method="post">
            <button className="ad-link" type="submit">Log out</button>
          </form>
        </div>
      </header>

      {/* KPIs */}
      <section className="ad-kpis">
        <Kpi label="Visitors" value={fmt(cur.visitors)} now={cur.visitors} before={prev.visitors} />
        <Kpi label="Page views" value={fmt(cur.pageviews)} now={cur.pageviews} before={prev.pageviews} />
        <Kpi label="Sessions" value={fmt(cur.sessions)} now={cur.sessions} before={prev.sessions} />
        <Kpi label="Avg. engaged time" value={duration(cur.avgMs)} now={cur.avgMs} before={prev.avgMs} />
        <Kpi label="Bounce rate" value={pct(cur.bounce)} now={cur.bounce} before={prev.bounce} invert />
        <Kpi label="Dealer enquiries" value={fmt(cur.leads)} now={cur.leads} before={prev.leads} strong />
        <Kpi label="Conversion rate" value={pct(conv)} now={conv} before={prevConv} />
        <Kpi label="From AI assistants" value={fmt(aiVisitors)} now={aiVisitors} before={0} hideDelta />
      </section>

      <Panel title="Visitors per day" note={`Last ${days === 1 ? "24 hours" : `${days} days`} · India time · hover a bar for details`} wide>
        <DailyChart data={d.daily} />
      </Panel>

      <Panel
        title="Google Search rankings"
        note={
          ranks
            ? `Search Console · last ${ranks.days} days (data lags ~2 days) · refreshed hourly`
            : "Search Console · what people searched and where you ranked"
        }
        wide
      >
        <SearchRankings data={ranks} error={ranksError} configured={gscConfigured()} />
      </Panel>

      <div className="ad-grid">
        <Panel title="Where visitors come from">
          <BarList rows={d.channels.map((r) => ({ ...r, label: CHANNEL[r.label] || r.label }))} unit="visitors" />
        </Panel>
        <Panel title="Referring websites">
          <BarList rows={d.referrers} unit="visitors" empty="No referrals yet." />
        </Panel>

        <Panel title="AI assistants sending visitors" note="ChatGPT, Perplexity, Gemini, Copilot, Claude…">
          <BarList rows={d.aiRefs} unit="visitors" empty="No AI referrals yet. They grow as AI assistants learn about the business." />
        </Panel>
        <Panel title="Campaign links (UTM)" note="Add ?utm_source=whatsapp&utm_campaign=diwali to links you share">
          <BarList rows={d.campaigns} unit="visitors" empty="No tagged links used yet." />
        </Panel>

        <Panel title="Enquiry funnel" note="Sessions that reached each step" wide>
          <Funnel rows={d.funnel} />
        </Panel>

        <Panel title="Sections people actually saw">
          <BarList
            rows={d.sections.map((r) => ({ ...r, label: SECTION[r.label] || r.label }))}
            total={cur.sessions}
            unit="sessions"
            share
          />
        </Panel>
        <Panel title="How far people scroll">
          <BarList
            rows={d.scroll.map((r) => ({ ...r, label: `${r.label}% of the page` }))}
            total={cur.sessions}
            unit="sessions"
            share
            empty="No scroll data yet."
          />
        </Panel>

        <Panel title="Buttons & links clicked">
          <BarList rows={d.clicks.map((r) => ({ ...r, label: r.label.replace(/_/g, " ") }))} unit="clicks" empty="No clicks yet." />
        </Panel>
        <Panel title="Countries" note="Needs Cloudflare in front of the site">
          <BarList rows={d.countries} unit="visitors" />
        </Panel>

        <Panel title="Devices">
          <BarList rows={d.devices} unit="visitors" />
        </Panel>
        <Panel title="Browsers & systems">
          <BarList rows={[...d.browsers, ...d.oses.map((o) => ({ ...o, label: `OS · ${o.label}` }))]} unit="visitors" />
        </Panel>

        <Panel title="Page speed — Core Web Vitals" note="75th percentile of real visitors · this is what Google ranks on" wide>
          <Vitals rows={d.vitals} />
        </Panel>

        <Panel title="Crawlers & AI bots reading the site" note="Server-side · bots don't run JavaScript, so they never count as visitors" wide>
          <div className="ad-botKinds">
            {d.botKinds.length ? (
              d.botKinds.map((k) => (
                <div key={k.label}>
                  <strong>{fmt(k.n)}</strong>
                  <span>{BOT_KIND[k.label] || k.label}</span>
                </div>
              ))
            ) : (
              <p className="ad-empty">No crawler visits recorded yet.</p>
            )}
          </div>
          {d.bots.length > 0 && (
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Bot</th>
                  <th>Type</th>
                  <th className="num">Hits</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {d.bots.map((b) => (
                  <tr key={b.bot + b.kind}>
                    <td>{b.bot}</td>
                    <td>{BOT_KIND[b.kind] || b.kind}</td>
                    <td className="num">{fmt(b.n)}</td>
                    <td>{when(b.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <Panel
        title={`Dealer enquiries · ${fmt(d.leads.length)}`}
        note={d.leadStatus.map((s) => `${s.n} ${s.label}`).join(" · ") || undefined}
        action={
          <a className="ad-link" href="/api/admin/leads" download>
            Download all as CSV ↓
          </a>
        }
        wide
      >
        {d.leads.length ? (
          <div className="ad-tableWrap">
            <table className="ad-table ad-leads">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Name / shop</th>
                  <th>Town</th>
                  <th>Phone</th>
                  <th>Wants</th>
                  <th>Source</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {d.leads.map((l) => (
                  <tr key={l.id}>
                    <td className="nowrap">{when(l.created_at)}</td>
                    <td>
                      <strong>{l.name}</strong>
                      <br />
                      {l.shop}
                      {l.message && <span className="ad-msg">&ldquo;{l.message}&rdquo;</span>}
                    </td>
                    <td>{l.town}</td>
                    <td className="nowrap">
                      <a href={`tel:${l.phone}`}>{l.phone}</a>
                      <br />
                      <a href={`https://wa.me/${l.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}`} target="_blank" rel="noreferrer">
                        WhatsApp ↗
                      </a>
                    </td>
                    <td>{l.categories?.join(", ") || "—"}</td>
                    <td>{CHANNEL[l.channel || "direct"] || l.channel}{l.referrer ? ` · ${l.referrer}` : ""}</td>
                    <td>
                      <LeadStatus id={Number(l.id)} initial={l.status} options={STATUSES} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ad-empty">No enquiries in this period yet.</p>
        )}
      </Panel>
    </Shell>
  );
}

/* --------------------------------------------------------------- */

function when(d: Date | string) {
  return new Date(d).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="ad">{children}</main>;
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ad-notice">
      <p className="label">Telemetry</p>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}

function Login({ failed }: { failed: boolean }) {
  return (
    <Shell>
      <form className="ad-login" action="/api/admin/login" method="post">
        <p className="label">NAMS Venture</p>
        <h1>Telemetry</h1>
        <label>
          <span>Password</span>
          <input type="password" name="password" required autoFocus autoComplete="current-password" />
        </label>
        {failed && <p className="ad-err" role="alert">Wrong password.</p>}
        <button className="btn btnSolid" type="submit">
          Open dashboard
        </button>
      </form>
    </Shell>
  );
}

function Panel({
  title,
  note,
  action,
  wide,
  children,
}: {
  title: string;
  note?: string;
  action?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={wide ? "ad-panel wide" : "ad-panel"}>
      <div className="ad-panelHead">
        <div>
          <h2>{title}</h2>
          {note && <p>{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Kpi({
  label,
  value,
  now,
  before,
  invert,
  strong,
  hideDelta,
}: {
  label: string;
  value: string;
  now: number;
  before: number;
  invert?: boolean;
  strong?: boolean;
  hideDelta?: boolean;
}) {
  let delta: React.ReactNode = <span className="ad-delta">no earlier data</span>;
  if (!hideDelta && before > 0) {
    const ch = (now - before) / before;
    const up = ch >= 0;
    const good = invert ? !up : up;
    delta = (
      <span className={`ad-delta ${Math.abs(ch) < 0.005 ? "" : good ? "good" : "bad"}`}>
        {up ? "▲" : "▼"} {Math.abs(ch * 100).toFixed(0)}% vs previous
      </span>
    );
  } else if (hideDelta) {
    delta = <span className="ad-delta">chatgpt · perplexity · gemini</span>;
  }
  return (
    <div className={strong ? "ad-kpi strong" : "ad-kpi"}>
      <span className="label">{label}</span>
      <strong>{value}</strong>
      {delta}
    </div>
  );
}

function BarList({
  rows,
  unit,
  total,
  share,
  empty = "No data yet.",
}: {
  rows: Row[];
  unit: string;
  total?: number;
  share?: boolean;
  empty?: string;
}) {
  if (!rows.length) return <p className="ad-empty">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.n), 1);
  const sum = total || rows.reduce((a, r) => a + r.n, 0) || 1;
  return (
    <ul className="ad-bars">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${fmt(r.n)} ${unit}`}>
          <span className="ad-barFill" style={{ width: `${(r.n / (share ? sum : max)) * 100}%` }} />
          <span className="ad-barLabel">{r.label}</span>
          <span className="ad-barVal">
            {fmt(r.n)}
            <small>{pct(r.n / sum)}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Funnel({ rows }: { rows: Row[] }) {
  const top = rows[0]?.n || 0;
  if (!top) return <p className="ad-empty">No sessions yet.</p>;
  return (
    <ol className="ad-funnel">
      {rows.map((r, i) => {
        const prevN = i ? rows[i - 1].n : r.n;
        return (
          <li key={r.label}>
            <div className="ad-funnelBar">
              <span style={{ height: `${Math.max((r.n / top) * 100, r.n ? 2 : 0)}%` }} />
            </div>
            <div className="ad-funnelText">
              <span>{r.label}</span>
              <strong>{fmt(r.n)}</strong>
              <small>
                {pct(r.n / top)} of visits{i > 0 && prevN ? ` · ${pct(r.n / prevN)} of previous step` : ""}
              </small>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Vitals({ rows }: { rows: Dashboard["vitals"] }) {
  const order = ["LCP", "INP", "CLS", "FCP", "TTFB"];
  return (
    <div className="ad-vitals">
      {order.map((k) => {
        const spec = VITAL[k];
        const v = rows.find((r) => r.name === k);
        if (!v) {
          return (
            <div key={k} className="ad-vital">
              <span className="label">{k}</span>
              <strong>—</strong>
              <small>{spec.label}</small>
              <em>No data yet</em>
            </div>
          );
        }
        const rating = v.p75 <= spec.good ? "good" : v.p75 <= spec.ok ? "ok" : "poor";
        const shown =
          k === "CLS"
            ? (v.p75 / 1000).toFixed(2)
            : spec.scale
              ? `${(v.p75 / spec.scale).toFixed(2)}${spec.unit}`
              : `${Math.round(v.p75)}${spec.unit}`;
        return (
          <div key={k} className={`ad-vital ${rating}`}>
            <span className="label">{k}</span>
            <strong>{shown}</strong>
            <small>{spec.label}</small>
            <em>
              {rating === "good" ? "● Good" : rating === "ok" ? "◐ Needs work" : "○ Poor"} · {fmt(v.n)} samples
            </em>
          </div>
        );
      })}
    </div>
  );
}

function DailyChart({ data }: { data: Dashboard["daily"] }) {
  const W = 1000;
  const H = 220;
  const pad = { t: 16, r: 8, b: 26, l: 8 };
  const max = Math.max(...data.map((d) => d.visitors), 1);
  const n = data.length;
  const slot = (W - pad.l - pad.r) / n;
  const gap = Math.min(4, slot * 0.25);
  const bw = Math.max(slot - gap, 1);
  const y = (v: number) => H - pad.b - (v / max) * (H - pad.t - pad.b);
  const label = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const ticks = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];
  const total = data.reduce((a, d) => a + d.visitors, 0);

  if (!total) return <p className="ad-empty">No visits recorded yet. Open the site in another tab to see the first one land.</p>;

  return (
    <div className="ad-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Visitors per day, peak ${max}`}>
        {[0.5, 1].map((f) => (
          <line key={f} x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} className="ad-grid-line" />
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} className="ad-axis" />
        {data.map((d, i) => {
          const x = pad.l + i * slot + gap / 2;
          const top = y(d.visitors);
          const h = H - pad.b - top;
          const r = Math.min(4, bw / 2, h);
          const path = h > 0
            ? `M${x},${H - pad.b} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${H - pad.b} Z`
            : "";
          return (
            <g key={d.day} className="ad-col">
              <title>{`${label(d.day)} · ${d.visitors} visitors · ${d.pageviews} page views · ${d.leads} enquiries`}</title>
              <rect x={pad.l + i * slot} y={pad.t} width={slot} height={H - pad.t - pad.b} className="ad-hit" />
              {path && <path d={path} className="ad-bar" />}
              {d.leads > 0 && <circle cx={x + bw / 2} cy={top - 9} r={4} className="ad-leadDot" />}
            </g>
          );
        })}
      </svg>
      <div className="ad-xaxis">
        {ticks.map((i) => (
          <span key={i} style={{ left: `${((i + 0.5) / n) * 100}%` }}>
            {label(data[i].day)}
          </span>
        ))}
      </div>
      <p className="ad-chartKey">
        Peak {fmt(max)} visitors/day · <i className="ad-keyDot" aria-hidden="true" /> day with an enquiry
      </p>
    </div>
  );
}

function SearchRankings({
  data,
  error,
  configured,
}: {
  data: Rankings | null;
  error: string | null;
  configured: boolean;
}) {
  if (!configured) {
    return (
      <div className="ad-setup">
        <p>Not connected yet. To see the searches you rank for:</p>
        <ol>
          <li>
            Verify the site in <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer">Google Search Console</a>{" "}
            (put the HTML-tag code in <code>GOOGLE_SITE_VERIFICATION</code>), then submit <code>/sitemap.xml</code>.
          </li>
          <li>
            In Google Cloud, create a service account, enable the &ldquo;Google Search Console API&rdquo;, and download its JSON key.
          </li>
          <li>
            In Search Console → Settings → Users and permissions, add the service account email as a <em>Restricted</em> user.
          </li>
          <li>
            Set <code>GSC_SITE_URL</code>, <code>GSC_CLIENT_EMAIL</code> and <code>GSC_PRIVATE_KEY</code> in <code>.env</code> and restart.
          </li>
        </ol>
      </div>
    );
  }
  if (error || !data) return <p className="ad-empty">Couldn&rsquo;t load Search Console: {error || "unknown error"}</p>;

  const { totals: t, prev: p } = data;
  const change = (now: number, before: number, lowerIsBetter = false) => {
    if (!before) return <span className="ad-delta">no earlier data</span>;
    const ch = (now - before) / before;
    const good = lowerIsBetter ? ch <= 0 : ch >= 0;
    return (
      <span className={`ad-delta ${Math.abs(ch) < 0.005 ? "" : good ? "good" : "bad"}`}>
        {ch >= 0 ? "▲" : "▼"} {Math.abs(ch * 100).toFixed(0)}% vs previous
      </span>
    );
  };

  return (
    <div className="ad-ranks">
      <div className="ad-kpis ad-kpis4">
        <div className="ad-kpi">
          <span className="label">Clicks from Google</span>
          <strong>{fmt(t.clicks)}</strong>
          {change(t.clicks, p.clicks)}
        </div>
        <div className="ad-kpi">
          <span className="label">Impressions</span>
          <strong>{fmt(t.impressions)}</strong>
          {change(t.impressions, p.impressions)}
        </div>
        <div className="ad-kpi">
          <span className="label">Click-through rate</span>
          <strong>{pct(t.ctr)}</strong>
          {change(t.ctr, p.ctr)}
        </div>
        <div className="ad-kpi">
          <span className="label">Average position</span>
          <strong>{t.position ? t.position.toFixed(1) : "—"}</strong>
          {change(t.position, p.position, true)}
        </div>
      </div>

      <div className="ad-botKinds">
        {data.buckets.map((b) => (
          <div key={b.label}>
            <strong>{fmt(b.n)}</strong>
            <span>searches ranking {b.label.toLowerCase()}</span>
          </div>
        ))}
      </div>

      {data.queries.length ? (
        <div className="ad-tableWrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Search query</th>
                <th className="num">Position</th>
                <th className="num">Impressions</th>
                <th className="num">Clicks</th>
                <th className="num">CTR</th>
              </tr>
            </thead>
            <tbody>
              {data.queries.map((q) => (
                <tr key={q.label}>
                  <td>{q.label}</td>
                  <td className="num">
                    <span className={`ad-pos ${q.position <= 3 ? "top" : q.position <= 10 ? "p1" : ""}`}>
                      {q.position.toFixed(1)}
                    </span>
                  </td>
                  <td className="num">{fmt(q.impressions)}</td>
                  <td className="num">{fmt(q.clicks)}</td>
                  <td className="num">{pct(q.ctr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="ad-empty">
          No search data yet. New sites usually start showing queries 1–4 weeks after Search Console verification.
        </p>
      )}
    </div>
  );
}
