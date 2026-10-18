import { db, hasDb } from "@/lib/db";
import { CATEGORIES } from "@/lib/site";

/*
  Editable page content. Edited in Telemetry → Content and stored in
  Postgres (nams.content). Anything not saved there falls back to the
  defaults below, so the site always renders even with no database.

  Highlight a word in red/grey by wrapping it in *asterisks*:
    "the dealer's *shelf.*"
*/

export type Item = { name: string; image?: string };
export type Category = { code: string; name: string; items: Item[] };

export type Content = {
  heroMeta: string;
  heroLines: [string, string, string];
  heroLede: string;
  ticker: string[];
  statementLabel: string;
  statement: string;
  rangeLabel: string;
  rangeTitle: string;
  rangeHighlight: string;
  categories: Category[];
  brandsLabel: string;
  brandNote: string;
  processLabel: string;
  processTitle: string;
  reachLabel: string;
  reachSub: string;
  faqLabel: string;
  faqTitle: string;
  dealersLabel: string;
  dealersTitle: string;
  dealersBody: string;
};

export const DEFAULT_CONTENT: Content = {
  heroMeta: "Electronics distribution",
  heroLines: ["From the brand’s", "warehouse to", "the dealer’s *shelf.*"],
  heroLede:
    "We stock, move and supply consumer electronics, home appliances and electricals to retailers across Assam and the Northeast.",
  ticker: [
    "Televisions",
    "Air conditioners",
    "Refrigerators",
    "Washing machines",
    "Kitchen appliances",
    "Switches & wiring",
    "LED lighting",
    "Batteries",
  ],
  statementLabel: "Why we exist",
  statement:
    "A shop owner in Tezpur shouldn't have to chase stock from Kolkata. We keep inventory close, invoices clean, and the phone answered — so the shelf is never the problem.",
  rangeLabel: "What we carry",
  rangeTitle: "{count} categories.",
  rangeHighlight: "One supplier.",
  categories: CATEGORIES.map((c) => ({ code: c.code, name: c.name, items: c.items.map((name) => ({ name })) })),
  brandsLabel: "Brands on our shelves",
  brandNote: "More brand partnerships are being added. Ask us about a specific model.",
  processLabel: "How an order moves",
  processTitle: "Four steps.\nNo chasing.",
  reachLabel: "Where we deliver",
  reachSub: "states in the Northeast",
  faqLabel: "Questions",
  faqTitle: "Straight\nanswers.",
  dealersLabel: "For retailers",
  dealersTitle: "Stock your shop\nthrough *us.*",
  dealersBody:
    "Tell us about your shop and what you sell. We’ll call back with current stock, dealer pricing and delivery days for your town.",
};

/* ---------- validation: never trust what the admin form sends ---------- */

const str = (v: unknown, max: number, fallback: string) =>
  typeof v === "string" ? v.replace(/\r/g, "").slice(0, max) : fallback;

const MEDIA_URL = /^\/media\/[0-9]{1,12}$/;

export function sanitizeContent(input: unknown): Content {
  const i = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const d = DEFAULT_CONTENT;
  const lines = Array.isArray(i.heroLines) ? i.heroLines : d.heroLines;
  const cats = Array.isArray(i.categories) ? i.categories : d.categories;

  return {
    heroMeta: str(i.heroMeta, 60, d.heroMeta),
    heroLines: [0, 1, 2].map((n) => str(lines[n], 60, d.heroLines[n])) as Content["heroLines"],
    heroLede: str(i.heroLede, 400, d.heroLede),
    ticker: (Array.isArray(i.ticker) ? i.ticker : d.ticker)
      .map((t) => str(t, 40, ""))
      .filter(Boolean)
      .slice(0, 24),
    statementLabel: str(i.statementLabel, 60, d.statementLabel),
    statement: str(i.statement, 600, d.statement),
    rangeLabel: str(i.rangeLabel, 60, d.rangeLabel),
    rangeTitle: str(i.rangeTitle, 80, d.rangeTitle),
    rangeHighlight: str(i.rangeHighlight, 80, d.rangeHighlight),
    categories: cats.slice(0, 12).map((c, ci) => {
      const cat = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
      const items = Array.isArray(cat.items) ? cat.items : [];
      return {
        code: String(ci + 1).padStart(2, "0"),
        name: str(cat.name, 60, `Category ${ci + 1}`) || `Category ${ci + 1}`,
        items: items.slice(0, 16).map((it) => {
          const o = (it && typeof it === "object" ? it : { name: it }) as Record<string, unknown>;
          const image = typeof o.image === "string" && MEDIA_URL.test(o.image) ? o.image : undefined;
          return { name: str(o.name, 60, ""), ...(image ? { image } : {}) };
        }).filter((it) => it.name),
      };
    }),
    brandsLabel: str(i.brandsLabel, 60, d.brandsLabel),
    brandNote: str(i.brandNote, 300, d.brandNote),
    processLabel: str(i.processLabel, 60, d.processLabel),
    processTitle: str(i.processTitle, 80, d.processTitle),
    reachLabel: str(i.reachLabel, 60, d.reachLabel),
    reachSub: str(i.reachSub, 80, d.reachSub),
    faqLabel: str(i.faqLabel, 60, d.faqLabel),
    faqTitle: str(i.faqTitle, 80, d.faqTitle),
    dealersLabel: str(i.dealersLabel, 60, d.dealersLabel),
    dealersTitle: str(i.dealersTitle, 80, d.dealersTitle),
    dealersBody: str(i.dealersBody, 400, d.dealersBody),
  };
}

/* ---------- storage ---------- */

/* Tables live in src/lib/db.ts (CONTENT_SQL). */

export async function getContent(): Promise<Content> {
  if (!hasDb()) return DEFAULT_CONTENT;
  try {
    const pool = await db();
    const { rows } = await pool.query("select value from nams.content where key = 'site'");
    return rows[0] ? sanitizeContent({ ...DEFAULT_CONTENT, ...rows[0].value }) : DEFAULT_CONTENT;
  } catch (e) {
    console.error("[content] falling back to defaults:", (e as Error).message);
    return DEFAULT_CONTENT;
  }
}

export async function saveContent(content: Content) {
  const pool = await db();
  await pool.query(
    `insert into nams.content (key, value, updated_at) values ('site', $1, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [JSON.stringify(content)],
  );
}
