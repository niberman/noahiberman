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
    title: "Flight Dispatch System",
    description: "Modern dispatch application for flight schools. Real-time aircraft tracking, scheduling, and student management with intuitive mobile-first design.",
    category: "Aviation Tech",
    year: "2023",
    technologies: ["React", "TypeScript", "Firebase", "Tailwind CSS"],
    link: "#",
  },
  {
    id: "preflight-tool",
    title: "Pre-Flight Planning Tool",
    description: "Comprehensive flight planning application with weather integration, weight & balance calculations, and automated briefing generation.",
    category: "Aviation Tools",
    year: "2023",
    technologies: ["Next.js", "API Integration", "Charts.js"],
    link: "#",
  },
  {
    id: "music-platform",
    title: "Music Discovery Platform",
    description: "AI-powered music recommendation engine helping artists connect with their audience through intelligent playlist curation.",
    category: "Music Tech",
    year: "2022",
    technologies: ["Python", "TensorFlow", "React", "PostgreSQL"],
    link: "#",
  },
  {
    id: "logbook-app",
    title: "Digital Pilot Logbook",
    description: "Cloud-based electronic logbook for pilots. Track flight time, endorsements, and currency requirements with automated FAA compliance.",
    category: "Aviation Tools",
    year: "2022",
    technologies: ["React Native", "Node.js", "MongoDB"],
    link: "#",
  },
];
