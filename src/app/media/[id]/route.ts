import { db, hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Serves images uploaded in Telemetry → Content. Images never change once
   uploaded (a new upload gets a new id), so they cache for a year. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9]{1,12}$/.test(id) || !hasDb()) return new Response("Not found", { status: 404 });
  const pool = await db();
  const { rows } = await pool.query("select mime, bytes from nams.media where id = $1", [id]);
  if (!rows[0]) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(rows[0].bytes), {
    headers: {
      "Content-Type": rows[0].mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
