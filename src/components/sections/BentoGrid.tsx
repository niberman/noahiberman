import { Venture } from "@/data/ventures";
import { BentoCard } from "./BentoCard";
import { CaseStudyCard } from "./CaseStudyCard";

type BentoSize = "small" | "medium" | "large";

export interface BentoItem {
  id: string;
  size: BentoSize;
  data: Venture;
  isCaseStudy?: boolean;
  logo?: string;
}

interface BentoGridProps {
  items: BentoItem[];
  variant?: "default" | "sidebar";
}

export function BentoGrid({ items, variant = "default" }: BentoGridProps) {
  const isSidebar = variant === "sidebar";
  return (
    <div
      className={
        isSidebar
          ? "flex flex-col gap-4"
          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 auto-rows-[minmax(180px,auto)]"
      }
    >
      {items.map((item, index) => {
        // Render CaseStudyCard for case study items
        if (item.isCaseStudy) {
          return (
            <CaseStudyCard
              key={item.id}
              venture={item.data}
              index={index}
              variant={variant}
            />
          );
        }

        // Render regular BentoCard
        return (
          <BentoCard
            key={item.id}
            item={item.data}
            size={item.size}
            index={index}
            variant={variant}
          />
        );
      })}
    </div>
  );
}

// Helper function to create BentoItems from ventures
export function createBentoItems(
  ventures: Venture[],
  _projects: unknown[] = [],
  _otherProjects: unknown[] = []
): BentoItem[] {
  return ventures.map((v) => ({
    id: v.id,
    size: v.size || "medium",
    data: v,
    isCaseStudy: v.isCaseStudy,
    logo: v.logo,
  }));
}
