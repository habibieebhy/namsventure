const businesses = [
  {
    number: "01",
    name: "Distribution",
    title: "The network that moves business.",
    description:
      "A distribution operation built around reach, relationships and dependable movement of goods across markets.",
    meta: "TRADE · LOGISTICS · DISTRIBUTION",
  },
  {
    number: "02",
    name: "Industries",
    title: "Building at industrial scale.",
    description:
      "Manufacturing, industrial operations and long-term businesses built around physical infrastructure and regional demand.",
    meta: "INDUSTRY · MANUFACTURING · INFRASTRUCTURE",
  },
  {
    number: "03",
    name: "Music",
    title: "Commerce meets culture.",
    description:
      "A creative business working with music, artists, releases and entertainment while retaining its own independent identity.",
    meta: "MUSIC · ARTISTS · CULTURE",
  },
  {
    number: "04",
    name: "Ventures",
    title: "What comes next.",
    description:
      "New businesses, partnerships and opportunities that extend the group into emerging markets.",
    meta: "INVESTMENTS · PARTNERSHIPS · GROWTH",
  },
];

export default function Home() {
  return (
    <main>
      <header className="nav">
        <a href="#" className="brand">NAMS VENTURE</a>

        <nav className="navLinks">
          <a href="#group">The Group</a>
          <a href="#businesses">Businesses</a>
          <a href="#legacy">Legacy</a>
          <a href="#contact">Contact</a>
        </nav>

        <a className="menuButton" href="#businesses">
          Explore <span>↗</span>
        </a>
      </header>

      <section className="hero" id="group">
        <div className="heroTop">
          <p className="eyebrow">INDEPENDENT BUSINESS GROUP · ASSAM, INDIA</p>

          <p className="heroIntro">
            A diversified group operating across commerce, industry,
            entertainment and emerging ventures.
          </p>
        </div>

        <div className="heroTitle">
          <h1>
            Built across
            <br />
            <em>industries.</em>
          </h1>
        </div>

        <div className="heroBottom">
          <p>
            Different businesses.
            <br />
            One long-term view.
          </p>

          <div className="scrollMark">
            <span>DISCOVER THE GROUP</span>
            <strong>↓</strong>
          </div>
        </div>
      </section>

      <section className="statement">
        <div className="statementNumber">EST.</div>

        <p className="statementText">
          We build and operate businesses with
          <span> independent identities</span>, connected by the same values:
          relationships, resilience and a long-term commitment to the markets
          we serve.
        </p>
      </section>

      <section id="businesses" className="businessSection">
        <div className="sectionHeader">
          <p>OUR BUSINESSES</p>
          <p>04 OPERATING VERTICALS</p>
        </div>

        <div className="businessList">
          {businesses.map((business) => (
            <a href="#" className="businessCard" key={business.number}>
              <div className="businessNumber">{business.number}</div>

              <div className="businessMain">
                <p className="businessMeta">{business.meta}</p>
                <h2>{business.name}</h2>
                <h3>{business.title}</h3>
              </div>

              <div className="businessDescription">
                <p>{business.description}</p>

                <span className="explore">
                  Explore business <b>↗</b>
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="legacy" id="legacy">
        <div className="legacyLabel">
          <p>OUR STORY</p>
          <span>01 — TODAY</span>
        </div>

        <div className="legacyContent">
          <h2>
            One business
            <br />
            became <em>many.</em>
          </h2>

          <div className="legacyCopy">
            <p>
              What began with commercial relationships and distribution
              expanded over time into a wider portfolio of businesses.
            </p>

            <p>
              Today, the group brings together companies from fundamentally
              different industries without forcing them into a single identity.
            </p>
          </div>
        </div>
      </section>

      <section className="numbers">
        <div className="numbersIntro">
          <p>THE GROUP IN NUMBERS</p>

          <h2>
            Scale is more than
            <br />
            one number.
          </h2>
        </div>

        <div className="numberGrid">
          <div className="numberItem">
            <strong>04</strong>
            <span>BUSINESS VERTICALS</span>
          </div>

          <div className="numberItem">
            <strong>XX+</strong>
            <span>YEARS IN BUSINESS</span>
          </div>

          <div className="numberItem">
            <strong>XX</strong>
            <span>MARKETS SERVED</span>
          </div>

          <div className="numberItem">
            <strong>01</strong>
            <span>GROUP</span>
          </div>
        </div>
      </section>

      <section className="manifesto">
        <p>OUR APPROACH</p>

        <h2>
          Build independently.
          <br />
          Think collectively.
          <br />
          <span>Stay for the long term.</span>
        </h2>
      </section>

      <footer id="contact">
        <div className="footerTop">
          <div>
            <p className="footerLabel">NAMS VENTURE</p>

            <h2>
              Start a
              <br />
              conversation.
            </h2>
          </div>

          <a href="mailto:hello@example.com" className="contactButton">
            GET IN TOUCH <span>↗</span>
          </a>
        </div>

        <div className="footerBottom">
          <span>ASSAM · INDIA</span>
          <span>© 2026 NAMS VENTURE</span>
          <span>LINKEDIN ↗</span>
        </div>
      </footer>
    </main>
  );
}
