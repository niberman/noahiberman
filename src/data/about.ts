export interface TimelineItem {
  id: string;
  year: string;
  title: string;
  description: string;
  type: "aviation" | "business" | "education" | "personal";
}

export const timeline: TimelineItem[] = [
  {
    id: "cpl",
    year: "2023",
    title: "FAA Commercial Pilot License",
    description: "Earned Commercial Pilot certification with Instrument and Multi-Engine ratings. Authorized to fly professionally.",
    type: "aviation",
  },
  {
    id: "freedom-aviation-launch",
    year: "2022",
    title: "Founded Freedom Aviation",
    description: "Launched a modern flight training organization focused on personalized instruction and innovative teaching methods.",
    type: "business",
  },
  {
    id: "spain-experience",
    year: "2021",
    title: "Studied in Spain",
    description: "Immersive experience studying business and Spanish culture in Madrid. Expanded global perspective and cross-cultural communication skills.",
    type: "education",
  },
  {
    id: "puente-launch",
    year: "2021",
    title: "Co-Founded Puente",
    description: "Built communication platform connecting communities across borders, focusing on language accessibility.",
    type: "business",
  },
  {
    id: "ppl",
    year: "2020",
    title: "Private Pilot License",
    description: "Completed initial flight training and earned Private Pilot certificate. Beginning of aviation journey.",
    type: "aviation",
  },
  {
    id: "uniquench-launch",
    year: "2020",
    title: "Founded UniQuench",
    description: "Created sustainable hydration solution for college campuses. First entrepreneurial venture.",
    type: "business",
  },
];

export const aboutContent = {
  intro: "I'm Noah Berman — a pilot, founder, and builder at the intersection of aviation and technology.",
  mission: "I believe in building things that matter, whether it's training the next generation of pilots, creating technology that connects people, or exploring new frontiers in business and aviation.",
  spanishStory: {
    title: "The Spanish Chapter",
    subtitle: "El Capítulo Español",
    content: "Living and studying in Spain wasn't just an academic experience—it was a transformation. Immersed in Madrid's vibrant culture, I learned to think in two languages, see through two perspectives, and connect across two worlds. The Spanish approach to life—passionate, present, and deeply human—fundamentally shaped how I build businesses and connect with people. This cross-cultural fluency inspired Puente, my venture focused on bridging communication gaps, and continues to influence how I approach every project with warmth and cultural awareness.",
  },
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
