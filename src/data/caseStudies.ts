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
 * The shipped-work record. Copy rules honored here:
 * no proof metrics (no run counts, uptime, percentages, time-to-ship),
 * no client names beyond what is already public on this site.
 */
export const caseStudies: CaseStudy[] = [
  {
    id: "smoothie-king-checklist",
    title: "Shift Checklist Platform",
    tagline: "Built alone. In use.",
    category: "Production SaaS / QSR Operations",
    year: "2026",
    status: "In use at a Denver Smoothie King franchise",
    stack: ["React", "TypeScript", "Supabase", "Tailwind CSS", "Vercel"],
    summary:
      "A complete in-store checklist system for quick-service restaurants. Staff sign in with a PIN and land directly on their shift checklist. Managers open and close shift segments, run the pre-shift huddle, and approve gated stages. Owners and ops managers author checklists, manage people, and read completion reports.",
    highlights: [
      "PIN-based staff sign-in built for shared shift tablets",
      "Manager huddles and gated stage approvals",
      "Owner consoles for checklist authoring and reporting",
      "Row-level security across every table",
    ],
    accent: "business",
    featured: true,
  },
  {
    id: "flight-school-ops",
    title: "Flight-School Operations Platform",
    tagline: "The strongest pure-engineering artifact in the portfolio.",
    category: "Multi-tenant SaaS / Aviation",
    year: "2025 - 2026",
    status: "Built to production",
    stack: ["Next.js", "TypeScript", "Supabase", "Postgres", "Expo"],
    summary:
      "A multi-tenant operations system for small flight schools: multi-participant bookings with two-phase compliance gating, a squawk engine with conditional grounding, telemetry monitoring, ramp operations, notifications, and billing. Web app plus a native mobile app, one backend.",
    highlights: [
      "Bookings gated on pilot, aircraft, and currency checks",
      "Squawk engine with MEL-style conditional grounding",
      "Telemetry monitoring with automatic grounding",
      "Web and mobile clients on one Supabase backend",
    ],
    accent: "aviation",
    featured: true,
  },
  {
    id: "mockchecker",
    title: "MockChecker",
    tagline: "An FAA checkride you can fail safely.",
    category: "AI / Aviation Training",
    year: "2026",
    status: "Open source",
    stack: ["Python", "RAG", "OpenAI API", "Supabase"],
    summary:
      "A retrieval-augmented app that simulates FAA practical-test scenarios for pilots. It asks the questions a designated examiner asks, drawn from the actual Airman Certification Standards, and grades the answers like the oral exam it imitates.",
    highlights: [
      "RAG over the real ACS source material",
      "Scenario-driven oral exam simulation",
      "Built by a pilot who has sat these checkrides",
    ],
    accent: "aviation",
  },
  {
    id: "artnimality",
    title: "Artnimality",
    tagline: "Client work for the Spanish market.",
    category: "E-commerce / Client Build",
    year: "2026",
    status: "Live",
    stack: ["React", "TypeScript", "Tailwind CSS", "shadcn/ui", "Vercel"],
    summary:
      "A production ordering site for a pet-portrait artist in Bilbao, Spain. Customers browse the gallery, pick a format, and submit an order request with a photo of their pet. The full flow is in Spanish, built for real paying orders, not a demo.",
    highlights: [
      "Made-to-order flow with pet photo upload",
      "Spanish-language storefront, end to end",
      "Order delivery verified against the real inbox path",
    ],
    accent: "education",
  },
  {
    id: "hermes",
    title: "Hermes",
    tagline: "My own agent infrastructure.",
    category: "AI Infrastructure / Personal Systems",
    year: "2026",
    status: "Running daily",
    stack: ["Python", "Tailscale", "faster-whisper", "OpenRouter", "Telegram"],
    summary:
      "A self-hosted autonomous agent stack running across my own machines over a private mesh network. Voice input, a web dashboard, scheduled digests, and a full backup-and-restore path so the whole system can be reactivated on any machine.",
    highlights: [
      "Services distributed over a private Tailscale mesh",
      "Voice input via faster-whisper",
      "Scheduled digests delivered to Telegram",
      "One-repo backup and restore",
    ],
    accent: "business",
  },
  {
    id: "language-school-platform",
    title: "Let's Start Talking",
    tagline: "Digitizing a curriculum that already worked.",
    category: "EdTech / AI",
    year: "2025 - 2026",
    status: "In use",
    stack: ["React", "TypeScript", "Supabase", "OpenAI API", "Vercel"],
    summary:
      "A platform digitizing The Language School's English-fluency curriculum for Spanish-speaking adults: video lessons, an AI conversation partner, homework correction, and a bilingual job-matching feed. I also taught in this program, which is how I knew what to build.",
    highlights: [
      "AI conversation partner for speaking practice",
      "Homework capture and correction",
      "Bilingual job-matching feed",
      "Built from inside the classroom, not outside it",
    ],
    accent: "education",
  },
];

export const caseStudyById = (id: string) =>
  caseStudies.find((c) => c.id === id);
