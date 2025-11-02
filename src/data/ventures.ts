export interface Venture {
  id: string;
  title: string;
  description: string;
  role: string;
  year: string;
  status: "active" | "completed" | "in-progress";
  link?: string;
  tags: string[];
}

export const ventures: Venture[] = [
  {
    id: "freedom-aviation",
    title: "Freedom Aviation",
    description: "Building the future of flight training with modern technology and personalized instruction. Comprehensive programs from private pilot to commercial certification.",
    role: "Founder & Chief Flight Instructor",
    year: "2022 - Present",
    status: "active",
    link: "https://freedomaviation.com",
    tags: ["Aviation", "Education", "Startup"],
  },
  {
    id: "puente",
    title: "Puente",
    description: "Connecting communities across borders through innovative communication solutions. Bridging language and cultural gaps with technology.",
    role: "Co-Founder",
    year: "2021 - Present",
    status: "active",
    tags: ["Technology", "Social Impact", "Communication"],
  },
  {
    id: "uniquench",
    title: "UniQuench",
    description: "Revolutionizing campus hydration with smart, sustainable water solutions. Making staying hydrated easier and more environmentally friendly.",
    role: "Founder",
    year: "2020 - 2022",
    status: "completed",
    tags: ["Sustainability", "Campus Life", "Hardware"],
  },
];
