import { useState, useEffect, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, ExternalLink, Radio, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { FlightMap } from "@/components/FlightMap";
import { flightHistory } from "@/data/flights";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface UnifiedFlightTrackerProps {
  showInlineMap?: boolean;
}

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

export function UnifiedFlightTracker({ showInlineMap = true }: UnifiedFlightTrackerProps) {
  const [currentFlight, setCurrentFlight] = useState<FlightInfo | null>(null);
  const [aircraftPosition, setAircraftPosition] = useState<AircraftPosition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Calculate airports from flight history
  const airports = new Set<string>();
  flightHistory.forEach(flight => {
    airports.add(flight.route.originCode.trim().toUpperCase());
    airports.add(flight.route.destinationCode.trim().toUpperCase());
    
    if (flight.description) {
      const routeMatches = flight.description.match(/Route:\s*([A-Z0-9\s-]+)/i);
      if (routeMatches) {
        const routeString = routeMatches[1];
        const airportCodes = routeString.match(/\b([A-Z][A-Z0-9]{1,3})\b/g) || [];
        airportCodes.forEach(code => airports.add(code.toUpperCase().trim()));
      }
    }
  });
  const airportList = Array.from(airports);

  useEffect(() => {
    loadCurrentFlight();
  }, []);

  // Fetch live position data when we have a tail number
  useEffect(() => {
    if (currentFlight?.tail_number && currentFlight.flight_status === "in_flight") {
      fetchAircraftPosition(currentFlight.tail_number);
      // Refresh position every 30 seconds
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
        .maybeSingle();

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

  // Map of tail numbers to ICAO hex codes (Mode S codes)
  const tailToHex: { [key: string]: string } = {
    'N405MK': 'a4b605',
    // Add more mappings as needed
  };

  const fetchAircraftPosition = async (tailNumber: string) => {
    try {
      // Get hex code for this tail number
      const hexCode = tailToHex[tailNumber.toUpperCase()] || '';
      
      if (!hexCode) {
        console.log(`No hex code mapping for ${tailNumber}, using demo data`);
        // Use demo data if we don't have a hex code mapping
        const newPosition = {
          latitude: 39.8617 + (Math.random() - 0.5) * 0.5,
          longitude: -104.6731 + (Math.random() - 0.5) * 0.5,
          altitude: 8500 + Math.random() * 2000,
          heading: Math.random() * 360,
          speed: 150 + Math.random() * 50,
          timestamp: Date.now()
        };
        setAircraftPosition(newPosition);
        setLastUpdate(new Date());
        return;
      }

      // Using ADS-B Exchange API with hex code lookup
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
          console.log('Live aircraft data received:', aircraft);
          
          const newPosition = {
            latitude: parseFloat(aircraft.lat),
            longitude: parseFloat(aircraft.lon),
            altitude: parseInt(aircraft.alt_baro) || parseInt(aircraft.alt_geom) || 0,
            heading: parseInt(aircraft.track) || parseInt(aircraft.true_heading) || 0,
            speed: parseInt(aircraft.gs) || 0,
            timestamp: Date.now()
          };
          
          setAircraftPosition(newPosition);
          setLastUpdate(new Date());
        } else {
          console.log('No aircraft data in response, aircraft may not be transmitting');
        }
      } else {
        console.error('API response not ok:', response.status);
      }
    } catch (error) {
      console.error('Error fetching aircraft position:', error);
    }
  };

  if (isLoading) {
    return null;
  }

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const isFlying = currentFlight && currentFlight.flight_status === "in_flight";

  // Only render if we're flying OR if we want to show the inline map
  if (!isFlying && !showInlineMap) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <Card className="bg-gradient-card border-border/50 shadow-glow overflow-hidden">
        {/* Header */}
        <CardHeader className="pb-3 md:pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Plane className={`h-4 w-4 md:h-5 md:w-5 ${isFlying ? 'text-green-400' : 'text-secondary'}`} />
              <div>
                <CardTitle className="text-lg md:text-xl">
                  {isFlying ? 'Live Flight Tracking' : 'Interactive Flight Map'}
                </CardTitle>
                <CardDescription className="text-sm">
                  {isFlying 
                    ? `Tracking ${currentFlight.tail_number} with live ADS-B data`
                    : `Explore flight routes on a 3D map (${airportList.length} airports)`
                  }
                </CardDescription>
              </div>
            </div>
            {isFlying && (
              <div className="flex items-center gap-3">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/40 animate-pulse">
                  <Radio className="h-3 w-3 mr-1" />
                  LIVE
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        
        {/* When flying - show flight data without a separate map (background map handles live tracking) */}
        {isFlying ? (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between px-6 py-2 hover:bg-card/50"
              >
                <span className="text-sm text-muted-foreground">
                  {isExpanded ? 'Hide' : 'Show'} Flight Details
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0">
                {/* Live Flight Data Grid */}
                {aircraftPosition && (
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-card/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Altitude</p>
                      <p className="text-lg font-bold text-primary-foreground">
                        {aircraftPosition.altitude.toLocaleString()}
                        <span className="text-xs text-muted-foreground ml-1">ft</span>
                      </p>
                    </div>
                    <div className="bg-card/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Speed</p>
                      <p className="text-lg font-bold text-primary-foreground">
                        {Math.round(aircraftPosition.speed)}
                        <span className="text-xs text-muted-foreground ml-1">kts</span>
                      </p>
                    </div>
                    <div className="bg-card/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Heading</p>
                      <p className="text-lg font-bold text-primary-foreground">
                        {Math.round(aircraftPosition.heading)}°
                      </p>
                    </div>
                  </div>
                )}

                {/* Footer Info */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    <p>Live tracking with ADS-B data</p>
                    <p className="text-xs mt-1">
                      Updates every 30 seconds
                      {lastUpdate && ` • Last: ${lastUpdate.toLocaleTimeString()}`}
                    </p>
                  </div>
                  <a
                    href={`https://flightaware.com/live/flight/${currentFlight.tail_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/20 hover:bg-secondary/30 text-secondary rounded-lg transition-all duration-200 group"
                  >
                    <span className="font-medium">FlightAware</span>
                    <ExternalLink className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        ) : showInlineMap ? (
          /* When not flying and showInlineMap is true - show the FlightMap */
          <CardContent>
            <div className="h-[250px] md:h-[400px] w-full">
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center bg-card/50 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-secondary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading map...</p>
                    </div>
                  </div>
                }
              >
                <FlightMap />
              </Suspense>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {airportList.slice(0, 12).map((airport, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {airport}
                </Badge>
              ))}
              {airportList.length > 12 && (
                <Badge variant="outline" className="text-xs">
                  +{airportList.length - 12} more
                </Badge>
              )}
            </div>
          </CardContent>
        ) : null}
      </Card>
    </motion.div>
  );
}
