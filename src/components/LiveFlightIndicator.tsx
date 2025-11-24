import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, Radio, Navigation } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface FlightInfo {
  tail_number: string;
  flight_status: "on_ground" | "in_flight";
}

interface AircraftPosition {
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  speed: number;
  timestamp: number;
}

export function LiveFlightIndicator() {
  const [currentFlight, setCurrentFlight] = useState<FlightInfo | null>(null);
  const [aircraftPosition, setAircraftPosition] = useState<AircraftPosition | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrentFlight();
    // Refresh every 30 seconds
    const interval = setInterval(loadCurrentFlight, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentFlight?.tail_number && currentFlight.flight_status === "in_flight") {
      fetchAircraftPosition(currentFlight.tail_number);
      const interval = setInterval(() => {
        fetchAircraftPosition(currentFlight.tail_number);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentFlight]);

  const loadCurrentFlight = async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    
    try {
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
      setCurrentFlight(null);
    } finally {
      setIsLoading(false);
    }
  };

  const tailToHex: { [key: string]: string } = {
    'N405MK': 'a4b605',
  };

  const fetchAircraftPosition = async (tailNumber: string) => {
    try {
      const hexCode = tailToHex[tailNumber.toUpperCase()] || '';
      if (!hexCode) return;

      const response = await fetch(
        `https://adsbexchange-com1.p.rapidapi.com/v2/hex/${hexCode}/`,
        {
          headers: {
            'X-RapidAPI-Key': '311e23f637msh8454e570caa53a6p1a6fc8jsn8a0bf67a91ad',
            'X-RapidAPI-Host': 'adsbexchange-com1.p.rapidapi.com'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.ac && data.ac.length > 0) {
          const aircraft = data.ac[0];
          setAircraftPosition({
            latitude: parseFloat(aircraft.lat),
            longitude: parseFloat(aircraft.lon),
            altitude: parseInt(aircraft.alt_baro) || parseInt(aircraft.alt_geom) || 0,
            heading: parseInt(aircraft.track) || 0,
            speed: parseInt(aircraft.gs) || 0,
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      console.error('Error fetching aircraft position:', error);
    }
  };

  if (isLoading || !currentFlight || currentFlight.flight_status !== "in_flight") {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="fixed top-20 md:top-24 left-1/2 transform -translate-x-1/2 z-50 w-[95%] max-w-md"
      >
        <Card className="bg-gradient-to-br from-green-500/95 via-green-600/95 to-green-700/95 backdrop-blur-xl border-2 border-green-400/50 shadow-2xl overflow-hidden">
          {/* Animated background effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
          
          {/* Pulsing glow effect */}
          <div className="absolute -inset-1 bg-green-400 blur-xl opacity-30 animate-pulse" />
          
          <div className="relative p-4 md:p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-white rounded-full blur-md animate-pulse" />
                  <div className="relative bg-white/20 p-2 rounded-full backdrop-blur-sm">
                    <Plane className="h-5 w-5 text-white" style={{ transform: `rotate(${aircraftPosition?.heading || 0}deg)` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Radio className="h-3 w-3 text-white animate-pulse" />
                    <span className="text-xs font-bold text-white/90 tracking-widest uppercase">Currently Flying</span>
                  </div>
                  <p className="font-mono text-xl md:text-2xl font-black text-white tracking-wider">
                    {currentFlight.tail_number}
                  </p>
                </div>
              </div>
              
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm animate-pulse px-3 py-1">
                <Navigation className="h-3 w-3 mr-1" />
                <span className="font-bold">LIVE</span>
              </Badge>
            </div>

            {/* Flight Data */}
            {aircraftPosition && (
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/20">
                <div className="text-center">
                  <p className="text-xs text-white/70 mb-1">Altitude</p>
                  <p className="text-base md:text-lg font-bold text-white">
                    {aircraftPosition.altitude.toLocaleString()}
                    <span className="text-xs ml-1">ft</span>
                  </p>
                </div>
                <div className="text-center border-x border-white/20">
                  <p className="text-xs text-white/70 mb-1">Speed</p>
                  <p className="text-base md:text-lg font-bold text-white">
                    {Math.round(aircraftPosition.speed)}
                    <span className="text-xs ml-1">kts</span>
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/70 mb-1">Heading</p>
                  <p className="text-base md:text-lg font-bold text-white">
                    {Math.round(aircraftPosition.heading)}°
                  </p>
                </div>
              </div>
            )}

            {/* Status bar */}
            <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
              <span className="text-xs text-white/70">ADS-B Tracking</span>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
                <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
