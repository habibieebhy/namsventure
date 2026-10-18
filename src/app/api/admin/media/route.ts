import { isAdminRequest } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX = 3 * 1024 * 1024; // 3 MB

/* Trust the file's bytes, not its name or the browser's label. */
function sniff(b: Buffer): string | null {
  const hex = b.subarray(0, 12).toString("hex");
  if (hex.startsWith("89504e470d0a1a0a")) return "image/png";
  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (hex.startsWith("52494646") && b.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

/* Upload a product image: multipart form with field "file". Returns { url }. */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) return Response.json({ ok: false }, { status: 401 });
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) {
    return Response.json({ ok: false, error: "Blocked." }, { status: 403 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ ok: false, error: "No file." }, { status: 400 });
  if (file.size > MAX) return Response.json({ ok: false, error: "Image must be under 3 MB." }, { status: 413 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = sniff(bytes);
  if (!mime) return Response.json({ ok: false, error: "Use a PNG, JPG or WebP image." }, { status: 415 });

  const pool = await db();
  const { rows } = await pool.query(
    "insert into nams.media (mime, bytes, name) values ($1, $2, $3) returning id",
    [mime, bytes, file.name.slice(0, 120)],
  );
  return Response.json({ ok: true, url: `/media/${rows[0].id}` });
}
