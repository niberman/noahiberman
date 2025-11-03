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
    description: "Redefining aircraft ownership with professional management and elite instruction. Tailored programs for pilots who demand precision and performance.",
    role: "Founder & Chief Executive Officer",
    year: "2025 - Present",
    status: "active",
    link: "https://freedomaviationco.com",
    tags: ["Aviation", "Aircraft", "Startup"],
  },
];
