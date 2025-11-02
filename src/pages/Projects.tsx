import { motion } from "framer-motion";
import { projects } from "@/data/projects";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { BilingualHeading } from "@/components/BilingualHeading";

export default function Projects() {
  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mb-20"
        >
          <BilingualHeading 
            english="Projects"
            spanish="Proyectos"
            as="h1"
            className="mb-6"
          />
          <p className="text-xl text-muted-foreground leading-relaxed">
            Side projects and experiments in aviation tech, music, and beyond.
          </p>
        </motion.div>

        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
            >
              <Card className="h-full bg-gradient-card border-border/50 hover:shadow-glow transition-all duration-500 hover:scale-[1.02] group">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      {project.category}
                    </Badge>
                    <span className="text-base text-secondary font-display italic">
                      {project.year}
                    </span>
                  </div>
                  <CardTitle className="text-3xl font-display group-hover:text-secondary transition-colors">
                    {project.title}
                  </CardTitle>
                  <CardDescription className="text-lg leading-relaxed mt-2">
                    {project.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                        Technologies:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {project.technologies.map((tech) => (
                          <Badge 
                            key={tech} 
                            variant="secondary" 
                            className="text-sm px-3 py-1 rounded-full"
                          >
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {project.link && (
                      <a
                        href={project.link}
                        className="inline-flex items-center text-base text-secondary hover:underline font-medium group-hover:translate-x-1 transition-transform"
                      >
                        View Project <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
