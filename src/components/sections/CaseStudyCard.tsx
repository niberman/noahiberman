import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowRight } from "lucide-react";
import { Venture } from "@/data/ventures";
import { cn } from "@/lib/utils";

interface CaseStudyCardProps {
  venture: Venture;
  index: number;
}

const statusColors = {
  active: "bg-green-500/20 text-green-400 border-green-500/40",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  "in-progress": "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
};

export function CaseStudyCard({ venture, index }: CaseStudyCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
      className="col-span-1 sm:col-span-2 row-span-1 sm:row-span-2"
    >
      <div
        className={cn(
          "h-full rounded-xl sm:rounded-2xl border border-border/40",
          "bg-gradient-to-br from-background/80 via-background/60 to-background/40",
          "hover:border-secondary/50 hover:shadow-glow transition-all duration-300",
          "backdrop-blur-sm overflow-hidden",
          "group cursor-pointer"
        )}
        onClick={() => {
          if (venture.link) {
            window.open(venture.link, "_blank", "noopener,noreferrer");
          }
        }}
      >
        {/* Hero Area with Logo */}
        <div className="relative h-32 sm:h-40 lg:h-48 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
                backgroundSize: "24px 24px",
              }}
            />
          </div>

          {/* Logo */}
          {venture.logo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-4 sm:p-6">
                <img
                  src={venture.logo}
                  alt={`${venture.title} logo`}
                  className="max-h-16 sm:max-h-20 lg:max-h-24 w-auto max-w-[200px] sm:max-w-[240px] lg:max-w-[280px] object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </div>
          )}

          {/* Gradient fade at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background/80 to-transparent" />
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 lg:p-6 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Small logo icon */}
              {venture.logo && (
                <img
                  src={venture.logo}
                  alt=""
                  className="h-5 w-5 sm:h-6 sm:w-6 object-contain rounded-sm flex-shrink-0"
                />
              )}
              <h3 className="text-lg sm:text-xl lg:text-2xl font-display font-bold group-hover:text-secondary transition-colors leading-tight">
                {venture.title}
              </h3>
            </div>

            {/* Status badge */}
            <Badge
              className={cn(
                statusColors[venture.status],
                "border text-[10px] sm:text-xs px-2 py-0.5 shrink-0"
              )}
            >
              {venture.year}
            </Badge>
          </div>

          {/* Role */}
          <p className="text-xs sm:text-sm text-muted-foreground mb-3">
            {venture.role}
          </p>

          {/* Description */}
          <p className="text-sm sm:text-base text-foreground/90 leading-relaxed mb-4 flex-1">
            {venture.description}
          </p>

          {/* Tech stack tags */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
            {venture.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] sm:text-xs px-2 py-0.5 bg-secondary/10 text-secondary rounded"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 mt-auto">
            <Button
              size="sm"
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full px-4 sm:px-5 text-xs sm:text-sm"
              onClick={(e) => {
                e.stopPropagation();
                if (venture.link) {
                  window.open(venture.link, "_blank", "noopener,noreferrer");
                }
              }}
            >
              Visit Live Site
              <ArrowRight className="ml-1.5 h-3 w-3 sm:h-4 sm:w-4" />
            </Button>

            {venture.companyLink && venture.companyLink !== venture.link && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(venture.companyLink, "_blank", "noopener,noreferrer");
                }}
                className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground hover:text-secondary transition-colors"
              >
                Company Site <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}







