import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, Radio, Navigation } from "lucide-react";
import { useCurrentFlight } from "@/hooks/use-supabase-flights";
import { useAircraftPositionPolling } from "@/hooks/use-aircraft-position";
import type { AircraftPosition } from "@/lib/aircraft-position";

export function LiveFlightIndicator() {
  const { data: currentFlight, isLoading } = useCurrentFlight();
  const [aircraftPosition, setAircraftPosition] = useState<AircraftPosition | null>(null);

  useAircraftPositionPolling(
    currentFlight?.tail_number,
    currentFlight?.flight_status === "in_flight",
    setAircraftPosition,
  );

  if (isLoading || !currentFlight || currentFlight.flight_status !== "in_flight") {
    return null;
  }

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, x: 100, scale: 0.8 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="fixed top-[72px] sm:top-20 md:top-24 right-2 sm:right-4 z-[105] w-44 sm:w-48 md:w-56"
      >
        <Card className="bg-gradient-to-br from-green-500/95 via-green-600/95 to-green-700/95 backdrop-blur-xl border-2 border-green-400/50 shadow-2xl overflow-hidden">
          {/* Animated background effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />

          {/* Pulsing glow effect */}
          <div className="absolute -inset-1 bg-green-400 blur-xl opacity-30 animate-pulse" />

          <div className="relative p-2.5 sm:p-3">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-white rounded-full blur-sm animate-pulse" />
                <div className="relative bg-white/20 p-1 sm:p-1.5 rounded-full backdrop-blur-sm">
                  <Plane className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" style={{ transform: `rotate(${aircraftPosition?.heading || 0}deg)` }} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <Radio className="h-2 w-2 text-white animate-pulse flex-shrink-0" />
                  <span className="text-[9px] sm:text-[10px] font-bold text-white/90 tracking-wider uppercase truncate">Flying</span>
                </div>
                <p className="font-mono text-xs sm:text-sm font-black text-white tracking-wide truncate">
                  {currentFlight.tail_number}
                </p>
              </div>
            </div>

            {/* Flight Data - Compact */}
            {aircraftPosition && (
              <div className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Alt</span>
                  <span className="font-bold text-white">{aircraftPosition.altitude.toLocaleString()} ft</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Speed</span>
                  <span className="font-bold text-white">{Math.round(aircraftPosition.speed)} kts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Hdg</span>
                  <span className="font-bold text-white">{Math.round(aircraftPosition.heading)}°</span>
                </div>
              </div>
            )}

            {/* Status bar */}
            <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between">
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] h-auto">
                <Navigation className="h-2 w-2 mr-0.5 sm:mr-1" />
                <span className="font-bold">LIVE</span>
              </Badge>
              <div className="flex items-center gap-1">
                <div className="h-1 w-1 bg-white rounded-full animate-pulse" />
                <div className="h-1 w-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="h-1 w-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        </Card>
      </m.div>
    </AnimatePresence>
  );
}
