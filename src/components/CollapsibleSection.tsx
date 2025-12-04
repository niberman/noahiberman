import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState, useId } from "react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  collapsedContent: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  id?: string;
}

export function CollapsibleSection({
  title,
  subtitle,
  collapsedContent,
  children,
  defaultOpen = false,
  className,
  id,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();
  const buttonId = useId();

  return (
    <section
      id={id}
      className={cn(
        "py-12 sm:py-16 md:py-20 scroll-mt-24",
        className
      )}
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header with title and toggle */}
          <div className="bg-gradient-card rounded-2xl sm:rounded-3xl shadow-elegant border border-border/50 overflow-hidden">
            <button
              id={buttonId}
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen ? "true" : "false"}
              aria-controls={contentId}
              className="w-full text-left p-6 sm:p-8 md:p-10 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-t-2xl sm:rounded-t-3xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <div className="mb-3 sm:mb-4">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground group-hover:text-secondary/90 transition-colors">
                      {title}
                    </h2>
                    {subtitle && (
                      <p className="text-lg sm:text-xl md:text-2xl text-secondary font-display italic mt-1">
                        {subtitle}
                      </p>
                    )}
                  </div>

                  {/* Collapsed preview */}
                  <AnimatePresence mode="wait">
                    {!isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                          {collapsedContent}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Expand/Collapse button */}
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/30 transition-colors"
                >
                  <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
                </motion.div>
              </div>

              {/* Expand prompt */}
              <motion.div
                animate={{ opacity: isOpen ? 0 : 1 }}
                transition={{ duration: 0.2 }}
                className="mt-4 flex items-center gap-2 text-sm text-secondary/80 font-medium"
              >
                <span>{isOpen ? "Collapse" : "Expand to see more"}</span>
              </motion.div>
            </button>

            {/* Expandable content */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={contentId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                  className="overflow-hidden"
                >
                  <div className="px-6 sm:px-8 md:px-10 pb-6 sm:pb-8 md:pb-10 border-t border-border/30">
                    <div className="pt-6 sm:pt-8">
                      {children}
                    </div>
                  </div>
                  
                  {/* Collapse button at bottom */}
                  <div className="px-6 sm:px-8 md:px-10 pb-6 sm:pb-8">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-sm text-secondary/80 hover:text-secondary font-medium flex items-center gap-2 transition-colors"
                    >
                      <ChevronDown className="h-4 w-4 rotate-180" />
                      Collapse
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}


