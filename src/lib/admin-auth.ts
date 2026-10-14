import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "nams_admin";
export const STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;

/* How long a login lasts before you're logged out automatically. */
export const SESSION_HOURS = 8;
export const SESSION_SECONDS = SESSION_HOURS * 60 * 60;

/*
  Signed, expiring session token (same idea as a JWT):
    "<expiry-unix-seconds>.<hmac of expiry, keyed by ADMIN_PASSWORD>"
  It can't be forged without the password, stops working at the expiry
  time, and changing ADMIN_PASSWORD logs everyone out immediately.
*/
function sign(exp: number, pw: string) {
  return createHmac("sha256", pw).update(`nams-admin-v2|${exp}`).digest("hex");
}

export function adminToken() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return `${exp}.${sign(exp, pw)}`;
}

export function tokenExpiry(value: string | undefined | null): number | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || !value) return null;
  const [expStr, sig] = value.split(".");
  const exp = Number(expStr);
  if (!Number.isInteger(exp) || !sig) return null;
  if (exp * 1000 <= Date.now()) return null;
  const expected = sign(exp, pw);
  if (sig.length !== expected.length) return null;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? exp : null;
}

export function isValidToken(value: string | undefined | null) {
  return tokenExpiry(value) !== null;
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
