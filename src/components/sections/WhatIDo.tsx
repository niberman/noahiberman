import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { aboutContent } from "@/data/about";
import { cn } from "@/lib/utils";

interface PillarCardProps {
  area: typeof aboutContent.focusAreas[0];
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}

function PillarCard({ area, isOpen, onToggle, index }: PillarCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <button
        onClick={onToggle}
        className={cn(
          "w-full text-left rounded-xl sm:rounded-2xl border transition-all duration-300",
          "bg-background/60 hover:bg-background/80 shadow-elegant",
          isOpen ? "border-secondary/40" : "border-border/40"
        )}
      >
        <div className="p-4 sm:p-5 md:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-2">
                <h3 className="text-lg sm:text-xl font-semibold text-primary-foreground">
                  {area.title}
                </h3>
                <span className="text-xs font-medium uppercase tracking-wider sm:tracking-widest text-secondary/80">
                  {area.spanish}
                </span>
              </div>
              
              {/* Short description when collapsed */}
              <AnimatePresence mode="wait">
                {!isOpen && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-muted-foreground leading-relaxed text-sm sm:text-base"
                  >
                    {area.description}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <motion.div
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center"
            >
              <ChevronRight className="h-4 w-4 text-secondary" />
            </motion.div>
          </div>

          {/* Expanded content */}
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                className="overflow-hidden"
              >
                <div className="pt-4 border-t border-border/30 mt-4">
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base mb-4">
                    {area.expandedContent}
                  </p>
                  
                  {/* Credentials list for Aviation */}
                  {area.credentials && area.credentials.length > 0 && (
                    <ul className="space-y-2">
                      {area.credentials.map((credential, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2 text-sm text-primary-foreground/90"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-secondary flex-shrink-0" />
                          {credential}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>
    </motion.div>
  );
}

export function WhatIDoContent() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2">
      {aboutContent.focusAreas.map((area, index) => (
        <PillarCard
          key={area.title}
          area={area}
          isOpen={openIndex === index}
          onToggle={() => handleToggle(index)}
          index={index}
        />
      ))}
    </div>
  );
}








