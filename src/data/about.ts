export interface TimelineItem {
  id: string;
  year: string;
  title: string;
  description: string;
  type: "aviation" | "business" | "education" | "personal";
}

export const timeline: TimelineItem[] = [
  {
    id: "freedom-aviation-launch",
    year: "2025",
    title: "Founded Freedom Aviation",
    description: "Launched a modern flight training organization focused on personalized instruction and innovative teaching methods.",
    type: "business",
  },
  {
    id: "commercial-multi",
    year: "2025",
    title: "Commercial Multi-Engine Rating",
    description: "Added multi-engine rating to commercial certificate, enabling operations of multi-engine aircraft for commercial purposes.",
    type: "aviation",
  },
  {
    id: "spain-experience",
    year: "2024-2025",
    title: "Studied in Spain",
    description: "Immersive experience studying business and Spanish culture in Bilbao. Expanded global perspective and cross-cultural communication skills.",
    type: "education",
  },
  {
    id: "helicopter-ppl",
    year: "2024",
    title: "Helicopter Private Pilot License",
    description: "Earned Private Pilot certificate for helicopters, expanding capabilities to rotorcraft operations.",
    type: "aviation",
  },
  {
    id: "cpl",
    year: "2024",
    title: "FAA Commercial Pilot License",
    description: "Earned Commercial Pilot certification with Instrument rating. Authorized to fly professionally.",
    type: "aviation",
  },
  {
    id: "ppl",
    year: "2023",
    title: "Private Pilot License",
    description: "Completed initial flight training and earned Private Pilot certificate. Beginning of aviation journey.",
    type: "aviation",
  },
  {
    id: "instrument-rating",
    year: "2023",
    title: "Instrument Rating",
    description: "Earned Instrument Rating, enabling flight in instrument meteorological conditions (IMC) and expanding operational capabilities.",
    type: "aviation",
  },
];

export const aboutContent = {
  intro: "I'm Noah Berman — a pilot, founder, and builder at the intersection of aviation and technology.",
  mission: "Building things that matter: training pilots, creating technology that connects people, and exploring new frontiers in business and aviation.",
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
