import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plane, MapPin, ExternalLink } from "lucide-react";
import { flightStats } from "@/data/about";

export function FollowFlightSectionContent() {
  const scrollToMap = () => {
    const mapSection = document.getElementById("flight-map-fullscreen");
    if (mapSection) {
      mapSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-base sm:text-lg text-foreground/90 leading-relaxed">
        Every flight I've taken is logged and visualized on an interactive 3D map. 
        Explore my routes across the country, from local training flights to cross-country adventures.
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

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <Button
          onClick={scrollToMap}
          size="lg"
          className="w-full sm:w-auto bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full px-8 py-6 text-base font-medium"
        >
          <MapPin className="mr-2 h-5 w-5" />
          Open Full Flight Map
        </Button>
      </motion.div>

      {/* Map preview hint */}
      <p className="text-sm text-muted-foreground">
        The flight map is visible as the background throughout this page. 
        Scroll down to the dedicated map section for the full immersive experience.
      </p>
    </div>
  );
}
