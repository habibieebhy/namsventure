import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "nams_admin";
export const STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;

export function adminToken() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return createHmac("sha256", pw).update("nams-admin-v1").digest("hex");
}

export function isValidToken(value: string | undefined | null) {
  const t = adminToken();
  if (!t || !value || value.length !== t.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(t));
}

export function passwordMatches(input: string) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const a = createHmac("sha256", "cmp").update(input).digest();
  const b = createHmac("sha256", "cmp").update(pw).digest();
  return timingSafeEqual(a, b);
}

export function readCookie(req: Request, name: string) {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export function isAdminRequest(req: Request) {
  return isValidToken(readCookie(req, ADMIN_COOKIE));
}

export function isHttps(req: Request) {
  return (
    req.headers.get("x-forwarded-proto") === "https" ||
    req.url.startsWith("https:") ||
    req.headers.get("cf-visitor")?.includes("https") === true
  );
}
