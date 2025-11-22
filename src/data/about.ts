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
    description: "Founded a premium aviation company delivering concierge-level aircraft management and expert flight instruction. Focused on elevating the owner-pilot experience through precision service, modern tools, and ATP-rated professionalism.",
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
    description: "Immersive year abroad in Bilbao, Spain, studying business and Spanish language at the University of Deusto. Lived with a local homestay family, fully engaging in Basque and Spanish daily life while developing strong fluency through academic coursework and real-world interaction. Gained a deep understanding of Spanish and Basque culture, international business practices, and European perspectives.",
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
   id: "instrument-rating",
    year: "2023",
    title: "Instrument Rating",
    description: "Earned Instrument Rating, enabling flight in instrument meteorological conditions (IMC) and expanding operational capabilities.",
    type: "aviation",
  },
  {
     id: "ppl",
    year: "2023",
    title: "Private Pilot License",
    description: "Completed initial flight training and earned Private Pilot certificate. Beginning of aviation journey.",
    type: "aviation",
    
  },
];

export const aboutContent = {
  intro: "I'm Noah Berman — a bilingual pilot, founder, and builder operating where aviation, technology, and culture intersect, building ventures that matter at that crossroads. Based in Colorado, I serve the mountain state's aviation community and beyond.",
  mission: "I launch ventures that deliver real-world impact, empowering people through software, language, and opportunity while creating durable freedom and global reach from the heart of the Rocky Mountains.",
  focusAreas: [
    {
      title: "Aviation",
      spanish: "Aviación",
      description: "Training the next generation of pilots with modern methods and technology in Colorado's unique mountain flying environment.",
    },
    {
      title: "Technology",
      spanish: "Tecnología",
      description: "Building software solutions that solve real problems for real people, from the Colorado tech ecosystem.",
    },
    {
      title: "Cultural Connection",
      spanish: "Conexión Cultural",
      description: "Bridging worlds through bilingual ventures that unite communities across Colorado and beyond.",
    },
    {
      title: "Entrepreneurship",
      spanish: "Emprendimiento",
      description: "Creating ventures that blend passion, purpose, and innovation in Colorado's entrepreneurial landscape.",
    },
  ],
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
