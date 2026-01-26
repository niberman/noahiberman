import { motion } from "framer-motion";
import { aboutContent, groupedTimeline } from "@/data/about";
import { cn } from "@/lib/utils";

const typeColors = {
  aviation: "bg-secondary/20 text-secondary border-secondary/40",
  business: "bg-primary/20 text-primary border-primary/40",
  education: "bg-accent/20 text-accent border-accent/40",
  personal: "bg-muted text-muted-foreground border-muted-foreground/40",
};

export function AboutMeContent({ variant }: { variant?: "default" | "sidebar" }) {
  const isSidebar = variant === "sidebar";
  return (
    <div className={cn(isSidebar ? "space-y-6" : "space-y-8 sm:space-y-10")}>
      {/* Bio paragraph */}
      <div className="space-y-4">
        <p
          className={cn(
            "text-foreground/90 leading-relaxed",
            isSidebar ? "text-base" : "text-lg sm:text-xl"
          )}
        >
          {aboutContent.expandedBio}
        </p>
      </div>

      {/* Timeline grouped by category */}
      <div className={cn(isSidebar ? "space-y-6" : "space-y-8")}>
        <h3
          className={cn(
            "font-display font-semibold text-primary-foreground",
            isSidebar ? "text-lg" : "text-xl sm:text-2xl"
          )}
        >
          My Journey
        </h3>

        {Object.entries(groupedTimeline).map(([category, items], categoryIndex) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: categoryIndex * 0.1, duration: 0.4 }}
            className={cn(isSidebar ? "space-y-3" : "space-y-4")}
          >
            {/* Category header */}
            <h4 className={cn(
              "font-semibold text-secondary flex items-center gap-3",
              isSidebar ? "text-base" : "text-lg"
            )}>
              <span className="h-px flex-1 bg-border/50 max-w-8" />
              {category}
              <span className="h-px flex-1 bg-border/50" />
            </h4>

            {/* Timeline items */}
            <div className={cn(
              "space-y-3 border-l-2 border-secondary/30",
              isSidebar ? "pl-3" : "pl-4"
            )}>
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (categoryIndex * 0.1) + (index * 0.05), duration: 0.3 }}
                  className="relative pl-4"
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-[9px] top-2 w-3 h-3 bg-secondary rounded-full border-2 border-background" />
                  
                  <div className="flex flex-wrap items-baseline gap-2 mb-1">
                    <span className="text-sm font-bold text-secondary">{item.year}</span>
                    <span className="text-sm text-muted-foreground">–</span>
                    <span className="text-base font-semibold text-primary-foreground">{item.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Current totals note */}
        <div className="bg-secondary/10 rounded-xl p-4 border border-secondary/20">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-secondary">Current totals:</span> 513.2+ hours, 292+ flights
          </p>
        </div>
      </div>
    </div>
  );
}












