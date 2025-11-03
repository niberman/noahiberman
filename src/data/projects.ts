export interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  year: string;
  technologies: string[];
  link?: string;
  image?: string;
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
];
