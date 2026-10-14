import { db } from "@/lib/db";
import { isAdminRequest, STATUSES } from "@/lib/admin-auth";

/* Update a lead's status: POST { id, status } */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) return Response.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { id?: number; status?: string };
  if (!Number.isInteger(b.id) || !STATUSES.includes(b.status as (typeof STATUSES)[number])) {
    return Response.json({ ok: false }, { status: 400 });
  }
  const pool = await db();
  await pool.query("update nams.leads set status = $1 where id = $2", [b.status, b.id]);
  return Response.json({ ok: true });
}

/* Download all leads as CSV: GET */
export async function GET(req: Request) {
  if (!isAdminRequest(req)) return new Response("Unauthorized", { status: 401 });
  const pool = await db();
  const { rows } = await pool.query(
    `select id, created_at, name, shop, town, phone, array_to_string(categories, '; ') as categories,
            message, status, channel, referrer, utm_source, utm_campaign
       from nams.leads order by created_at desc`,
  );
  const cols = ["id", "created_at", "name", "shop", "town", "phone", "categories", "message", "status", "channel", "referrer", "utm_source", "utm_campaign"];
  const esc = (v: unknown) => {
    const s = v instanceof Date ? v.toISOString() : v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nams-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
