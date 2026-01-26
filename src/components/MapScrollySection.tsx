import { motion, type MotionProps } from "framer-motion";
import { useCallback } from "react";
import { useMapController } from "@/hooks/useMapController";
import type { MapFlyToOptions } from "@/lib/mapController";
import { cn } from "@/lib/utils";

type MapScrollySectionProps = {
  flyTo?: MapFlyToOptions;
  onVisible?: () => void;
  className?: string;
  children: React.ReactNode;
  viewport?: MotionProps["viewport"];
};

export function MapScrollySection({
  flyTo,
  onVisible,
  className,
  children,
  viewport,
}: MapScrollySectionProps) {
  const { flyTo: flyToMap } = useMapController();

  const handleEnter = useCallback(() => {
    if (flyTo) {
      flyToMap(flyTo);
    }
    onVisible?.();
  }, [flyTo, flyToMap, onVisible]);

  return (
    <motion.div
      className={cn("space-y-4", className)}
      onViewportEnter={handleEnter}
      viewport={viewport ?? { amount: 0.6, margin: "-20% 0px -35% 0px" }}
    >
      {children}
    </motion.div>
  );
}

