import { db, hasDb } from "@/lib/db";
import { getContent } from "@/lib/content";
import { channelOf, clip, hostOf, ipHash, isOwnHost, visitorId } from "@/lib/telemetry";


function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export async function POST(req: Request) {
  const ALLOWED = new Set((await getContent()).categories.map((c) => c.name));
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  // Honeypot: real people never see or fill this field.
  if (typeof b.website === "string" && b.website.trim()) return json({ ok: true });

  const name = clip(b.name, 80);
  const shop = clip(b.shop, 120);
  const town = clip(b.town, 80);
  const phoneRaw = clip(b.phone, 30);
  const message = clip(b.message, 1500);
  const phone = phoneRaw ? phoneRaw.replace(/[^\d+]/g, "") : "";
  const categories = Array.isArray(b.categories)
    ? (b.categories as unknown[]).filter((c): c is string => typeof c === "string" && ALLOWED.has(c))
    : [];

  if (!name || !shop || !town) return json({ ok: false, error: "Please fill in your name, shop and town." }, 422);
  if (phone.replace(/\D/g, "").length < 10 || phone.replace(/\D/g, "").length > 13) {
    return json({ ok: false, error: "Please enter a valid phone number." }, 422);
  }

  if (!hasDb()) {
    console.error("[leads] DATABASE_URL not set — lead NOT saved", { name, shop, town, phone });
    return json({ ok: false, error: "We couldn't save this right now. Please call us instead." }, 503);
  }

  const h = req.headers;
  const ip = ipHash(h);
  const refHost = hostOf(clip(b.ref, 500));
  const extRef = refHost && !isOwnHost(refHost) ? refHost : null;
  const utm = (b.utm || {}) as Record<string, unknown>;
  const utmSource = clip(utm.source, 100);
  const sid = clip(b.sid, 64);

  try {
    const pool = await db();

    const recent = await pool.query(
      "select count(*)::int as n from nams.leads where ip_hash = $1 and created_at > now() - interval '10 minutes'",
      [ip],
    );
    if (recent.rows[0].n >= 3) {
      return json({ ok: false, error: "Too many enquiries in a short time. Please try again shortly." }, 429);
    }

    await pool.query(
      `insert into nams.leads
        (name, shop, town, phone, categories, message, channel, referrer, utm_source, utm_campaign, visitor, session_id, ip_hash)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        name,
        shop,
        town,
        phone,
        categories,
        message,
        channelOf(extRef, utmSource, clip(utm.medium, 100)),
        extRef,
        utmSource,
        clip(utm.campaign, 120),
        visitorId(h),
        sid,
        ip,
      ],
    );

    await pool.query(
      "insert into nams.events (type, path, session_id, visitor) values ('lead', '/', $1, $2)",
      [sid, visitorId(h)],
    );

    return json({ ok: true });
  } catch (e) {
    console.error("[leads] insert failed", (e as Error).message);
    return json({ ok: false, error: "We couldn't save this right now. Please call us instead." }, 500);
  }
}
