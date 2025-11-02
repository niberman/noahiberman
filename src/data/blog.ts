export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  slug: string;
}

export const blogPosts: BlogPost[] = [
  {
    id: "lessons-from-cockpit",
    title: "Lessons from the Cockpit: What Flying Taught Me About Building Startups",
    excerpt: "The parallels between aviation and entrepreneurship are striking. Both require careful planning, quick decision-making, and the ability to stay calm under pressure.",
    date: "2024-01-15",
    readTime: "5 min read",
    category: "Aviation & Business",
    slug: "lessons-from-cockpit",
  },
  {
    id: "founder-mindset",
    title: "The Founder's Mindset: Building with Purpose",
    excerpt: "What does it take to build something from scratch? Reflections on the entrepreneurial journey and staying true to your mission.",
    date: "2023-12-08",
    readTime: "4 min read",
    category: "Entrepreneurship",
    slug: "founder-mindset",
  },
  {
    id: "tech-in-aviation",
    title: "The Future of Flight Training: How Technology is Transforming Aviation Education",
    excerpt: "Modern flight training is being revolutionized by technology. Here's how we're using innovation to create better pilots.",
    date: "2023-11-22",
    readTime: "6 min read",
    category: "Aviation Tech",
    slug: "tech-in-aviation",
  },
];
