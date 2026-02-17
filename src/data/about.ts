import { BrandWordsString } from "./brand";

export interface TimelineItem {
  id: string;
  year: string;
  title: string;
  description: string;
  type: "aviation" | "business" | "education" | "personal";
  category?: string;
}

export const timeline: TimelineItem[] = [
  // Education & Culture
  {
    id: "spain-experience",
    year: "2024-2025",
    title: "Studied in Bilbao, Spain",
    description: "Immersive year abroad at the University of Deusto studying business and Spanish. Lived with a local family, built fluency, and learned European business and culture.",
    type: "education",
    category: "Education & Culture",
  },
  // Aviation
  {
    id: "ppl",
    year: "2023",
    title: "Private Pilot License",
    description: "Completed initial flight training and earned Private Pilot certificate. Beginning of aviation journey.",
    type: "aviation",
    category: "Aviation",
  },
  {
    id: "instrument-rating",
    year: "2023",
    title: "Instrument Rating",
    description: "Earned Instrument Rating, enabling flight in instrument meteorological conditions (IMC) and expanding operational capabilities.",
    type: "aviation",
    category: "Aviation",
  },
  {
    id: "cpl",
    year: "2024",
    title: "FAA Commercial Pilot License",
    description: "Earned Commercial Pilot certification with Instrument rating. Authorized to fly professionally.",
    type: "aviation",
    category: "Aviation",
  },
  {
    id: "helicopter-ppl",
    year: "2024",
    title: "Helicopter Private Pilot License",
    description: "Earned Private Pilot certificate for helicopters, expanding capabilities to rotorcraft operations.",
    type: "aviation",
    category: "Aviation",
  },
  {
    id: "commercial-multi",
    year: "2025",
    title: "Commercial Multi-Engine Rating",
    description: "Added multi-engine rating to commercial certificate, enabling operations of multi-engine aircraft for commercial purposes.",
    type: "aviation",
    category: "Aviation",
  },
  // Business & Work
  {
    id: "freedom-aviation-launch",
    year: "2025",
    title: "Founded Freedom Aviation",
    description: "Founder & CEO of a premium aviation company delivering concierge-level aircraft management and expert flight instruction at Centennial (KAPA).",
    type: "business",
    category: "Business & Work",
  },
  {
    id: "language-school",
    year: "2025",
    title: "Technical Co-Founder, The Language School Platform",
    description: "Built the prototype for the Language School educational platform, and teach ESL through Spanish.",
    type: "business",
    category: "Business & Work",
  },
];

export interface FocusArea {
  title: string;
  spanish: string;
  description: string;
  expandedContent: string;
  credentials?: string[];
}

export const aboutContent = {
  intro: "I'm a bilingual pilot and engineer forging solutions where aviation, technology, and culture intersect.",
  expandedBio: `I'm Noah Berman — a ${BrandWordsString} with experience in aviation training, software development, and international education. I build ventures that expand opportunity and push the boundaries of human mobility.`,
  oneLiner: "I build companies at the intersection of aviation, technology, and global mobility.",
  mission: "My mission is to build companies that create meaningful impact, expand human opportunity, and open pathways to global freedom and mobility.",
  focusAreas: [
    {
      title: "Aviation",
      spanish: "Aviación",
      description: "Flying with the next generation of pilots using modern training techniques.",
      expandedContent: "Flying with the next generation of pilots using modern training techniques, data-driven safety, and a commitment to precision.",
      credentials: [
        "Commercial Pilot, Instrument Rated",
        "Helicopter Private Pilot",
        "Commercial Multi-Engine",
        "560+ hours, 290+ flights",
      ],
    },
    {
      title: "Technology",
      spanish: "Tecnología",
      description: "Building software solutions that solve real problems for real people.",
      expandedContent: "Engineer of modern software solutions solving real-world problems in aviation and education. Recent work includes the Freedom Aviation Dashboard and The Language School platform (React, TypeScript, Supabase, OpenAI, Vercel).",
    },
    {
      title: "Entrepreneurship",
      spanish: "Emprendimiento",
      description: "Creating ventures that blend passion, purpose, and innovation.",
      expandedContent: "Creating ventures that blend passion, purpose, and precision—aimed at expanding freedom, mobility, and opportunity.",
    },
    {
      title: "Cultural Connection",
      spanish: "Conexión Cultural",
      description: "Bridging worlds through bilingual ventures that unite communities.",
      expandedContent: "Bridging worlds through bilingual work and international experience, from Colorado to Spain and beyond, using language as a tool for mobility and opportunity.",
    },
  ] as FocusArea[],
  values: [
    {
      title: "Precision",
      description: "From the cockpit to the codebase, attention to detail matters.",
      spanish: "Precisión",
    },
    {
      title: "Innovation",
      description: "Constantly seeking better ways to solve problems and serve people.",
      spanish: "Innovación",
    },
    {
      title: "Connection",
      description: "Building bridges between cultures, people, and ideas.",
      spanish: "Conexión",
    },
  ],
};

// Group timeline by category for display
export const groupedTimeline = {
  "Education & Culture": timeline.filter(item => item.category === "Education & Culture"),
  "Aviation": timeline.filter(item => item.category === "Aviation"),
  "Business & Work": timeline.filter(item => item.category === "Business & Work"),
};

// Flight stats (can be updated dynamically if needed)
export const flightStats = {
  totalHours: "562+",
  totalFlights: "300+",
};
