import { createSign } from "crypto";

/*
  Google Search Console — real rankings: what people searched, where you
  showed up (average position), impressions, clicks and CTR.

  Env (see .env.example for the 5-minute setup):
    GSC_SITE_URL      "sc-domain:namsventure.com"  or  "https://namsventure.com/"
    GSC_CLIENT_EMAIL  service account email
    GSC_PRIVATE_KEY   service account private key (keep the \n escapes)
*/

export function gscConfigured() {
  return Boolean(process.env.GSC_SITE_URL && process.env.GSC_CLIENT_EMAIL && process.env.GSC_PRIVATE_KEY);
}

type G = {
  _gscToken?: { value: string; exp: number };
  _gscCache?: Map<string, { at: number; data: Rankings }>;
};
const g = globalThis as unknown as G;

const b64url = (s: string | Buffer) =>
  Buffer.from(s).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

async function token(): Promise<string> {
  if (g._gscToken && g._gscToken.exp > Date.now() + 60_000) return g._gscToken.value;

  const email = process.env.GSC_CLIENT_EMAIL!;
  const key = process.env.GSC_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const jwt = `${header}.${claim}.${b64url(signer.sign(key))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !data.access_token) throw new Error(`Google auth failed: ${data.error_description || res.status}`);
  g._gscToken = { value: data.access_token, exp: Date.now() + (data.expires_in || 3600) * 1000 };
  return data.access_token;
}

type ApiRow = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };

async function query(body: Record<string, unknown>): Promise<ApiRow[]> {
  const site = encodeURIComponent(process.env.GSC_SITE_URL!);
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { rows?: ApiRow[]; error?: { message?: string } };
  if (!res.ok) throw new Error(`Search Console: ${data.error?.message || res.status}`);
  return data.rows || [];
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export type RankRow = { label: string; clicks: number; impressions: number; ctr: number; position: number };
export type Rankings = {
  days: number;
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  prev: { clicks: number; impressions: number; ctr: number; position: number };
  queries: RankRow[];
  pages: RankRow[];
  buckets: { label: string; n: number }[];
};

const toRow = (r: ApiRow): RankRow => ({
  label: r.keys?.[0] || "—",
  clicks: r.clicks,
  impressions: r.impressions,
  ctr: r.ctr,
  position: r.position,
});
const empty = { clicks: 0, impressions: 0, ctr: 0, position: 0 };

/* Search Console data lags ~2 days and is daily, so the window is at least 7 days. */
export async function loadRankings(requestedDays: number): Promise<Rankings> {
  const days = Math.max(7, requestedDays);
  const key = String(days);
  g._gscCache ??= new Map();
  const hit = g._gscCache.get(key);
  if (hit && Date.now() - hit.at < 60 * 60 * 1000) return hit.data;

  const end = new Date(Date.now() - 2 * 864e5);
  const start = new Date(end.getTime() - (days - 1) * 864e5);
  const pEnd = new Date(start.getTime() - 864e5);
  const pStart = new Date(pEnd.getTime() - (days - 1) * 864e5);
  const range = { startDate: ymd(start), endDate: ymd(end) };

  const [tot, prev, queries, pages] = await Promise.all([
    query({ ...range }),
    query({ startDate: ymd(pStart), endDate: ymd(pEnd) }),
    query({ ...range, dimensions: ["query"], rowLimit: 250 }),
    query({ ...range, dimensions: ["page"], rowLimit: 10 }),
  ]);

  const q = queries.map(toRow);
  const bucket = (lo: number, hi: number) => q.filter((r) => r.position >= lo && r.position < hi).length;

  const data: Rankings = {
    days,
    totals: tot[0] ? toRow(tot[0]) : empty,
    prev: prev[0] ? toRow(prev[0]) : empty,
    queries: q.sort((a, b) => b.impressions - a.impressions).slice(0, 25),
    pages: pages.map(toRow),
    buckets: [
      { label: "Top 3", n: bucket(0, 3.5) },
      { label: "Page 1 (4–10)", n: bucket(3.5, 10.5) },
      { label: "Page 2 (11–20)", n: bucket(10.5, 20.5) },
      { label: "Beyond page 2", n: bucket(20.5, 1e9) },
    ],
  };
  g._gscCache.set(key, { at: Date.now(), data });
  return data;
}
