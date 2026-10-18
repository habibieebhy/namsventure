import { revalidatePath } from "next/cache";
import { isAdminRequest } from "@/lib/admin-auth";
import { getContent, sanitizeContent, saveContent } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET the current page content; POST to save it (admins only). */
export async function GET(req: Request) {
  if (!isAdminRequest(req)) return Response.json({ ok: false }, { status: 401 });
  return Response.json({ ok: true, content: await getContent() });
}

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return Response.json({ ok: false }, { status: 401 });
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) {
    return Response.json({ ok: false, error: "Blocked." }, { status: 403 });
  }
  const text = await req.text();
  if (text.length > 200_000) return Response.json({ ok: false, error: "Too large." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const content = sanitizeContent((body as { content?: unknown })?.content);
  try {
    await saveContent(content);
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
  revalidatePath("/");
  return Response.json({ ok: true, content });
}
