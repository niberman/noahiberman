import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plane, MapPin } from "lucide-react";
import { useFlightStats } from "@/hooks/use-flight-stats";

export function FollowFlightSectionContent() {
  const { stats } = useFlightStats();
  const enableMapInteraction = () => {
    window.dispatchEvent(new CustomEvent("enableFlightMapInteractive"));
  };

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 sm:p-5 shadow-glow"
        >
          <div className="flex flex-col items-center text-center gap-2">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-secondary/20 flex items-center justify-center mb-1">
              <Plane className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-primary-foreground">
                {stats.totalHoursDisplay}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Total Hours</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 sm:p-5 shadow-glow"
        >
          <div className="flex flex-col items-center text-center gap-2">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-secondary/20 flex items-center justify-center mb-1">
              <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-primary-foreground">
                {stats.totalFlightsDisplay}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Total Flights</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Experience badges */}
      <div className="flex flex-wrap gap-2 justify-center py-2">
        <span className="px-3 py-1.5 bg-secondary/20 text-secondary border border-secondary/30 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap shadow-[0_0_15px_rgba(var(--secondary),0.3)]">
          Commercial Pilot
        </span>
        <span className="px-3 py-1.5 bg-secondary/20 text-secondary border border-secondary/30 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap shadow-[0_0_15px_rgba(var(--secondary),0.3)]">
          Instrument Rated
        </span>
        <span className="px-3 py-1.5 bg-secondary/20 text-secondary border border-secondary/30 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap shadow-[0_0_15px_rgba(var(--secondary),0.3)]">
          Helicopter Private Pilot
        </span>
        <span className="px-3 py-1.5 bg-secondary/20 text-secondary border border-secondary/30 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap shadow-[0_0_15px_rgba(var(--secondary),0.3)]">
          Multi-Engine
        </span>
      </div>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="flex justify-center pt-2"
      >
        <Button
          onClick={enableMapInteraction}
          size="lg"
          className="w-full sm:w-auto bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-glow rounded-full px-10 py-6 text-base sm:text-lg font-medium transition-all hover:scale-105 active:scale-95"
        >
          <MapPin className="mr-2 h-5 w-5" />
          Explore Flight Map
        </Button>
      </motion.div>
    </div>
  );
}




