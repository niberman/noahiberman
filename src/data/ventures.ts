export interface Venture {
  id: string;
  title: string;
  description: string;
  role: string;
  year: string;
  status: "active" | "completed" | "in-progress";
  link?: string;
  tags: string[];
  subtitleEn?: string;
  subtitleEs?: string;
  isNew?: boolean;
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
  {
    id: "language-school",
    title: "The Language School",
    description: "Partnered with The Language School to digitize its proven English-fluency curriculum and build an AI-driven bilingual workforce platform connecting Spanish-speaking adults with U.S. employers.",
    role: "Technical Co-Founder",
    year: "2025 – Present",
    status: "active",
    link: "https://thelanguageschool.us",
    tags: ["Education", "AI", "Bilingual", "Startup"],
    subtitleEn: "Transforming language learning into opportunity.",
    subtitleEs: "Transformando el aprendizaje en oportunidades.",
    isNew: true,
  },
];
