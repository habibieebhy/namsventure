/* ------------------------------------------------------------------
   EDIT HERE — every business detail on the page, in SEO metadata,
   in the structured data Google/AI assistants read, and in /llms.txt
   comes from this one file.
------------------------------------------------------------------- */

export const SITE = {
  /* Your live domain. Can also be set with NEXT_PUBLIC_SITE_URL. */
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://namsventure.com").replace(/\/$/, ""),
  name: "NAMS Venture",
  legalName: "NAMS Venture",
  tagline: "Electronics distribution across Assam and the Northeast",
  description:
    "NAMS Venture is an electronics distributor in Assam, India, supplying consumer electronics, home appliances, kitchen appliances, electricals and batteries to retailers and dealers across the Northeast.",
  email: "hello@example.com",
  phone: "+91 00000 00000",
  cityLabel: "Assam, India",
  foundingYear: "2026",
  address: {
    street: "",
    locality: "Guwahati",
    region: "Assam",
    postalCode: "",
    country: "IN",
  },
  /* Only list brands you actually have a distribution agreement with. */
  brands: ["Panasonic"],
  /* Full URLs of your Google Business Profile, Facebook, Instagram, LinkedIn, etc. */
  social: [] as string[],
};

export const CATEGORIES = [
  {
    code: "01",
    name: "Home appliances",
    items: ["Air conditioners", "Refrigerators", "Washing machines", "Microwave ovens"],
  },
  {
    code: "02",
    name: "Consumer electronics",
    items: ["Televisions", "Audio & home theatre", "Personal care", "Small gadgets"],
  },
  {
    code: "03",
    name: "Kitchen",
    items: ["Mixer grinders", "Rice cookers", "Induction cooktops", "Kettles & toasters"],
  },
  {
    code: "04",
    name: "Electricals",
    items: ["Switches & sockets", "Wiring devices", "Fans", "LED lighting"],
  },
  {
    code: "05",
    name: "Batteries & power",
    items: ["Dry-cell batteries", "Rechargeables", "Chargers", "Accessories"],
  },
];

export const STATES = [
  "Assam",
  "Meghalaya",
  "Arunachal Pradesh",
  "Nagaland",
  "Manipur",
  "Mizoram",
  "Tripura",
  "Sikkim",
];

/* Shown on the page AND published as FAQ structured data and in /llms.txt.
   Keep every answer true — Google and AI assistants will quote them. */
export const FAQ = [
  {
    q: "What does NAMS Venture distribute?",
    a: "Consumer electronics, home appliances such as air conditioners, refrigerators and washing machines, kitchen appliances, electricals including switches, wiring devices, fans and LED lighting, and batteries.",
  },
  {
    q: "Which areas does NAMS Venture supply?",
    a: "We are based in Assam and supply retailers across the Northeast: Assam, Meghalaya, Arunachal Pradesh, Nagaland, Manipur, Mizoram, Tripura and Sikkim.",
  },
  {
    q: "Who can buy from NAMS Venture?",
    a: "We supply retail shops, dealers and business buyers. Send a dealer enquiry and we will call back with current stock, dealer pricing and delivery days for your town.",
  },
  {
    q: "Is there a minimum order?",
    a: "There is no minimum on your first order. After that, quantities and terms are agreed with each dealer.",
  },
  {
    q: "Do you give GST invoices and warranty support?",
    a: "Yes. Every delivery comes with a GST invoice, and warranty claims are routed to the brand's authorised service network.",
  },
];

/* ------------------------------------------------------------------ */

export function absoluteUrl(path = "/") {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/* True for the dummy values above, so they never leak into SEO data. */
export function isPlaceholder(v: string | undefined | null) {
  if (!v) return true;
  return /example\.com|00000\s?00000|^\+91\s?0+$/i.test(v.trim());
}
