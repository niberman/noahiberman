import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ventures } from "@/data/ventures";
import { projects } from "@/data/projects";
import { otherProjects } from "@/data/otherProjects";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ArrowRight } from "lucide-react";

const statusColors = {
  active: "bg-green-500/20 text-green-400 border-green-500/40",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  "in-progress": "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
};

export function VenturesSectionContent() {
  const allProjects = [...projects, ...otherProjects];

  return (
    <div className="space-y-10">
      {/* Main Ventures */}
      <div className="space-y-6">
        {ventures.map((venture, index) => (
          <motion.div
            key={venture.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
          >
            <Link
              to={`/ventures/${venture.id}`}
              className="block group"
            >
              <div className="bg-background/60 rounded-xl sm:rounded-2xl border border-border/40 p-5 sm:p-6 hover:border-secondary/40 hover:shadow-glow transition-all duration-300">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-xl sm:text-2xl font-display font-bold group-hover:text-secondary transition-colors">
                        {venture.title}
                      </h3>
                      <Badge className={`${statusColors[venture.status]} border text-xs px-2 py-0.5`}>
                        {venture.status}
                      </Badge>
                      {venture.isNew && (
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/40 border text-xs px-2 py-0.5">
                          NEW
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{venture.role}</p>
                    <p className="text-xs text-secondary font-display italic">{venture.year}</p>
                  </div>
                  <div className="flex items-center gap-2 text-secondary text-sm font-medium shrink-0">
                    View Details <ArrowRight className="h-4 w-4" />
                  </div>
                </div>

                <p className="text-base text-foreground/90 leading-relaxed mb-4">
                  {venture.description}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {venture.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs px-2.5 py-1 rounded-full"
                    >
                      {tag}
                    </Badge>
                  ))}
                  
                  {venture.link && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(venture.link, "_blank", "noopener,noreferrer");
                      }}
                      className="ml-auto inline-flex items-center gap-1.5 text-xs text-secondary hover:text-secondary/80 transition-colors"
                    >
                      Visit <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Projects subsection */}
      {allProjects.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">
            Projects
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (index * 0.05), duration: 0.3 }}
                className="bg-background/40 rounded-lg border border-border/30 p-4 hover:border-secondary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-primary-foreground">
                    {project.title}
                  </h4>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 shrink-0">
                    {project.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {project.technologies.slice(0, 3).map((tech) => (
                    <span
                      key={tech}
                      className="text-[10px] px-1.5 py-0.5 bg-secondary/10 text-secondary rounded"
                    >
                      {tech}
                    </span>
                  ))}
                  {project.technologies.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{project.technologies.length - 3}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
