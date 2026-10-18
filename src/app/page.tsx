import Motion from "./motion";
import DealerForm from "./dealer-form";
import Telemetry from "./telemetry";
import BotBeacon from "./bot-beacon";
import { FAQ, SITE, STATES, absoluteUrl, isPlaceholder } from "@/lib/site";
import { getContent, type Category } from "@/lib/content";

/* Business details live in src/lib/site.ts — edit them there. */
const CONTACT_EMAIL = SITE.email;
const CONTACT_PHONE = SITE.phone;
const CITY = SITE.cityLabel;
const BRANDS = SITE.brands;

const STEPS = [
  {
    title: "You place the order",
    body: "Call, message or walk in. Tell us the models and quantities. No minimum on your first order.",
  },
  {
    title: "We confirm the same day",
    body: "Stock, price and dispatch date, confirmed in writing before anything moves.",
  },
  {
    title: "Dispatched from our warehouse",
    body: "Packed, checked against the invoice and sent out on our own schedule, not a courier's.",
  },
  {
    title: "Delivered and supported",
    body: "GST invoice with every delivery. Warranty claims routed straight to the brand's service network.",
  },
];


/* Headings and products are edited in Telemetry → Content (src/lib/content.ts). */

/* "*word*" → highlighted, newline → line break. */
function Rich({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, li) => (
        <span key={li}>
          {li > 0 && <br />}
          {line.split(/(\*[^*]+\*)/g).map((part, i) =>
            part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
              <em key={i}>{part.slice(1, -1)}</em>
            ) : (
              <span key={i}>{part}</span>
            ),
          )}
        </span>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */

function Arrow() {
  return (
    <svg className="arrow" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 12 12 4M5.5 4H12v6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

const CARTONS = [
  { w: 78, label: "REFRIGERATOR / 2-DR", speed: 0, x: 0 },
  { w: 64, label: "AC-UNIT / 1.5T", speed: 45, x: 14 },
  { w: 70, label: "LED BATTEN ×24", speed: 95, x: 6 },
  { w: 48, label: "MIXER GRINDER ×6", speed: 150, x: 30 },
];

function structuredData(CATEGORIES: Category[]) {
  const org = absoluteUrl("/#organization");
  const business: Record<string, unknown> = {
    "@type": ["Organization", "LocalBusiness", "WholesaleStore"],
    "@id": org,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    description: SITE.description,
    slogan: "From the brand's warehouse to the dealer's shelf.",
    foundingDate: SITE.foundingYear,
    image: absoluteUrl("/opengraph-image"),
    address: {
      "@type": "PostalAddress",
      ...(SITE.address.street ? { streetAddress: SITE.address.street } : {}),
      addressLocality: SITE.address.locality,
      addressRegion: SITE.address.region,
      ...(SITE.address.postalCode ? { postalCode: SITE.address.postalCode } : {}),
      addressCountry: SITE.address.country,
    },
    areaServed: STATES.map((s) => ({ "@type": "State", name: s, containedInPlace: { "@type": "Country", name: "India" } })),
    brand: SITE.brands.map((b) => ({ "@type": "Brand", name: b })),
    knowsAbout: CATEGORIES.flatMap((c) => [c.name, ...c.items.map((i) => i.name)]),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Products distributed",
      itemListElement: CATEGORIES.map((c) => ({
        "@type": "OfferCatalog",
        name: c.name,
        itemListElement: c.items.map((i) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Product", name: i.name, ...(i.image ? { image: absoluteUrl(i.image) } : {}) },
        })),
      })),
    },
    ...(SITE.social.length ? { sameAs: SITE.social } : {}),
  };
  if (!isPlaceholder(SITE.phone)) business.telephone = SITE.phone;
  if (!isPlaceholder(SITE.email)) business.email = SITE.email;
  if (!isPlaceholder(SITE.phone) || !isPlaceholder(SITE.email)) {
    business.contactPoint = {
      "@type": "ContactPoint",
      contactType: "sales",
      areaServed: "IN",
      availableLanguage: ["en", "hi", "as"],
      ...(isPlaceholder(SITE.phone) ? {} : { telephone: SITE.phone }),
      ...(isPlaceholder(SITE.email) ? {} : { email: SITE.email }),
    };
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      business,
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        url: SITE.url,
        name: SITE.name,
        publisher: { "@id": org },
        inLanguage: "en-IN",
      },
      {
        "@type": "WebPage",
        "@id": absoluteUrl("/#webpage"),
        url: SITE.url,
        name: `${SITE.name} — ${SITE.tagline}`,
        isPartOf: { "@id": absoluteUrl("/#website") },
        about: { "@id": org },
        inLanguage: "en-IN",
      },
      {
        "@type": "FAQPage",
        "@id": absoluteUrl("/#faq"),
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

export default async function Home() {
  const C = await getContent();
  const CATEGORIES = C.categories;
  const words = C.statement.split(" ");
  const tickerLoop = [...C.ticker, ...C.ticker];
  const countWord = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"][CATEGORIES.length] ?? String(CATEGORIES.length);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(CATEGORIES)).replace(/</g, "\\u003c") }}
      />
      <Motion />
      <Telemetry />
      <BotBeacon path="/" />

      <header className="nav" data-nav>
        <a href="#top" className="brand">
          NAMS <span>Venture</span>
        </a>
        <nav className="navLinks" aria-label="Main">
          <a href="#range">What we carry</a>
          <a href="#process">How it works</a>
          <a href="#faq">FAQ</a>
          <a href="#reach">Reach</a>
          <a href="#dealers">Dealers</a>
        </nav>
        <a className="navCta" href="#dealers" data-track="nav_become_dealer">
          Become a dealer <Arrow />
        </a>
      </header>

      {/* HERO */}
      <section className="hero" id="top" data-section="hero">
        <div className="heroMeta" data-reveal>
          <span>{C.heroMeta}</span>
          <span>{CITY}</span>
          <span>Est. 2026</span>
        </div>

        <div className="heroGrid">
          <h1 className="heroTitle">
            {C.heroLines.map((l, i) => (
              <span className="line" key={i}>
                <span>
                  <Rich text={l} />
                </span>
              </span>
            ))}
          </h1>

          <div className="cartons" data-scroll aria-hidden="true">
            {CARTONS.map((c, i) => (
              <div
                className="carton"
                data-reveal
                key={c.label}
                style={
                  {
                    "--w": `${c.w}%`,
                    "--x": `${c.x}%`,
                    "--speed": c.speed,
                    "--d": `${0.35 + i * 0.12}s`,
                  } as React.CSSProperties
                }
              >
                <div className="cartonInner">
                  <span className="tape" />
                  <span className="cartonLabel">
                    <b>NV-{String(i + 1).padStart(4, "0")}</b>
                    {c.label}
                  </span>
                  <span className="cartonMark">↑↑</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="heroFoot">
          <p className="heroLede" data-reveal style={{ "--d": "0.5s" } as React.CSSProperties}>
            {C.heroLede}
          </p>
          <div className="heroActions" data-reveal style={{ "--d": "0.6s" } as React.CSSProperties}>
            <a href="#dealers" className="btn btnSolid" data-track="hero_become_dealer">
              Become a dealer <Arrow />
            </a>
            <a href="#range" className="btn" data-track="hero_see_range">
              See what we carry
            </a>
          </div>
        </div>

        <div className="ticker" aria-hidden="true">
          <div className="tickerTrack">
            {tickerLoop.map((t, i) => (
              <span key={i}>
                {t} <i>/</i>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* STATEMENT */}
      <section className="statement" data-scroll data-section="statement">
        <p className="label">{C.statementLabel}</p>
        <p className="statementText">
          {words.map((w, i) => (
            <span
              key={i}
              style={{ "--i": (i / words.length).toFixed(3) } as React.CSSProperties}
            >
              {w}{" "}
            </span>
          ))}
        </p>
      </section>

      {/* RANGE — pinned horizontal scroll on desktop */}
      <section className="range" id="range" data-hscroll data-section="range">
        <div className="rangeSticky">
          <div className="rangeTrack" data-htrack>
            <div className="rangeIntro">
              <p className="label">{C.rangeLabel}</p>
              <h2>
                {C.rangeTitle.replace("{count}", countWord)}
                <br />
                <em>{C.rangeHighlight}</em>
              </h2>
              <p className="rangeHint">Scroll to browse →</p>
            </div>

            {CATEGORIES.map((c) => (
              <article className="panel" key={c.code}>
                <div className="panelTop">
                  <span>CAT / {c.code}</span>
                  <span>{c.items.length} lines</span>
                </div>
                <h3>{c.name}</h3>
                {c.items.some((it) => it.image) ? (
                  <div className="panelShots" aria-hidden="true">
                    {c.items
                      .filter((it) => it.image)
                      .slice(0, 2)
                      .map((it) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={it.name} src={it.image} alt="" loading="lazy" decoding="async" />
                      ))}
                  </div>
                ) : null}
                <ul>
                  {c.items.map((it) => (
                    <li key={it.name} className={it.image ? "hasImg" : undefined}>
                      {it.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.image} alt={it.name} loading="lazy" decoding="async" width={36} height={36} />
                      ) : null}
                      <span>{it.name}</span>
                    </li>
                  ))}
                </ul>
                <span className="panelNum">{c.code}</span>
              </article>
            ))}
          </div>
          <div className="rangeProgress">
            <span data-progress />
          </div>
        </div>
      </section>

      {/* BRANDS */}
      <section className="brands" data-section="brands">
        <p className="label" data-reveal>{C.brandsLabel}</p>
        <div className="brandList">
          {BRANDS.map((b, i) => (
            <span
              key={b}
              data-reveal
              style={{ "--d": `${i * 0.08}s` } as React.CSSProperties}
            >
              {b}
            </span>
          ))}
        </div>
        <p className="brandNote" data-reveal>
          {C.brandNote}
        </p>
      </section>

      {/* PROCESS */}
      <section className="process" id="process" data-scroll data-section="process">
        <div className="processHead">
          <p className="label" data-reveal>{C.processLabel}</p>
          <h2 data-reveal>
            <Rich text={C.processTitle} />
          </h2>
        </div>

        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title} data-reveal>
              <span className="stepNum">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* REACH */}
      <section className="reach" id="reach" data-section="reach">
        <div className="reachHead">
          <p className="label" data-reveal>{C.reachLabel}</p>
          <p className="reachBig" data-reveal>
            <span data-count="8">08</span>
            <small>{C.reachSub}</small>
          </p>
        </div>
        <ul className="stateList">
          {STATES.map((s, i) => (
            <li
              key={s}
              data-reveal
              style={{ "--d": `${i * 0.05}s` } as React.CSSProperties}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              {s}
              {i === 0 && <em>Base</em>}
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ — answer-first, also published as FAQPage structured data */}
      <section className="faq" id="faq" data-section="faq">
        <div className="faqHead">
          <p className="label" data-reveal>{C.faqLabel}</p>
          <h2 data-reveal>
            <Rich text={C.faqTitle} />
          </h2>
        </div>
        <div className="faqList">
          {FAQ.map((f, i) => (
            <details key={f.q} data-reveal open={i === 0}>
              <summary data-track={`faq_${i + 1}`}>
                <span className="faqNum">{String(i + 1).padStart(2, "0")}</span>
                <h3>{f.q}</h3>
                <span className="faqIcon" aria-hidden="true" />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* DEALERS */}
      <section className="dealers" id="dealers" data-section="dealers">
        <div className="dealersCopy">
          <p className="label" data-reveal>{C.dealersLabel}</p>
          <h2 data-reveal>
            <Rich text={C.dealersTitle} />
          </h2>
          <p data-reveal>{C.dealersBody}</p>
          <dl className="contactLines" data-reveal>
            <div>
              <dt>Phone</dt>
              <dd>
                <a href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`} data-track="call_click">{CONTACT_PHONE}</a>
              </dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${CONTACT_EMAIL}`} data-track="email_click">{CONTACT_EMAIL}</a>
              </dd>
            </div>
          </dl>
        </div>

        <DealerForm categories={CATEGORIES.map((c) => c.name)} />
      </section>

      {/* FOOTER */}
      <footer className="footer" data-scroll>
        <div className="footerRow">
          <span>NAMS Venture</span>
          <span>{CITY}</span>
          <a href="#top">Back to top ↑</a>
        </div>
        <div className="wordmark" aria-hidden="true">
          NAMS
        </div>
        <div className="footerRow footerSmall">
          <span>© 2026 NAMS Venture. All rights reserved.</span>
          <span>Brand names belong to their respective owners.</span>
          <a href="https://brixta.site/" target="_blank" rel="noopener" data-track="brixta_credit">
            Built by BRIXTA Corporation ↗
          </a>
        </div>
      </footer>
    </main>
  );
}
