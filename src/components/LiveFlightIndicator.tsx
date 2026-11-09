import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Plane, Navigation } from "lucide-react";
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
        {/* Editorial glass card: the "Live from ForeFlight" pulse dot, serif
            tail number, hairline-ruled readouts. */}
        <div className="relative overflow-hidden rounded-3xl border border-[rgba(180,140,240,.35)] bg-[rgba(4,2,8,.82)] p-3 shadow-[0_0_48px_-12px_rgba(128,51,204,.6)] backdrop-blur-xl sm:p-4">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(240px_circle_at_20%_0%,rgba(128,51,204,.22),transparent_60%)]"
          />
          <div className="relative">
            <div className="mb-2 flex items-center gap-2.5 text-[10px] uppercase tracking-[.26em] text-ed-light sm:text-[11px]">
              <span className="ed-pulse h-[7px] w-[7px] shrink-0 rounded-full bg-ed-light" />
              Flying
              <Plane
                className="ml-auto h-3.5 w-3.5 text-ed-light"
                style={{ transform: `rotate(${aircraftPosition?.heading || 0}deg)` }}
              />
            </div>
            <p className="truncate font-editorial text-[24px] leading-none tracking-[-.01em] text-ed-ink sm:text-[28px]">
              {currentFlight.tail_number}
            </p>

            {aircraftPosition && (
              <div className="mt-3 border-t border-white/[.1] text-[11px] sm:text-xs">
                {[
                  ["Alt", `${aircraftPosition.altitude.toLocaleString()} ft`],
                  ["Speed", `${Math.round(aircraftPosition.speed)} kts`],
                  ["Hdg", `${Math.round(aircraftPosition.heading)}°`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-white/[.08] py-1.5">
                    <span className="uppercase tracking-[.2em] text-ed-muted">{label}</span>
                    <span className="tabular-nums text-ed-ink">{value}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-2.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[.26em] text-ed-muted">
              <Navigation className="h-2.5 w-2.5" />
              Live
            </p>
          </div>
        </div>
      </m.div>
    </AnimatePresence>
  );
}
