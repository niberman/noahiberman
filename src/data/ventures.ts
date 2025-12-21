export interface Venture {
  id: string;
  title: string;
  description: string;
  role: string;
  year: string;
  status: "active" | "completed" | "in-progress";
  link?: string;
  companyLink?: string; // Secondary link to company website (not highlighted)
  tags: string[];
  subtitleEn?: string;
  subtitleEs?: string;
  isNew?: boolean;
  logo?: string; // Path to venture logo
  size?: "small" | "medium" | "large"; // Card size in bento grid
  isCaseStudy?: boolean; // Whether to render as case study card
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
    logo: "/freedom-aviation.png",
    size: "large",
  },
  {
    id: "language-school",
    title: "The Language School",
    description: "Partnered with The Language School to digitize its proven English-fluency curriculum and build an AI-driven bilingual workforce platform connecting Spanish-speaking adults with U.S. employers. Product delivered",
    role: "Technical Co-Founder",
    year: "2025",
    status: "completed",
    link: "https://lang-school-connect-david2792.replit.app",
    companyLink: "https://thelanguageschool.us",
    tags: ["Education", "AI", "Bilingual", "Startup"],
    subtitleEn: "Transforming language learning into opportunity.",
    subtitleEs: "Transformando el aprendizaje en oportunidades.",
    logo: "/language-school.png",
    size: "large",
  },
];
