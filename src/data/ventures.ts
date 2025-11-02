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
    link: "https://freedomaviationco.com",
    tags: ["Aviation", "Education", "Startup"],
  },
];
