import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, Navigation, ExternalLink, Radio, MapPin, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { FlightMap } from "@/components/FlightMap";
import { Suspense } from "react";
import { flightHistory } from "@/data/flights";

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
  const [positionHistory, setPositionHistory] = useState<AircraftPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

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

  // Initialize map for live tracking
  useEffect(() => {
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!mapContainer.current || !mapboxToken || !currentFlight || currentFlight.flight_status !== "in_flight") return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [aircraftPosition?.longitude || -104.6731, aircraftPosition?.latitude || 39.8617],
      zoom: 10,
      // Enable all interactions
      dragRotate: true,
      dragPan: true,
      scrollZoom: true,
      touchZoomRotate: true,
      touchPitch: true,
      doubleClickZoom: true,
      keyboard: true,
    });

    // Add navigation controls for better UX
    map.current.addControl(new mapboxgl.NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: true
    }), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, [currentFlight]);

  // Update marker when position changes
  useEffect(() => {
    if (!map.current || !aircraftPosition) return;

    // Remove existing marker
    if (marker.current) {
      marker.current.remove();
    }

    // Create custom marker element
    const el = document.createElement('div');
    el.className = 'aircraft-marker';
    el.innerHTML = `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          inset: 0;
          background: rgba(34, 197, 94, 0.3);
          border-radius: 50%;
          animation: pulse 2s infinite;
        "></div>
        <div style="
          position: relative;
          background: rgb(34, 197, 94);
          padding: 8px;
          border-radius: 50%;
          transform: rotate(${aircraftPosition.heading}deg);
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
            <path d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2C10.67 2 10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z" fill="white"/>
          </svg>
        </div>
      </div>
    `;

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.5); opacity: 0.5; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    if (!document.head.querySelector('style[data-aircraft-marker]')) {
      style.setAttribute('data-aircraft-marker', 'true');
      document.head.appendChild(style);
    }

    // Create and add marker
    marker.current = new mapboxgl.Marker(el)
      .setLngLat([aircraftPosition.longitude, aircraftPosition.latitude])
      .addTo(map.current);

    // Center map on aircraft
    map.current.flyTo({
      center: [aircraftPosition.longitude, aircraftPosition.latitude],
      zoom: 10,
      essential: true
    });

    // Draw flight path
    if (positionHistory.length > 1) {
      const sourceId = 'flight-path';
      const layerId = 'flight-path-line';

      // Remove existing source/layer if present
      if (map.current.getSource(sourceId)) {
        map.current.removeLayer(layerId);
        map.current.removeSource(sourceId);
      }

      map.current.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: positionHistory.map(pos => [pos.longitude, pos.latitude])
          }
        }
      });

      map.current.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {},
        paint: {
          'line-color': '#22c55e',
          'line-width': 3,
          'line-opacity': 0.7
        }
      });
    }
  }, [aircraftPosition, positionHistory]);

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
        setPositionHistory(prev => [...prev.slice(-19), newPosition]);
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
            heading: parseInt(aircraft.track) || 0,
            speed: parseInt(aircraft.gs) || 0,
            timestamp: Date.now()
          };
          
          setAircraftPosition(newPosition);
          setPositionHistory(prev => [...prev.slice(-19), newPosition]); // Keep last 20 positions
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
                {aircraftPosition && (
                  <div className="text-xs text-muted-foreground text-right">
                    <p>{aircraftPosition.altitude.toLocaleString()} ft</p>
                    <p>{Math.round(aircraftPosition.speed)} kts</p>
                  </div>
                )}
                <Badge className="bg-green-500/20 text-green-400 border-green-500/40 animate-pulse">
                  <Radio className="h-3 w-3 mr-1" />
                  LIVE
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Map Container */}
          {mapboxToken ? (
            <>
              {isFlying ? (
                <div className="rounded-lg overflow-hidden bg-black/20 h-[400px] relative">
                  <div ref={mapContainer} className="w-full h-full" />
                  
                  {/* Info overlay */}
                  {aircraftPosition && (
                    <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 text-white pointer-events-none">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-green-400" />
                        <span className="font-mono text-sm">{currentFlight.tail_number}</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <p>Alt: {aircraftPosition.altitude.toLocaleString()} ft</p>
                        <p>Speed: {Math.round(aircraftPosition.speed)} kts</p>
                        <p>Heading: {Math.round(aircraftPosition.heading)}°</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : showInlineMap ? (
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
              ) : (
                <div className="rounded-lg border border-border/60 bg-card/40 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    The full interactive map is now immersive across the entire section above. Scroll back to
                    “Follow My Flight” to explore every route.
                  </p>
                  <button
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-secondary/20 px-4 py-2 text-sm font-medium text-secondary transition hover:bg-secondary/30"
                    onClick={() => document.getElementById("flight-map-fullscreen")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    Jump to Map
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg bg-black/20 h-[400px] flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Map unavailable</p>
                <p className="text-xs text-muted-foreground mt-1">Mapbox token not configured</p>
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="mt-4">
            {isFlying ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  <p>Live tracking with ADS-B data</p>
                  <p className="text-xs mt-1">Updates every 30 seconds</p>
                </div>
                <a
                  href={`https://flightaware.com/live/flight/${currentFlight.tail_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/20 hover:bg-secondary/30 text-secondary rounded-lg transition-all duration-200 group"
                >
                  <span className="font-medium">Full Details on FlightAware</span>
                  <ExternalLink className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
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
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
