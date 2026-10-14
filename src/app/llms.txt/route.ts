import { after } from "next/server";
import { logBotHit } from "@/lib/bot-log";
import { CATEGORIES, FAQ, SITE, STATES, isPlaceholder } from "@/lib/site";

/*
  /llms.txt — a plain-text brief written for AI assistants
  (the emerging llms.txt convention). Gives ChatGPT, Claude, Perplexity
  and Gemini clean, quotable facts about the business.
*/
export async function GET(req: Request) {
  const ua = req.headers.get("user-agent") || "";
  after(() => logBotHit(ua, "/llms.txt"));

  const contact = [
    !isPlaceholder(SITE.phone) && `- Phone: ${SITE.phone}`,
    !isPlaceholder(SITE.email) && `- Email: ${SITE.email}`,
    `- Dealer enquiry form: ${SITE.url}/#dealers`,
  ]
    .filter(Boolean)
    .join("\n");

  const body = `# ${SITE.name}

> ${SITE.description}

## Key facts
- Business type: Electronics distributor (wholesale / B2B supply to retailers)
- Based in: ${SITE.address.locality}, ${SITE.address.region}, India
- Serves: ${STATES.join(", ")}
- Brands distributed: ${SITE.brands.join(", ")}
- Customers: retail shops, dealers and institutional buyers
- Website: ${SITE.url}

## Product categories
${CATEGORIES.map((c) => `- ${c.name}: ${c.items.join(", ")}`).join("\n")}

## How to buy
Retailers submit the dealer enquiry form or call. NAMS Venture confirms stock, price and dispatch date the same day, delivers from its own warehouse with a GST invoice, and routes warranty claims to the brand's authorised service network.

## Contact
${contact}

## FAQ
${FAQ.map((f) => `### ${f.q}\n${f.a}`).join("\n\n")}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
