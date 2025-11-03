export interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  year: string;
  technologies: string[];
  link?: string;
  image?: string;
  ventureLink?: string;
  ventureName?: string;
}

export const projects: Project[] = [
  {
    id: "flight-dispatch",
    title: "Freedom Aviation Dashboard",
    description: "Smart management platform for aircraft owners and pilots. Streamlined scheduling, maintenance tracking, and concierge coordination through a modern, intuitive dashboard.",
    category: "Aviation Tech",
    year: "2025",
    technologies: ["React", "TypeScript", "Vercel", "Tailwind CSS"],
    link: "#",
  },
  {
    id: "language-school-platform",
    title: "Language School Platform",
    description: "Web and mobile platform digitizing The Language School's curriculum. Integrates video lessons, AI conversation partner, homework correction, and bilingual job-matching feed.",
    category: "EdTech / AI",
    year: "2025",
    technologies: ["React", "TypeScript", "Supabase", "OpenAI API", "Vercel"],
    link: "https://app.thelanguageschool.us",
    ventureLink: "https://thelanguageschool.us",
    ventureName: "The Language School",
  },
];
