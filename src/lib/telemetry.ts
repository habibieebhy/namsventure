import { createHash } from "crypto";
import { SITE } from "./site";

/* ---------------- request helpers ---------------- */

export function clientIp(h: Headers) {
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    "0.0.0.0"
  );
}

export function country(h: Headers) {
  const c = h.get("cf-ipcountry") || h.get("x-vercel-ip-country") || h.get("x-country-code");
  return c && c !== "XX" && c.length === 2 ? c.toUpperCase() : null;
}

function salt() {
  return process.env.ANALYTICS_SALT || process.env.ADMIN_PASSWORD || "nams-default-salt";
}

/* Cookieless, privacy-friendly visitor id: rotates daily, IP never stored. */
export function visitorId(h: Headers) {
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${salt()}|${day}|${clientIp(h)}|${h.get("user-agent") || ""}`)
    .digest("hex")
    .slice(0, 16);
}

export function ipHash(h: Headers) {
  return createHash("sha256").update(`${salt()}|ip|${clientIp(h)}`).digest("hex").slice(0, 16);
}

/* ---------------- user agent ---------------- */

export function parseUA(ua: string) {
  const device = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)
    ? "tablet"
    : /Mobi|iPhone|iPod|Android/i.test(ua)
      ? "mobile"
      : "desktop";

  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /CriOS|Chrome\//.test(ua)
          ? "Chrome"
          : /FxiOS|Firefox\//.test(ua)
            ? "Firefox"
            : /Safari\//.test(ua)
              ? "Safari"
              : "Other";

  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Other";

  return { device, browser, os };
}

/* ---------------- bots & AI crawlers ---------------- */

export type BotKind = "ai_crawler" | "ai_search" | "ai_assistant" | "search" | "social" | "other";

const BOTS: [RegExp, string, BotKind][] = [
  // AI — training crawlers
  [/GPTBot/i, "GPTBot (OpenAI)", "ai_crawler"],
  [/ClaudeBot|anthropic-ai/i, "ClaudeBot (Anthropic)", "ai_crawler"],
  [/CCBot/i, "CCBot (Common Crawl)", "ai_crawler"],
  [/Bytespider/i, "Bytespider (ByteDance)", "ai_crawler"],
  [/meta-externalagent/i, "Meta AI crawler", "ai_crawler"],
  [/Google-CloudVertexBot/i, "Google Vertex AI", "ai_crawler"],
  [/cohere-ai/i, "Cohere", "ai_crawler"],
  [/Amazonbot/i, "Amazonbot", "ai_crawler"],
  // AI — search indexes
  [/OAI-SearchBot/i, "OAI-SearchBot (ChatGPT search)", "ai_search"],
  [/PerplexityBot/i, "PerplexityBot", "ai_search"],
  [/Claude-SearchBot/i, "Claude-SearchBot", "ai_search"],
  [/YouBot/i, "YouBot", "ai_search"],
  [/DuckAssistBot/i, "DuckAssistBot", "ai_search"],
  // AI — fetching live because a user asked the assistant
  [/ChatGPT-User/i, "ChatGPT-User", "ai_assistant"],
  [/Claude-User/i, "Claude-User", "ai_assistant"],
  [/Perplexity-User/i, "Perplexity-User", "ai_assistant"],
  [/MistralAI-User/i, "MistralAI-User", "ai_assistant"],
  [/meta-externalfetcher/i, "Meta AI fetcher", "ai_assistant"],
  // Search engines
  [/Googlebot|Google-InspectionTool|Storebot-Google/i, "Googlebot", "search"],
  [/bingbot/i, "Bingbot", "search"],
  [/Applebot/i, "Applebot", "search"],
  [/DuckDuckBot/i, "DuckDuckBot", "search"],
  [/YandexBot/i, "YandexBot", "search"],
  [/Baiduspider/i, "Baiduspider", "search"],
  // Link previews
  [/facebookexternalhit|facebookcatalog/i, "Facebook preview", "social"],
  [/WhatsApp/i, "WhatsApp preview", "social"],
  [/Twitterbot/i, "X / Twitter preview", "social"],
  [/LinkedInBot/i, "LinkedIn preview", "social"],
  [/TelegramBot/i, "Telegram preview", "social"],
  [/Slackbot|Discordbot/i, "Chat app preview", "social"],
];

export function detectBot(ua: string): { name: string; kind: BotKind } | null {
  if (!ua) return { name: "No user agent", kind: "other" };
  for (const [re, name, kind] of BOTS) if (re.test(ua)) return { name, kind };
  if (/bot|crawl|spider|slurp|headless|lighthouse|python-requests|curl\/|wget|scrapy|httpclient/i.test(ua)) {
    return { name: "Other bot", kind: "other" };
  }
  return null;
}

/* ---------------- traffic channels ---------------- */

const AI_HOSTS = /(^|\.)(chatgpt\.com|chat\.openai\.com|openai\.com|perplexity\.ai|gemini\.google\.com|bard\.google\.com|copilot\.microsoft\.com|claude\.ai|you\.com|meta\.ai|deepseek\.com|grok\.com|phind\.com|mistral\.ai)$/i;
const SEARCH_HOSTS = /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|yandex\.[a-z]+|ecosia\.org|baidu\.com|search\.brave\.com|startpage\.com)$/i;
const SOCIAL_HOSTS = /(^|\.)(facebook\.com|fb\.com|fb\.me|instagram\.com|t\.co|twitter\.com|x\.com|linkedin\.com|lnkd\.in|youtube\.com|youtu\.be|whatsapp\.com|wa\.me|reddit\.com|pinterest\.com|t\.me|telegram\.org|snapchat\.com|threads\.net)$/i;

export function hostOf(ref: string | null | undefined) {
  if (!ref) return null;
  try {
    return new URL(ref).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function channelOf(refHost: string | null, utmSource?: string | null, utmMedium?: string | null) {
  const src = (utmSource || "").toLowerCase();
  const med = (utmMedium || "").toLowerCase();
  if (src && AI_HOSTS.test(src.replace(/^www\./, ""))) return "ai";
  if (/chatgpt|perplexity|gemini|copilot|claude/.test(src)) return "ai";
  if (/cpc|ppc|paid|ads?$/.test(med)) return "paid";
  if (/email|newsletter/.test(med)) return "email";
  if (/social/.test(med)) return "social";
  if (!refHost) return src ? "campaign" : "direct";
  if (AI_HOSTS.test(refHost)) return "ai";
  if (SEARCH_HOSTS.test(refHost)) return "search";
  if (SOCIAL_HOSTS.test(refHost)) return "social";
  return "referral";
}

export function isOwnHost(host: string | null) {
  if (!host) return false;
  try {
    const own = new URL(SITE.url).hostname.replace(/^www\./, "");
    return host === own || host === "localhost" || host.startsWith("127.");
  } catch {
    return false;
  }
}

export function clip(v: unknown, n = 200): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, n) : null;
}
