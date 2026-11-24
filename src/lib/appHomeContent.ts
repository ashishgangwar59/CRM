// Content for the mobile app's public home page (shown before login).
// Admins edit it in Master Settings → "Mobile App Home"; the app reads it from GET /api/public/app-content.
// Keep this file free of server-only imports: the settings page (client) imports the defaults too.

export const APP_HOME_ICONS = [
  "building",
  "target",
  "shield",
  "trending",
  "key",
  "user",
  "briefcase",
  "wallet",
  "chart",
  "landmark",
] as const;

export type AppHomeIcon = (typeof APP_HOME_ICONS)[number];

export interface AppHomeCard {
  title: string;
  description: string;
  icon: AppHomeIcon;
}

export interface AppHomeSection {
  title: string;
  cards: AppHomeCard[];
}

export interface AppHomeHighlight {
  value: string; // e.g. "11.5%"
  label: string; // e.g. "NCD yield p.a."
}

export interface AppHomeContent {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroTagline: string;
  heroDescription: string;
  highlights: AppHomeHighlight[];
  sections: AppHomeSection[];
  consultUrl: string;
  contactUrl: string;
  profilePdfUrl: string;
  footerNote: string;
}

export const DEFAULT_APP_HOME_CONTENT: AppHomeContent = {
  heroBadge: "Official Investor Portal",
  heroTitle: "Niventra Capital Advisory",
  heroSubtitle: "India Pvt. Ltd.",
  heroTagline: "Smart Investments for a Better Tomorrow",
  heroDescription:
    "Build long-term wealth with personalized investment strategies, expert financial guidance, and transparent advisory services.",
  highlights: [
    { value: "11.5%", label: "NCD yield p.a." },
    { value: "+14.2%", label: "Real estate growth" },
    { value: "100%", label: "Asset-backed" },
    { value: "₹150+ Cr", label: "Assets managed" },
  ],
  sections: [
    {
      title: "Company",
      cards: [
        {
          icon: "building",
          title: "Company Overview",
          description:
            "Professionally managed Real Estate Investment Advisory Company. Trusted partner for residential & commercial real estate investments with focus on long-term wealth creation & transparent services.",
        },
        {
          icon: "target",
          title: "Vision & Mission",
          description:
            "Become one of India's most trusted real estate investment advisory companies. Create sustainable wealth, expand opportunities, maintain transparency, and ensure high standards of ethics and compliance.",
        },
        {
          icon: "shield",
          title: "Core Values",
          description:
            "Transparency & Trust · Integrity & Accountability · Professionalism & Customer First · Innovation & Long-Term Relationships",
        },
      ],
    },
    {
      title: "Invest",
      cards: [
        {
          icon: "trending",
          title: "Investment Benefits",
          description:
            "Attractive investment opportunities, capital appreciation, regular rental income potential, wealth preservation, passive income generation, and long-term value creation.",
        },
        {
          icon: "key",
          title: "Why Invest in PPF",
          description: "Invest in PPF with attractive interest rates and secure returns.",
        },
        {
          icon: "wallet",
          title: "Why Invest in Debentures",
          description:
            "Build long-term wealth with professionally managed investment strategies designed for sustainable growth.",
        },
        {
          icon: "landmark",
          title: "Why Invest in Real Estate",
          description:
            "Tangible asset class offering robust inflation hedge, portfolio diversification, strong capital appreciation, and reliable long-term financial security.",
        },
        {
          icon: "user",
          title: "Who Can Invest",
          description:
            "Salaried Professionals, Business Owners, NRIs, HNIs, Family Offices, Corporate Investors, First-Time and Experienced Investors.",
        },
      ],
    },
    {
      title: "Services",
      cards: [
        {
          icon: "briefcase",
          title: "Our Key Services",
          description:
            "Residential & Commercial property investments, Office Spaces, Retail Shops, Luxury Apartments, Business Parks, Portfolio Advisory & Exit Strategies.",
        },
        {
          icon: "target",
          title: "Investment Process",
          description:
            "Investor Registration → Digital KYC Verification → Transparent Documentation → Agreement Execution → Investment Confirmation → Dedicated RM Updates.",
        },
        {
          icon: "shield",
          title: "Due Diligence",
          description:
            "Rigorous market research, legal & title verification, financial analysis, technical feasibility assessments, documentation reviews, and continuous project monitoring.",
        },
      ],
    },
    {
      title: "Features",
      cards: [
        {
          icon: "shield",
          title: "Security & Compliance",
          description:
            "Complete regulatory compliance, transparent transaction records, secure data handling, and strict confidentiality of investor info.",
        },
        {
          icon: "chart",
          title: "Digital Platform",
          description:
            "Digital KYC, verified opportunities, investment calculator, portfolio dashboard, payment tracking, property listings & live support.",
        },
        {
          icon: "user",
          title: "Investor Benefits",
          description:
            "Verified opportunities, complete legal due diligence, dedicated Relationship Managers, personalized investment planning, regular updates, and end-to-end support.",
        },
      ],
    },
  ],
  consultUrl: "https://niventracapitaladvisory.com/contact/",
  contactUrl: "https://niventracapitaladvisory.com/contact/",
  profilePdfUrl: "",
  footerNote: "Secured enterprise infrastructure",
};

const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);

/** Merge stored (possibly partial / older) content over the defaults so the app always gets a complete object. */
export function resolveAppHomeContent(stored: any): AppHomeContent {
  const d = DEFAULT_APP_HOME_CONTENT;
  if (!stored || typeof stored !== "object") return d;

  const highlights = Array.isArray(stored.highlights)
    ? stored.highlights
        .filter((h: any) => h && (h.value || h.label))
        .map((h: any) => ({ value: str(h.value, ""), label: str(h.label, "") }))
    : d.highlights;

  const sections = Array.isArray(stored.sections)
    ? stored.sections
        .filter((s: any) => s && s.title)
        .map((s: any) => ({
          title: str(s.title, ""),
          cards: Array.isArray(s.cards)
            ? s.cards
                .filter((c: any) => c && (c.title || c.description))
                .map((c: any) => ({
                  title: str(c.title, ""),
                  description: str(c.description, ""),
                  icon: (APP_HOME_ICONS as readonly string[]).includes(c.icon) ? c.icon : "building",
                }))
            : [],
        }))
    : d.sections;

  return {
    heroBadge: str(stored.heroBadge, d.heroBadge),
    heroTitle: str(stored.heroTitle, d.heroTitle),
    heroSubtitle: str(stored.heroSubtitle, d.heroSubtitle),
    heroTagline: str(stored.heroTagline, d.heroTagline),
    heroDescription: str(stored.heroDescription, d.heroDescription),
    highlights,
    sections,
    consultUrl: str(stored.consultUrl, d.consultUrl),
    contactUrl: str(stored.contactUrl, d.contactUrl),
    profilePdfUrl: str(stored.profilePdfUrl, d.profilePdfUrl),
    footerNote: str(stored.footerNote, d.footerNote),
  };
}
