import { db, hasDb } from "@/lib/db";
import {
  channelOf,
  clip,
  country,
  detectBot,
  hostOf,
  isOwnHost,
  parseUA,
  visitorId,
} from "@/lib/telemetry";

/*
  First-party analytics endpoint. The browser sends small JSON beacons here.
  No cookies, no third parties, IPs are never stored.
*/

const TYPES = new Set(["pageview", "engage", "section", "click", "scroll", "form_start", "vital"]);

type In = {
  type?: string;
  name?: string;
  value?: number;
  path?: string;
  sid?: string;
  ref?: string;
  utm?: { source?: string; medium?: string; campaign?: string };
  meta?: Record<string, unknown>;
};

export async function POST(req: Request) {
  const ok = new Response(null, { status: 204 });
  if (!hasDb()) return ok;

  const ua = req.headers.get("user-agent") || "";
  if (detectBot(ua)) return ok; // bots are tracked separately, server-side

  let body: unknown;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new Response(null, { status: 400 });
  }

  const list: In[] = (Array.isArray((body as { events?: In[] })?.events)
    ? (body as { events: In[] }).events
    : [body as In]
  ).slice(0, 25);

  const h = req.headers;
  const visitor = visitorId(h);
  const { device, browser, os } = parseUA(ua);
  const cc = country(h);

  const rows = list
    .filter((e) => e && typeof e.type === "string" && TYPES.has(e.type))
    .map((e) => {
      const isPv = e.type === "pageview";
      const refHost = isPv ? hostOf(e.ref) : null;
      const extRef = refHost && !isOwnHost(refHost) ? refHost : null;
      const utmSource = isPv ? clip(e.utm?.source, 100) : null;
      const utmMedium = isPv ? clip(e.utm?.medium, 100) : null;
      const value = typeof e.value === "number" && Number.isFinite(e.value) ? e.value : null;
      return [
        e.type,
        clip(e.name, 120),
        value,
        clip(e.path, 300),
        clip(e.sid, 64),
        visitor,
        isPv ? channelOf(extRef, utmSource, utmMedium) : null,
        extRef,
        utmSource,
        utmMedium,
        isPv ? clip(e.utm?.campaign, 120) : null,
        device,
        browser,
        os,
        cc,
        e.meta && typeof e.meta === "object" ? JSON.stringify(e.meta).slice(0, 2000) : null,
      ];
    });

  if (!rows.length) return ok;

  try {
    const pool = await db();
    const cols = 16;
    const values = rows
      .map((_, i) => `(${Array.from({ length: cols }, (_, j) => `$${i * cols + j + 1}`).join(",")})`)
      .join(",");
    await pool.query(
      `insert into nams.events
        (type,name,value,path,session_id,visitor,channel,referrer,utm_source,utm_medium,utm_campaign,device,browser,os,country,meta)
       values ${values}`,
      rows.flat(),
    );
  } catch (e) {
    console.error("[telemetry] insert failed", (e as Error).message);
  }
  return ok;
}
