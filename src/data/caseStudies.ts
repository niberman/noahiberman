export interface CaseStudy {
  id: string;
  title: string;
  tagline: string;
  category: string;
  year: string;
  status: string;
  stack: string[];
  summary: string;
  highlights: string[];
  accent: "aviation" | "education" | "business";
  featured?: boolean;
}

/**
 * The shipped-work record, aviation first. Sources: noah.md (Engineering
 * record), aviari.md (client naming), and Noah's master resume reviewed
 * 2026-10-13. Copy rules: no proof metrics (no run counts, uptime,
 * percentages, time-to-ship), no client names other than Smoothie King,
 * nothing about whether past work sold.
 *
 * Retired 2026-10-13: "hermes" (now part of iNoah, per Noah) and
 * "mockchecker" (dropped from the master resume). App.tsx redirects both.
 */
export const caseStudies: CaseStudy[] = [
  {
    id: "flight-school-ops",
    title: "Aviation Operations Platform",
    tagline: "Scheduling, aircraft readiness and maintenance for flight schools.",
    category: "Aviation / Multi-tenant platform",
    year: "2025 to 2026",
    status: "Built and deployed to production",
    stack: ["TypeScript", "NestJS", "GraphQL", "Prisma", "PostgreSQL", "Docker", "GitHub Actions"],
    summary:
      "A multi-tenant operations platform for flight schools and FBOs: scheduling, aircraft readiness, maintenance tracking and billing. I interviewed flight school and FBO operators at Centennial and Rocky Mountain Metro first, then built it to production.",
    highlights: [
      "Engine monitoring against manufacturer limits, with rules that ground the aircraft when CHT, oil pressure, oil temperature, EGT spread or fuel flow go out of limits",
      "MEL handling, so an inoperative item grounds the aircraft only when the MEL says it should",
      "An immutable squawk log with a full audit trail",
      "Tenant isolation enforced in the data layer, role-based permissions and a database-backed notification queue",
      "End-to-end tests against a live database, packaged in Docker with GitHub Actions builds",
    ],
    accent: "aviation",
    featured: true,
  },
  {
    id: "preflight-briefing",
    title: "Preflight Briefing Automation",
    tagline: "The numbers come from code, not from a model.",
    category: "Aviation / Python service",
    year: "2026",
    status: "Personal tool, in development",
    stack: ["Python", "FastAPI", "Telegram"],
    summary:
      "A briefing service that pulls weather and NOTAMs for a planned flight and sends the briefing to my phone. Weight and balance and performance are computed by deterministic code from the aircraft's own numbers, so a language model never does the math.",
    highlights: [
      "METAR, TAF, winds aloft and NOTAM data for the planned flight",
      "Deterministic weight and balance, with performance from the aircraft's POH tables",
      "Briefings delivered over Telegram",
      "In review I checked the aviation math against the source documents and caught a fabricated Vyse adjustment formula and an empty-weight error",
    ],
    accent: "aviation",
    featured: true,
  },
  {
    id: "owner-portal",
    title: "Aircraft Owner Portal",
    tagline: "Used by owners, instructors and mechanics.",
    category: "Aviation / Client portal",
    year: "2025 to 2026",
    status: "In use until Freedom Aviation closed in May 2026",
    stack: [],
    summary:
      "Freedom Aviation was an aircraft management and concierge company for owner-pilots at Centennial Airport, which I co-founded with two partners. I built and deployed its software platform and the aircraft owner portal for scheduling and billing.",
    highlights: [
      "Scheduling and billing in one portal for aircraft owners",
      "Used day to day by clients, flight instructors and mechanics",
      "Built alongside running the operation: customers, aircraft, hangar partners and the books",
    ],
    accent: "aviation",
    featured: true,
  },
  {
    id: "flight-log",
    title: "Flight Log Map",
    tagline: "My logbook, redrawn every night.",
    category: "Aviation / Data pipeline",
    year: "2025 to 2026",
    status: "Live on this site",
    stack: ["Python", "TypeScript", "React", "Supabase", "PostgreSQL", "Mapbox GL"],
    summary:
      "A nightly job reads my ForeFlight logbook export, parses it and replaces the flights table. The homepage map and the Aviation page draw from that table, so the flying on this site comes from the logbook, not from me typing numbers in.",
    highlights: [
      "Nightly sync from the ForeFlight export to the database",
      "Airport coordinates resolved from the export so new routes draw themselves",
      "A manual CSV upload path in the dashboard as a fallback",
      "A scroll-driven map that flies the camera through each chapter of the flying record",
    ],
    accent: "aviation",
  },
  {
    id: "inoah",
    title: "iNoah",
    tagline: "An assistant that would rather decline than guess.",
    category: "AI / Retrieval-augmented assistant",
    year: "2026",
    status: "Live on this site",
    stack: ["TypeScript", "React", "Supabase Edge Functions", "PostgreSQL", "pgvector"],
    summary:
      "A retrieval-augmented assistant that answers questions about my work in my voice. What it is allowed to see is decided in the database, not in the prompt, and every deploy of this site runs a held-out evaluation that fails the build if iNoah makes a claim it should not.",
    highlights: [
      "Hourly ingestion from Google Drive into pgvector, with public and private visibility enforced in SQL",
      "A deterministic refusal when nothing clears the match threshold, so the model is never asked to guess",
      "Held-out evaluations gate every deploy and fail the build on a prohibited claim",
      "Connected to Hermes, a self-hosted agent stack on my own devices with voice input and scheduled digests",
    ],
    accent: "business",
  },
  {
    id: "smoothie-king-checklist",
    title: "Shift Checklist App",
    tagline: "Built alone. In use.",
    category: "Production web app / Restaurant operations",
    year: "2026",
    status: "In use at Smoothie King stores in Denver",
    stack: ["Next.js", "TypeScript", "Supabase", "PostgreSQL"],
    summary:
      "A phone-first shift checklist that replaced paper checklists at Smoothie King stores in Denver. Staff reach it by QR code and sign in with the same PIN they use on the POS, each person sees the tasks their position owes for the shift, managers sign off, and owners get timestamped reporting.",
    highlights: [
      "Requirements from staff interviews and live-shift observation",
      "QR access and POS PIN sign-in on shared devices",
      "Position-based tasks, manager sign-off and timestamped owner reporting",
      "Data access enforced by row-level security in PostgreSQL",
    ],
    accent: "business",
  },
  {
    id: "artnimality",
    title: "Artnimality",
    tagline: "Client work for the Spanish market.",
    category: "E-commerce / Client build",
    year: "2026",
    status: "Live",
    stack: ["React", "TypeScript", "Tailwind CSS", "Vercel"],
    summary:
      "A production ordering site for a pet-portrait artist in Bilbao, Spain. Customers browse the gallery, pick a format and submit an order request with a photo of their pet. The full flow is in Spanish and built for real orders.",
    highlights: [
      "Made-to-order flow with pet photo upload",
      "Spanish-language storefront, end to end",
      "Order delivery checked against the real inbox path",
    ],
    accent: "education",
  },
];

export const caseStudyById = (id: string) =>
  caseStudies.find((c) => c.id === id);
