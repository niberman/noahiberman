import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import { ventures } from "@/data/ventures";
import { projects } from "@/data/projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowLeft, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BilingualHeading } from "@/components/BilingualHeading";
import NotFound from "./NotFound";

export default function VentureDetail() {
  const { id } = useParams<{ id: string }>();
  const venture = ventures.find((v) => v.id === id);

  if (!venture) {
    return <NotFound />;
  }

  // Filter projects by ventureId
  const relatedProjects = projects.filter((p) => p.ventureId === id);

  const statusColors = {
    active: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/40",
    completed: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/40",
    "in-progress": "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/40",
  };

  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="container mx-auto px-4">
        {/* Breadcrumbs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/ventures" className="hover:text-secondary transition-colors">
              Ventures
            </Link>
            <span>/</span>
            <span className="text-foreground">{venture.title}</span>
          </nav>
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Button
            asChild
            variant="ghost"
            className="gap-2 hover:text-secondary"
          >
            <Link to="/ventures">
              <ArrowLeft className="h-4 w-4" />
              Back to Ventures
            </Link>
          </Button>
        </motion.div>

        {/* Venture Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mb-16"
        >
          <div className="bg-gradient-card rounded-3xl shadow-elegant border border-border/50 p-10 md:p-12">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3 flex-wrap">
                  <h1 className="text-5xl font-display font-bold">
                    {venture.title}
                  </h1>
                  <Badge className={`${statusColors[venture.status]} border text-sm px-3 py-1`}>
                    {venture.status}
                  </Badge>
                  {venture.isNew && (
                    <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/40 border text-sm px-3 py-1">
                      NEW
                    </Badge>
                  )}
                </div>
                <p className="text-xl text-muted-foreground mb-2">{venture.role}</p>
                <p className="text-lg text-secondary font-display italic mb-2">{venture.year}</p>
                {venture.subtitleEn && venture.subtitleEs && (
                  <div className="mb-4">
                    <p className="text-xl text-muted-foreground italic">{venture.subtitleEn}</p>
                    <p className="text-lg text-secondary font-display italic">{venture.subtitleEs}</p>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-end gap-2 shrink-0">
                {venture.link && (
                  <Button 
                    asChild 
                    variant="secondary"
                    size="lg"
                    className="rounded-full hover:scale-105 transition-transform"
                  >
                    <a href={venture.link} target="_blank" rel="noopener noreferrer">
                      Visit <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
                {venture.companyLink && (
                  <a
                    href={venture.companyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Company Website <ExternalLink className="inline ml-1 h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            <p className="text-xl mb-8 leading-relaxed text-foreground/90">
              {venture.description}
            </p>

            <div className="flex flex-wrap gap-3">
              {venture.tags.map((tag) => (
                <Badge 
                  key={tag} 
                  variant="secondary"
                  className="text-sm px-4 py-2 rounded-full"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Related Projects Section */}
        {relatedProjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-6xl mx-auto"
          >
            <BilingualHeading 
              english="Related Projects"
              spanish="Proyectos Relacionados"
              className="mb-12"
            />
            
            <div className="grid md:grid-cols-2 gap-8">
              {relatedProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <Card className="h-full bg-gradient-card border-border/50 hover:shadow-glow transition-all duration-500 hover:scale-[1.02] group">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-sm px-3 py-1">
                            {project.category}
                          </Badge>
                          {project.featured && (
                            <Badge className="bg-secondary/20 text-secondary border-secondary/40 text-xs px-2 py-1">
                              Featured
                            </Badge>
                          )}
                        </div>
                        <span className="text-base text-secondary font-display italic">
                          {project.year}
                        </span>
                      </div>
                      <CardTitle className="text-2xl font-display group-hover:text-secondary transition-colors">
                        {project.title}
                      </CardTitle>
                      <CardDescription className="text-base leading-relaxed mt-2">
                        {project.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                            Technologies:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {project.technologies.map((tech) => (
                              <Badge 
                                key={tech} 
                                variant="secondary" 
                                className="text-xs px-2 py-1 rounded-full"
                              >
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        {project.link && (
                          <a
                            href={project.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-secondary hover:underline font-medium group-hover:translate-x-1 transition-transform"
                          >
                            View Project <ArrowRight className="ml-2 h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* No Related Projects Message */}
        {relatedProjects.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="max-w-4xl mx-auto text-center py-12"
          >
            <p className="text-lg text-muted-foreground">
              No related projects yet. Check back soon!
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

