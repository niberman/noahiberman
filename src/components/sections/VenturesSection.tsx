import { ventures } from "@/data/ventures";
import { BentoGrid, createBentoItems } from "./BentoGrid";

export function VenturesSectionContent({ variant }: { variant?: "default" | "sidebar" }) {
  // Create bento items from ventures only (no projects)
  const bentoItems = createBentoItems(ventures, [], []);

  return (
    <div className="space-y-6">
      <BentoGrid items={bentoItems} variant={variant} />
    </div>
  );
}
