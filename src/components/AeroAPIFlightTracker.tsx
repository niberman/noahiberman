import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, MapPin, Clock, TrendingUp, Navigation, Radio, Loader2 } from "lucide-react";

const AEROAPI_KEY = "dSls8ESciORvojjeC31GYbtAhMNAZeG1";
const AEROAPI_BASE_URL = "https://aeroapi.flightaware.com/aeroapi";
const REFRESH_INTERVAL = 30000; // 30 seconds

// Get tail number from environment variable (set by you when you start flying)
const TAIL_NUMBER = import.meta.env.VITE_AEROAPI_TAIL_NUMBER || "";

interface FlightData {
  fa_flight_id?: string;
  ident?: string;
  ident_icao?: string;
  ident_iata?: string;
  faa_id?: string;
  airline?: string;
  airline_iata?: string;
  flightnumber?: string;
  tailnumber?: string;
  type?: string;
  codeshares?: string[];
  blocked?: boolean;
  diverted?: boolean;
  cancelled?: boolean;
  origin?: {
    code?: string;
    code_icao?: string;
    code_iata?: string;
    timezone?: string;
    name?: string;
    city?: string;
    airport_info_url?: string;
  };
  destination?: {
    code?: string;
    code_icao?: string;
    code_iata?: string;
    timezone?: string;
    name?: string;
    city?: string;
    airport_info_url?: string;
  };
  departure_delay?: number;
  arrival_delay?: number;
  filed_ete?: number;
  progress_percent?: number;
  status?: string;
  aircraft_type?: string;
  route_distance?: number;
  filed_airspeed?: number;
  filed_altitude?: number;
  route?: string;
  bag_claim?: string;
  gate_origin?: string;
  gate_destination?: string;
  terminal_origin?: string;
  terminal_destination?: string;
  scheduled_out?: string;
  estimated_out?: string;
  actual_out?: string;
  scheduled_off?: string;
  estimated_off?: string;
  actual_off?: string;
  scheduled_on?: string;
  estimated_on?: string;
  actual_on?: string;
  scheduled_in?: string;
  estimated_in?: string;
  actual_in?: string;
  scheduled_out_local?: string;
  estimated_out_local?: string;
  actual_out_local?: string;
  scheduled_off_local?: string;
  estimated_off_local?: string;
  actual_off_local?: string;
  scheduled_on_local?: string;
  estimated_on_local?: string;
  actual_on_local?: string;
  scheduled_in_local?: string;
  estimated_in_local?: string;
  actual_in_local?: string;
  foresight_predictions?: unknown;
}

interface AeroAPIResponse {
  flights?: FlightData[];
}

export function AeroAPIFlightTracker() {
  const [flightData, setFlightData] = useState<FlightData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFlying, setIsFlying] = useState<boolean>(false);

  // Set up polling if tail number is configured
  useEffect(() => {
    if (!TAIL_NUMBER) return;

    // Initial fetch
    fetchFlightData(TAIL_NUMBER);

    // Set up polling
    const interval = setInterval(() => {
      fetchFlightData(TAIL_NUMBER);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const fetchFlightData = async (tail: string) => {
    if (!tail) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${AEROAPI_BASE_URL}/flights/${encodeURIComponent(tail)}`, {
        headers: {
          "x-apikey": AEROAPI_KEY,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No active flight - I'm not flying
          setFlightData(null);
          setError(null);
          setIsFlying(false);
        } else if (response.status === 429) {
          setError("API rate limit exceeded. Please wait a moment.");
          setFlightData(null);
        } else {
          setError(`Error: ${response.status} ${response.statusText}`);
          setFlightData(null);
        }
        setLoading(false);
        return;
      }

      const data: AeroAPIResponse = await response.json();

      if (data.flights && data.flights.length > 0) {
        // Get the most recent/active flight
        const activeFlight = data.flights[0];
        setFlightData(activeFlight);
        setError(null);
        setIsFlying(true);
      } else {
        // No active flight - I'm not flying
        setFlightData(null);
        setError(null);
        setIsFlying(false);
      }
    } catch (err) {
      console.error("Error fetching flight data:", err);
      setError("Failed to fetch flight data. Please check your connection.");
      setFlightData(null);
      setIsFlying(false);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return "N/A";
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return timeString;
    }
  };

  const getStatusBadge = (status?: string, cancelled?: boolean, diverted?: boolean) => {
    if (cancelled) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/40">Cancelled</Badge>;
    }
    if (diverted) {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40">Diverted</Badge>;
    }
    if (!status) {
      return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/40">Unknown</Badge>;
    }
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes("in") || statusLower.includes("active")) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/40 animate-pulse">In Flight</Badge>;
    }
    if (statusLower.includes("scheduled") || statusLower.includes("delayed")) {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40">Scheduled</Badge>;
    }
    return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/40">{status}</Badge>;
  };

  return (
    <Card className="bg-gradient-dusk border-secondary/20 shadow-glow relative overflow-hidden mb-8">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-secondary/20 to-transparent rounded-full blur-3xl" />
      <CardHeader className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
            <Plane className="h-5 w-5 md:h-6 md:w-6 text-secondary animate-float" />
          </div>
          <div>
            <CardTitle className="text-2xl md:text-3xl font-display text-primary-foreground">
              Live Flight Tracking
            </CardTitle>
            <CardDescription className="text-sm md:text-base text-secondary">
              Powered by FlightAware AeroAPI
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4 md:space-y-6">
        {loading && !flightData && (
          <div className="flex items-center justify-center py-6 md:py-8">
            <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-secondary" />
            <span className="ml-2 text-sm md:text-base text-muted-foreground">Loading flight data...</span>
          </div>
        )}

        {error && (
          <div className="p-3 md:p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-xs md:text-sm">{error}</p>
          </div>
        )}

        {flightData && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-primary-foreground mb-1 md:mb-2">
                  {flightData.ident || flightData.tailnumber || "Unknown Flight"}
                </h3>
                {flightData.flightnumber && (
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Flight: {flightData.flightnumber}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0">
                {getStatusBadge(flightData.status, flightData.cancelled, flightData.diverted)}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-start gap-2 md:gap-3">
                  <MapPin className="h-4 w-4 md:h-5 md:w-5 text-secondary flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm text-muted-foreground">Route</p>
                    <p className="text-lg md:text-xl font-bold text-primary-foreground break-words">
                      {flightData.origin?.code || "N/A"} → {flightData.destination?.code || "N/A"}
                    </p>
                    <p className="text-sm md:text-base text-muted-foreground break-words">
                      {flightData.origin?.name || ""} to {flightData.destination?.name || ""}
                    </p>
                  </div>
                </div>

                {flightData.aircraft_type && (
                  <div className="flex items-center gap-2 md:gap-3">
                    <Plane className="h-4 w-4 md:h-5 md:w-5 text-secondary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs md:text-sm text-muted-foreground">Aircraft Type</p>
                      <p className="text-base md:text-lg font-semibold text-primary-foreground break-words">
                        {flightData.aircraft_type}
                      </p>
                    </div>
                  </div>
                )}

                {flightData.route_distance && (
                  <div className="flex items-center gap-2 md:gap-3">
                    <Navigation className="h-4 w-4 md:h-5 md:w-5 text-secondary flex-shrink-0" />
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Distance</p>
                      <p className="text-base md:text-lg font-semibold text-primary-foreground">
                        {flightData.route_distance.toLocaleString()} nm
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 md:space-y-4">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {flightData.filed_altitude && (
                    <div className="bg-card/50 rounded-lg p-3 md:p-4">
                      <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                        <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-secondary flex-shrink-0" />
                        <p className="text-xs text-muted-foreground uppercase tracking-wide truncate">
                          Filed Altitude
                        </p>
                      </div>
                      <p className="text-xl md:text-2xl font-bold text-primary-foreground">
                        {flightData.filed_altitude.toLocaleString()} ft
                      </p>
                    </div>
                  )}

                  {flightData.filed_airspeed && (
                    <div className="bg-card/50 rounded-lg p-3 md:p-4">
                      <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                        <Radio className="h-3 w-3 md:h-4 md:w-4 text-secondary flex-shrink-0" />
                        <p className="text-xs text-muted-foreground uppercase tracking-wide truncate">
                          Filed Speed
                        </p>
                      </div>
                      <p className="text-xl md:text-2xl font-bold text-primary-foreground">
                        {flightData.filed_airspeed} kts
                      </p>
                    </div>
                  )}
                </div>

                {flightData.progress_percent !== undefined && (
                  <div className="bg-card/50 rounded-lg p-3 md:p-4">
                    <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                      <Clock className="h-3 w-3 md:h-4 md:w-4 text-secondary flex-shrink-0" />
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Progress
                      </p>
                    </div>
                    <p className="text-xl md:text-2xl font-bold text-primary-foreground">
                      {flightData.progress_percent.toFixed(0)}%
                    </p>
                    <div className="mt-2 w-full bg-background/50 rounded-full h-1.5 md:h-2">
                      <div
                        className="bg-secondary h-1.5 md:h-2 rounded-full transition-all duration-500"
                        style={{ width: `${flightData.progress_percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {(flightData.estimated_out || flightData.estimated_in) && (
                  <div className="flex items-center gap-2 md:gap-3">
                    <Clock className="h-4 w-4 md:h-5 md:w-5 text-secondary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {flightData.estimated_in ? "Estimated Arrival" : "Estimated Departure"}
                      </p>
                      <p className="text-base md:text-lg font-mono font-bold text-primary-foreground">
                        {formatTime(flightData.estimated_in || flightData.estimated_out)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {flightData.route && (
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold">Route:</span> {flightData.route}
                </p>
              </div>
            )}

            {TAIL_NUMBER && (
              <div className="pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Auto-refreshing every {REFRESH_INTERVAL / 1000} seconds
                </p>
              </div>
            )}
          </>
        )}

        {!loading && !flightData && !error && (
          <div className="text-center py-8 md:py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-muted/20 flex items-center justify-center">
                <Plane className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg md:text-xl font-semibold text-primary-foreground mb-2">
                  I'm not flying
                </p>
                <p className="text-sm md:text-base text-muted-foreground">
                  {TAIL_NUMBER
                    ? "No active flight detected. I'll update automatically when I'm in the air."
                    : "Flight tracking is not currently active."}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

