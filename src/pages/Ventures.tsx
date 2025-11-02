import { motion } from "framer-motion";
import { ventures } from "@/data/ventures";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { BilingualHeading } from "@/components/BilingualHeading";

export default function Ventures() {
  const statusColors = {
    active: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/40",
    completed: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/40",
    "in-progress": "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/40",
  };

  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mb-20"
        >
          <BilingualHeading 
            english="Ventures"
            spanish="Proyectos"
            as="h1"
            className="mb-6"
          />
          <p className="text-xl text-muted-foreground leading-relaxed">
            Building companies and projects that combine innovation with impact.
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto space-y-12">
          {ventures.map((venture, index) => (
            <motion.div
              key={venture.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.15, duration: 0.6 }}
              className="group"
            >
              <div className="bg-gradient-card rounded-3xl shadow-elegant hover:shadow-glow transition-all duration-500 overflow-hidden border border-border/50 hover:scale-[1.01]">
                <div className="p-10 md:p-12">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3 flex-wrap">
                        <h2 className="text-4xl font-display font-bold group-hover:text-secondary transition-colors">
                          {venture.title}
                        </h2>
                        <Badge className={`${statusColors[venture.status]} border text-sm px-3 py-1`}>
                          {venture.status}
                        </Badge>
                      </div>
                      <p className="text-lg text-muted-foreground mb-2">{venture.role}</p>
                      <p className="text-base text-secondary font-display italic">{venture.year}</p>
                    </div>
                    
                    {venture.link && (
                      <Button 
                        asChild 
                        variant="secondary"
                        size="lg"
                        className="shrink-0 rounded-full group-hover:scale-105 transition-transform"
                      >
                        <a href={venture.link} target="_blank" rel="noopener noreferrer">
                          Visit <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    )}
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
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
