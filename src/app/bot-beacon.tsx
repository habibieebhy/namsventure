import { headers } from "next/headers";
import { after } from "next/server";
import { logBotHit } from "@/lib/bot-log";

/* Renders nothing. Logs crawler / AI-bot page fetches after the response is sent. */
export default async function BotBeacon({ path }: { path: string }) {
  const h = await headers();
  const ua = h.get("user-agent") || "";
  after(() => logBotHit(ua, path));
  return null;
}
