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
    description: "Modern dispatch application for flight schools. Real-time aircraft tracking, scheduling, and student management with intuitive mobile-first design.",
    category: "Aviation Tech",
    year: "2023",
    technologies: ["React", "TypeScript", "Firebase", "Tailwind CSS"],
    link: "#",
  },
];
