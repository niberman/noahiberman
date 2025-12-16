import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plane, MapPin } from "lucide-react";
import { flightStats } from "@/data/about";

export function FollowFlightSectionContent() {
  const enableMapInteraction = () => {
    window.dispatchEvent(new CustomEvent("enableFlightMapInteractive"));
  };

  return (
    <div className="space-y-6">
      <p className="text-base sm:text-lg text-foreground/90 leading-relaxed">
        Every flight I've taken is logged and visualized on an interactive 3D map. 
        The flight map is always visible in the background — scroll to the top or interact with the map behind this page to explore my routes.
      </p>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="bg-background/60 rounded-xl border border-border/40 p-4 sm:p-5"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-secondary/20 flex items-center justify-center">
              <Plane className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Hours</p>
              <p className="text-2xl sm:text-3xl font-bold text-primary-foreground">
                {flightStats.totalHours}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-background/60 rounded-xl border border-border/40 p-4 sm:p-5"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-secondary/20 flex items-center justify-center">
              <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Flights</p>
              <p className="text-2xl sm:text-3xl font-bold text-primary-foreground">
                {flightStats.totalFlights}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Additional flight details */}
      <div className="bg-background/40 rounded-xl border border-border/30 p-4">
        <h4 className="text-sm font-semibold text-primary-foreground mb-3">Flight Experience</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
            Commercial Pilot, Instrument Rated
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
            Helicopter Private Pilot
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
            Commercial Multi-Engine Rating
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
            Mountain flying experience across Colorado
          </li>
        </ul>
      </div>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <Button
          onClick={enableMapInteraction}
          size="lg"
          variant="outline"
          className="w-full sm:w-auto border-secondary/50 text-secondary hover:bg-secondary/10 rounded-full px-8 py-6 text-base font-medium"
        >
          <MapPin className="mr-2 h-5 w-5" />
          Explore Flight Map
        </Button>
      </motion.div>

      {/* Map hint */}
      <p className="text-sm text-muted-foreground">
        💡 The interactive flight map is rendered as the page background. Pinch to zoom, drag to pan, and explore all my flight routes.
      </p>
    </div>
  );
}




