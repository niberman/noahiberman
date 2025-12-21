import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { Venture } from "@/data/ventures";
import { cn } from "@/lib/utils";

type BentoSize = "small" | "medium" | "large";

interface BentoCardProps {
  item: Venture;
  size: BentoSize;
  index: number;
}

const statusColors = {
  active: "bg-green-500/20 text-green-400 border-green-500/40",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  "in-progress": "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
};

export function BentoCard({ item, size, index }: BentoCardProps) {
  const venture = item;
  const logo = venture.logo;

  // Grid span classes based on size
  const sizeClasses = {
    large: "sm:col-span-2 sm:row-span-2",
    medium: "sm:col-span-2 sm:row-span-1",
    small: "col-span-1 row-span-1",
  };

  // Content wrapper - ventures with links open in new tab
  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (venture.link) {
      return (
        <a 
          href={venture.link} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="block h-full group"
        >
          {children}
        </a>
      );
    }
    return <div className="h-full group">{children}</div>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
      className={cn(
        "col-span-1",
        sizeClasses[size]
      )}
    >
      <CardWrapper>
        <div
          className={cn(
            "h-full rounded-xl sm:rounded-2xl border border-border/40 p-4 sm:p-5 lg:p-6",
            "bg-gradient-to-br from-background/80 via-background/60 to-background/40",
            "hover:border-secondary/50 hover:shadow-glow transition-all duration-300",
            "backdrop-blur-sm",
            size === "large" && "flex flex-col justify-between"
          )}
        >
          {/* Header */}
          <div className={cn(
            "flex flex-col gap-2",
            size === "large" ? "mb-4 sm:mb-6" : "mb-3"
          )}>
            {/* Title row with logo and badges */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                {logo && size === "large" && (
                  <img 
                    src={logo} 
                    alt={`${item.title} logo`}
                    className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded-lg"
                  />
                )}
                <h3
                  className={cn(
                    "font-display font-bold group-hover:text-secondary transition-colors leading-tight",
                    size === "large" && "text-xl sm:text-2xl lg:text-3xl",
                    size === "medium" && "text-lg sm:text-xl lg:text-2xl",
                    size === "small" && "text-base sm:text-lg"
                  )}
                >
                  {item.title}
                </h3>
              </div>
              
              {/* Status badge */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge className={cn(statusColors[venture.status], "border text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5")}>
                  {venture.status}
                </Badge>
                {venture.isNew && (
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/40 border text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                    NEW
                  </Badge>
                )}
              </div>
            </div>

            {/* Role/Year */}
            <div className={cn(
              "flex flex-col gap-0.5",
              size === "small" && "hidden sm:flex"
            )}>
              <p className="text-xs sm:text-sm text-muted-foreground">{venture.role}</p>
              <p className="text-xs text-secondary font-display italic">{venture.year}</p>
            </div>
          </div>

          {/* Description */}
          <p
            className={cn(
              "text-foreground/90 leading-relaxed",
              size === "large" && "text-sm sm:text-base lg:text-lg mb-4 sm:mb-6 flex-1",
              size === "medium" && "text-sm sm:text-base mb-3 sm:mb-4 line-clamp-3",
              size === "small" && "text-xs sm:text-sm mb-3 line-clamp-2"
            )}
          >
            {item.description}
          </p>

          {/* Footer */}
          <div className="mt-auto">
            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {venture.tags.slice(0, size === "small" ? 2 : size === "medium" ? 4 : 6).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className={cn(
                    "rounded-full",
                    size === "small" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 sm:px-2.5 py-0.5 sm:py-1"
                  )}
                >
                  {tag}
                </Badge>
              ))}
              
              {venture.tags.length > (size === "small" ? 2 : size === "medium" ? 4 : 6) && (
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  +{venture.tags.length - (size === "small" ? 2 : size === "medium" ? 4 : 6)}
                </span>
              )}
            </div>

            {/* Action links */}
            <div className={cn(
              "flex items-center justify-between mt-3 sm:mt-4",
              size === "small" && "mt-2"
            )}>
              {venture.link && (
                <div className="flex items-center gap-2 text-secondary text-xs sm:text-sm font-medium">
                  Visit <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardWrapper>
    </motion.div>
  );
}
