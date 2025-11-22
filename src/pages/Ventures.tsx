import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ventures } from "@/data/ventures";
import { projects } from "@/data/projects";
import { otherProjects } from "@/data/otherProjects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowRight } from "lucide-react";
import { BilingualHeading } from "@/components/BilingualHeading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO } from "@/components/SEO";

export default function Ventures() {
  const statusColors = {
    active: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/40",
    completed: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/40",
    "in-progress": "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/40",
  };

  // Combine all projects (venture-related and independent)
  const allProjects = [...projects, ...otherProjects];

  return (
    <div className="pt-8 sm:pt-12 md:pt-16 lg:pt-20 pb-16 sm:pb-20 md:pb-24 lg:pb-32">
      <SEO
        title="Ventures & Projects — Freedom Aviation, The Language School | Colorado Aviation & Tech"
        description="Explore Noah Berman's ventures including Freedom Aviation (premium aircraft management & flight instruction in Colorado) and The Language School (AI-powered bilingual workforce platform). Building technology solutions that bridge aviation, education, and culture."
        keywords="Freedom Aviation Colorado, aircraft management Colorado, flight instruction Colorado, The Language School, bilingual education platform, aviation startup Colorado, technology ventures, aviation technology, aircraft services Colorado, flight training business, bilingual workforce, AI education platform, Colorado tech startups"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Ventures & Projects",
          "description": "Portfolio of ventures and projects by Noah Berman",
          "url": "https://noahberman.com/ventures",
          "hasPart": ventures.map(venture => ({
            "@type": "Organization",
            "name": venture.title,
            "description": venture.description,
            "url": venture.link,
            "founder": {
              "@type": "Person",
              "name": "Noah Berman"
            }
          }))
        }}
      />
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mb-12 sm:mb-14 md:mb-16"
        >
          <BilingualHeading 
            english="Ventures"
            spanish="Proyectos"
            as="h1"
            className="mb-4 sm:mb-6"
          />
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
            Building companies and projects that combine innovation with impact.
          </p>
        </motion.div>

        {/* Section 1: Big Ventures */}
        <div className="max-w-6xl mx-auto mb-16 sm:mb-18 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8 sm:mb-10 md:mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-display font-bold mb-2">Main Ventures</h2>
            <p className="text-base sm:text-lg text-muted-foreground">Building companies that make a difference</p>
          </motion.div>

          <div className="space-y-8 sm:space-y-10 md:space-y-12">
            {ventures.map((venture, index) => {
              // Count projects for this venture
              const projectCount = projects.filter((p) => p.ventureId === venture.id).length;
              
              return (
              <motion.div
                key={venture.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: index * 0.15, duration: 0.6 }}
                className="group"
              >
                <Link to={`/ventures/${venture.id}`} className="block">
                  <div className="bg-gradient-card rounded-2xl sm:rounded-3xl shadow-elegant hover:shadow-glow transition-all duration-500 overflow-hidden border border-border/50 active:scale-[0.98] md:hover:scale-[1.01] cursor-pointer">
                    <div className="p-6 sm:p-8 md:p-10 lg:p-12">
                      <div className="flex flex-col gap-6 mb-6">
                        <div className="flex-1">
                          <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-3 flex-wrap">
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold group-hover:text-secondary transition-colors">
                              {venture.title}
                            </h2>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={`${statusColors[venture.status]} border text-xs sm:text-sm px-2.5 sm:px-3 py-0.5 sm:py-1`}>
                                {venture.status}
                              </Badge>
                              {venture.isNew && (
                                <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/40 border text-xs sm:text-sm px-2.5 sm:px-3 py-0.5 sm:py-1">
                                  NEW
                                </Badge>
                              )}
                              {projectCount > 0 && (
                                <Badge className="bg-secondary/20 text-secondary border-secondary/40 border text-xs sm:text-sm px-2.5 sm:px-3 py-0.5 sm:py-1">
                                  {projectCount} {projectCount === 1 ? 'Project' : 'Projects'}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-base sm:text-lg text-muted-foreground mb-2">{venture.role}</p>
                          <p className="text-sm sm:text-base text-secondary font-display italic mb-2">{venture.year}</p>
                          {venture.subtitleEn && venture.subtitleEs && (
                            <div className="mb-2">
                              <p className="text-base sm:text-lg text-muted-foreground italic">{venture.subtitleEn}</p>
                              <p className="text-sm sm:text-base text-secondary font-display italic">{venture.subtitleEs}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div className="flex items-center gap-2 text-secondary font-medium text-sm sm:text-base">
                            View Details <ArrowRight className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                            {venture.link && (
                              <a
                                href={venture.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center px-5 sm:px-6 py-2.5 sm:py-3 rounded-full border border-border hover:bg-accent active:scale-95 transition-all text-sm font-medium"
                              >
                                Visit <ExternalLink className="ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </a>
                            )}
                            {venture.companyLink && (
                              <a
                                href={venture.companyLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                              >
                                Company Website <ExternalLink className="inline ml-1 h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-lg sm:text-xl mb-6 sm:mb-8 leading-relaxed text-foreground/90">
                        {venture.description}
                      </p>

                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        {venture.tags.map((tag) => (
                          <Badge 
                            key={tag} 
                            variant="secondary"
                            className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
              );
            })}
          </div>
        </div>

        {/* Section 2: All Projects */}
        {allProjects.length > 0 && (
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8 sm:mb-10 md:mb-12"
            >
              <BilingualHeading 
                english="Projects"
                spanish="Proyectos"
                as="h2"
                className="mb-2"
              />
              <p className="text-base sm:text-lg text-muted-foreground">Platforms, applications, and experiments</p>
            </motion.div>

            <div className="grid gap-6 sm:gap-8 sm:grid-cols-2">
              {allProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <Card className="h-full bg-gradient-card border-border/50 hover:shadow-glow transition-all duration-500 active:scale-[0.98] md:hover:scale-[1.02] group">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div className="flex items-start sm:items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs sm:text-sm px-2.5 sm:px-3 py-0.5 sm:py-1">
                            {project.category}
                          </Badge>
                          {!project.ventureId && (
                            <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/40 text-xs px-2 py-0.5 sm:py-1">
                              Independent
                            </Badge>
                          )}
                          {project.featured && (
                            <Badge className="bg-secondary/20 text-secondary border-secondary/40 text-xs px-2 py-0.5 sm:py-1">
                              Featured
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm sm:text-base text-secondary font-display italic shrink-0">
                          {project.year}
                        </span>
                      </div>
                      <CardTitle className="text-xl sm:text-2xl font-display group-hover:text-secondary transition-colors">
                        {project.title}
                      </CardTitle>
                      <CardDescription className="text-sm sm:text-base leading-relaxed mt-2">
                        {project.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {project.ventureName && (
                          <div className="mb-2">
                            <Badge variant="secondary" className="text-xs px-2 py-0.5 sm:py-1">
                              {project.ventureName}
                            </Badge>
                          </div>
                        )}
                        <div>
                          <p className="text-xs sm:text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                            Technologies:
                          </p>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {project.technologies.map((tech) => (
                              <Badge 
                                key={tech} 
                                variant="secondary" 
                                className="text-xs px-2 py-0.5 sm:py-1 rounded-full"
                              >
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
