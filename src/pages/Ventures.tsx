import { motion } from "framer-motion";
import { ventures } from "@/data/ventures";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function Ventures() {
  const statusColors = {
    active: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
    completed: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
    "in-progress": "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  };

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6">Ventures</h1>
          <p className="text-xl text-muted-foreground">
            Building companies and projects that combine innovation with impact.
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto space-y-8">
          {ventures.map((venture, index) => (
            <motion.div
              key={venture.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-2xl shadow-elegant hover:shadow-glow transition-all duration-300 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-3xl font-bold">{venture.title}</h2>
                      <Badge className={`${statusColors[venture.status]} border`}>
                        {venture.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mb-2">{venture.role}</p>
                    <p className="text-sm text-muted-foreground">{venture.year}</p>
                  </div>
                  
                  {venture.link && (
                    <Button asChild variant="outline" className="shrink-0">
                      <a href={venture.link} target="_blank" rel="noopener noreferrer">
                        Visit <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>

                <p className="text-lg mb-6">{venture.description}</p>

                <div className="flex flex-wrap gap-2">
                  {venture.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
