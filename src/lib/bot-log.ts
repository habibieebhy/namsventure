import { db, hasDb } from "./db";
import { detectBot } from "./telemetry";

/* Records crawler / AI bot visits. Bots don't run JavaScript, so this is server-side. */
export async function logBotHit(ua: string, path: string) {
  if (!hasDb()) return;
  const bot = detectBot(ua);
  if (!bot) return;
  try {
    const pool = await db();
    await pool.query("insert into nams.bot_hits (bot, kind, path, ua) values ($1,$2,$3,$4)", [
      bot.name,
      bot.kind,
      path.slice(0, 300),
      ua.slice(0, 400),
    ]);
  } catch (e) {
    console.error("[bots] insert failed", (e as Error).message);
  }
}
