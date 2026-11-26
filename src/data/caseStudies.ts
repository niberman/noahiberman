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
    id: "flight-school-ops",
    title: "Flight-School Operations Platform",
    tagline: "Maintenance state, squawks and grounding rules, built to production.",
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
    id: "cockpit-references",
    title: "Cockpit References",
    tagline: "The checklist I fly with.",
    category: "Pilot Tools / Beechcraft Travel Air",
    year: "Ongoing",
    status: "In use in the aircraft",
    stack: ["ForeFlight"],
    summary:
      "I built the ForeFlight weight-and-balance template and the digital checklist I use as pilot in command of a 1962 Beechcraft Travel Air, a light piston twin.",
    highlights: [
      "Weight-and-balance template in ForeFlight",
      "Digital checklist used in the cockpit",
      "Built for an aircraft I fly as pilot in command",
    ],
    accent: "aviation",
  },
  {
    id: "cooler-scooter",
    title: "Cooler Scooter",
    tagline: "A seat I modeled, printed and tested.",
    category: "Mechanical Design / University of Denver",
    year: "DU coursework",
    status: "Four-person team project",
    stack: ["SolidWorks", "3D printing"],
    summary:
      "A mechanical engineering design project at the University of Denver. I proposed the concept the team selected for the final frame and ice-holding seat, modeled the knee seat in SolidWorks, integrated my teammates' parts into a 20% scale assembly, 3D printed it, and ran turning and obstacle-clearance tests.",
    highlights: [
      "Concept selected for the final frame and seat",
      "Knee seat modeled in SolidWorks",
      "Teammates' parts integrated into a 20% scale assembly, 3D printed",
      "Turning and obstacle-clearance tests on the printed model",
    ],
    accent: "education",
  },
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
    tagline: "Agent infrastructure I run on my own machines.",
    category: "AI Infrastructure / Personal Systems",
    year: "2026",
    status: "In use",
    stack: ["Hermes Agent", "Python", "Tailscale", "Whisper", "OpenRouter"],
    summary:
      "A self-hosted agent stack built on Nous Research's open-source Hermes Agent, set up and run by me across my own machines over a private mesh network. Voice input, a web dashboard, and a full backup-and-restore path so the whole system can be reactivated on any machine.",
    highlights: [
      "Services distributed over a private Tailscale mesh",
      "Voice input via Whisper",
      "One-repo backup and restore",
    ],
    accent: "business",
  },
];

export const caseStudyById = (id: string) =>
  caseStudies.find((c) => c.id === id);
