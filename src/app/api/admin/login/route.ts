import { ADMIN_COOKIE, adminToken, isHttps, passwordMatches } from "@/lib/admin-auth";

// Relative redirects so this works behind any reverse proxy / tunnel.
function redirect(to: string, cookie?: string) {
  const headers = new Headers({ Location: to });
  if (cookie) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const password = String(form?.get("password") || "");

  // Slow down guessing.
  await new Promise((r) => setTimeout(r, 700));

  const token = adminToken();
  if (!token || !passwordMatches(password)) return redirect("/admin?e=1");

  const cookie = [
    `${ADMIN_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${60 * 60 * 24 * 30}`,
    isHttps(req) ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  return redirect("/admin", cookie);
}
