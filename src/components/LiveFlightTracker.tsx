import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, Navigation, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

interface FlightInfo {
  tail_number: string;
  flight_status: "on_ground" | "in_flight";
}

export function LiveFlightTracker() {
  const [currentFlight, setCurrentFlight] = useState<FlightInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrentFlight();
    
    // Skip real-time subscription if no supabase connection
    // This prevents WebSocket errors when not authenticated
  }, []);

  const loadCurrentFlight = async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    
    try {
      // Get any flight marked as in_flight
      const { data, error } = await supabase
        .from('current_flight')
        .select('*')
        .eq('flight_status', 'in_flight')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setCurrentFlight(data);
      } else {
        setCurrentFlight(null);
      }
    } catch (error) {
      // Silently fail - this is expected when not authenticated
      setCurrentFlight(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null;
  }

  if (!currentFlight || currentFlight.flight_status !== "in_flight") {
    return null;
  }

  // Generate FlightAware URL
  const flightAwareUrl = `https://flightaware.com/live/flight/${currentFlight.tail_number}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <Card className="bg-gradient-card border-secondary/30 shadow-glow">
        <CardContent className="py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Plane className="h-6 w-6 text-secondary" />
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Currently Flying</p>
                <p className="font-mono font-bold text-xl text-white">
                  {currentFlight.tail_number}
                </p>
              </div>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/40">
              <Navigation className="h-3 w-3 mr-1" />
              Live
            </Badge>
          </div>

          <div className="space-y-3">
            <a
              href={flightAwareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-secondary hover:text-secondary/80 transition-colors"
            >
              <span className="text-sm font-medium">Track on FlightAware</span>
              <ExternalLink className="h-4 w-4" />
            </a>

            {/* FlightAware iframe */}
            <div className="rounded-lg overflow-hidden bg-black/20 p-1">
              <iframe
                src={`https://flightaware.com/live/flight/${currentFlight.tail_number}/tracklog`}
                width="100%"
                height="400"
                frameBorder="0"
                className="rounded"
                title="FlightAware Tracking"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
