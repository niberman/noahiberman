import { useEffect, useRef, useState, useMemo, Suspense, lazy } from "react";
import { Plane, MapPin, Clock, Calendar } from "lucide-react";
import { flightHistory, type Flight } from "@/data/flights";
import { getAirportCoordinates, generateArc } from "@/lib/airport-coordinates";
import type { MapRef, ViewState } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

// Dynamically import Map components to avoid SSR issues  
const Map = lazy(() => import("react-map-gl/mapbox").then((mod) => ({ default: mod.default || mod.Map })));

// Import Source and Layer directly (they should work without lazy loading)
import { Source, Layer, Marker } from "react-map-gl/mapbox";

interface FlightRoute {
  flight: Flight;
  originCoords: [number, number];
  destinationCoords: [number, number];
  destinationCode: string;
  arc: [number, number][];
}

interface TooltipData {
  flight: Flight;
  x: number;
  y: number;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

export function FlightMap() {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState<ViewState>({
    longitude: -105.27,
    latitude: 40.015,
    zoom: 5,
    pitch: 0,
    bearing: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [animatedRoutes, setAnimatedRoutes] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // Collect all unique airports
  const uniqueAirports = useMemo(() => {
    const airports = new Set<string>();
    flightHistory.forEach((flight) => {
      // Add origin and destination (trim whitespace)
      airports.add(flight.route.originCode.trim().toUpperCase());
      airports.add(flight.route.destinationCode.trim().toUpperCase());
      
      // Also extract airports from route description
      if (flight.description) {
        const routeMatches = flight.description.match(/Route:\s*([A-Z0-9\s-]+)/i);
        if (routeMatches) {
          const routeString = routeMatches[1];
          const airportCodes = routeString.match(/\b([A-Z][A-Z0-9]{2,3})\b/g) || [];
          airportCodes.forEach(code => airports.add(code.toUpperCase().trim()));
        }
      }
    });
    return Array.from(airports).filter(code => code.length > 0);
  }, []);

  // Get coordinates for all unique airports
  const airportsWithCoords = useMemo(() => {
    const airports: Array<{ code: string; coords: [number, number] }> = [];
    uniqueAirports.forEach((code) => {
      const coords = getAirportCoordinates(code);
      if (coords) {
        airports.push({ code, coords });
      } else {
        console.warn(`Missing coordinates for airport: ${code}`);
      }
    });
    return airports;
  }, [uniqueAirports]);

  // Process flights into routes with coordinates
  // Only show routes FROM KAPA (Centennial) to each destination airport
  const flightRoutes = useMemo<FlightRoute[]>(() => {
    const routes: FlightRoute[] = [];
    const kapaCoords = getAirportCoordinates("KAPA");

    if (!kapaCoords) {
      console.warn("KAPA coordinates not found!");
      return routes;
    }

    flightHistory.forEach((flight) => {
      const originCode = flight.route.originCode.toUpperCase().trim();
      const destCode = flight.route.destinationCode.toUpperCase().trim();
      
      // Only process flights that start from KAPA
      if (originCode !== "KAPA") {
        return;
      }
      
      // Process routes from description field to find intermediate destinations
      if (flight.description) {
        // Match "Route: ..." pattern and extract all airport codes
        // Handles formats like: "Route: KGXY KFNL 18V KEIK" or "Route: KASE KEGE KLXV"
        const routeMatches = flight.description.match(/Route:\s*([A-Z0-9\s-]+)/i);
        if (routeMatches) {
          const routeString = routeMatches[1].trim();
          
          // Extract all airport codes - improved regex to catch all formats
          // Matches: KXXX (4 chars), XXX (3 chars like 18V), XX (2 chars)
          // Also handles codes with numbers like K1V6, 1V6, etc.
          const airportCodes = routeString.match(/\b([A-Z][A-Z0-9]{1,3})\b/g) || [];
          
          // Also try matching without word boundaries for edge cases
          const additionalCodes = routeString.match(/([A-Z][A-Z0-9]{2,4})/g) || [];
          
          // Combine and deduplicate codes
          const allCodes = new Set<string>();
          [...airportCodes, ...additionalCodes].forEach(code => {
            const upperCode = code.toUpperCase().trim();
            // Valid airport codes are 2-4 characters, start with a letter
            if (upperCode && upperCode.length >= 2 && upperCode.length <= 4 && /^[A-Z]/.test(upperCode)) {
              allCodes.add(upperCode);
            }
          });
          
          // Create routes from KAPA to each unique airport in the route
          const visitedAirports = new Set<string>();
          
          // Add all airports from route description (excluding KAPA as it's the origin)
          allCodes.forEach(code => {
            if (code !== "KAPA") {
              visitedAirports.add(code);
            }
          });
          
          // Add destination if different from KAPA
          if (destCode && destCode !== "KAPA") {
            visitedAirports.add(destCode);
          }
          
          // Create a route from KAPA to each visited airport
          // This ensures every airport in the multi-stop flight gets a line from KAPA
          visitedAirports.forEach(airportCode => {
            const destCoords = getAirportCoordinates(airportCode);
            if (destCoords) {
              const arc = generateArc(kapaCoords, destCoords, 100);
              routes.push({
                flight,
                originCoords: kapaCoords,
                destinationCoords: destCoords,
                destinationCode: airportCode,
                arc,
              });
            } else {
              console.warn(`Missing coordinates for airport in route: ${airportCode} (from flight ${flight.id})`);
            }
          });
        } else {
          // Description exists but no route pattern - use destination
          if (destCode && destCode !== "KAPA") {
            const destinationCoords = getAirportCoordinates(destCode);
            if (destinationCoords) {
              const arc = generateArc(kapaCoords, destinationCoords, 100);
              routes.push({
                flight,
                originCoords: kapaCoords,
                destinationCoords,
                destinationCode: destCode,
                arc,
              });
            }
          }
        }
      } else {
        // No description - use origin -> destination
        if (destCode && destCode !== "KAPA") {
          const destinationCoords = getAirportCoordinates(destCode);
          if (destinationCoords) {
            const arc = generateArc(kapaCoords, destinationCoords, 100);
            routes.push({
              flight,
              originCoords: kapaCoords,
              destinationCoords,
              destinationCode: destCode,
              arc,
            });
          }
        }
      }
    });

    const flightsFromKAPA = flightHistory.filter(f => f.route.originCode.toUpperCase().trim() === "KAPA");
    console.log(`Found ${flightsFromKAPA.length} flights from KAPA out of ${flightHistory.length} total flights`);
    console.log(`Processed ${routes.length} flight route segments from KAPA`);
    
    if (routes.length === 0 && flightsFromKAPA.length > 0) {
      console.warn("WARNING: Found flights from KAPA but created 0 routes!");
      console.log("Sample flights from KAPA:", flightsFromKAPA.slice(0, 3).map(f => ({
        id: f.id,
        origin: f.route.originCode,
        dest: f.route.destinationCode,
        description: f.description?.substring(0, 50)
      })));
    }
    
    if (routes.length > 0) {
      console.log("Sample routes created:", routes.slice(0, 3).map(r => ({
        destination: r.destinationCode,
        coords: r.destinationCoords,
        arcPoints: r.arc.length
      })));
    }
    
    // Log multi-stop flights for debugging
    const multiStopFlights = flightsFromKAPA.filter(f => {
      if (f.description) {
        const routeMatch = f.description.match(/Route:\s*([A-Z0-9\s-]+)/i);
        if (routeMatch) {
          const airports = routeMatch[1].match(/\b([A-Z][A-Z0-9]{1,3})\b/g) || [];
          return airports.length > 1;
        }
      }
      return false;
    });
    
    if (multiStopFlights.length > 0) {
      console.log(`Found ${multiStopFlights.length} multi-stop flights from KAPA`);
      console.log("Sample multi-stop flights:", multiStopFlights.slice(0, 3).map(f => ({
        id: f.id,
        route: f.description,
        destinations: routes.filter(r => r.flight.id === f.id).map(r => r.destinationCode)
      })));
    }
    
    return routes;
  }, [flightHistory, airportsWithCoords, uniqueAirports]);

  // Show all airports (not just ones with routes from KAPA)
  // Lines will only be drawn from KAPA, but all visited airports are displayed
  const airportsToDisplay = useMemo(() => {
    return airportsWithCoords;
  }, [airportsWithCoords]);

  // Calculate bounds for airports with routes (including KAPA and destinations)
  const bounds = useMemo(() => {
    if (airportsToDisplay.length === 0) return null;

    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    // Include airports with routes in bounds calculation
    airportsToDisplay.forEach((airport) => {
      const [lon, lat] = airport.coords;
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });

    return { minLon, maxLon, minLat, maxLat };
  }, [airportsToDisplay]);

  // Immediately show all routes instead of waiting for animation
  useEffect(() => {
    if (flightRoutes.length > 0) {
      const allFlightIds = new Set(flightRoutes.map((r) => r.flight.id));
      setAnimatedRoutes(allFlightIds);
    }
  }, [flightRoutes]);

  // Initial camera animation - zoom out to show all flights
  useEffect(() => {
    if (!mapRef.current || !bounds || isInitialized) return;

    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.fitBounds(
          [
            [bounds.minLon, bounds.minLat],
            [bounds.maxLon, bounds.maxLat],
          ],
          {
            padding: { top: 100, bottom: 100, left: 100, right: 100 },
            duration: 2000,
          }
        );

        setTimeout(() => {
          setIsInitialized(true);
          // Start animating routes
          animateRouteSequence();
        }, 2500);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [bounds, isInitialized, airportsWithCoords.length]);

  // Animate route sequence - fly to each region
  const animateRouteSequence = () => {
    if (flightRoutes.length === 0 || !mapRef.current) return;

    // Group routes by region (rough clustering)
    const regions: Record<string, FlightRoute[]> = {};
    flightRoutes.forEach((route) => {
      const [lon] = route.originCoords;
      const regionKey = lon < -106 ? "west" : lon < -104 ? "central" : "east";
      if (!regions[regionKey]) {
        regions[regionKey] = [];
      }
      regions[regionKey].push(route);
    });

    let regionIndex = 0;
    const regionKeys = Object.keys(regions);

    const flyToRegion = () => {
      if (regionIndex >= regionKeys.length) {
        // All regions visited, animate remaining routes
        flightRoutes.forEach((route, idx) => {
          if (!animatedRoutes.has(route.flight.id)) {
            setTimeout(() => {
              setAnimatedRoutes((prev) => new Set([...prev, route.flight.id]));
            }, idx * 100);
          }
        });
        return;
      }

      const regionKey = regionKeys[regionIndex];
      const routesInRegion = regions[regionKey];
      
      if (routesInRegion.length > 0 && mapRef.current) {
        const [lon, lat] = routesInRegion[0].originCoords;

        // Smooth camera transition
        mapRef.current.flyTo({
          center: [lon, lat],
          zoom: 7,
          pitch: 60,
          bearing: 0,
          duration: 2000,
        });

        // Animate routes in this region
        setTimeout(() => {
          routesInRegion.forEach((route, idx) => {
            setTimeout(() => {
              setAnimatedRoutes((prev) => new Set([...prev, route.flight.id]));
            }, idx * 200);
          });
        }, 1000);

        regionIndex++;
        setTimeout(flyToRegion, 4000);
      }
    };

    flyToRegion();
  };

  // Parse flight duration to hours
  const parseFlightHours = (duration?: string): string => {
    if (!duration) return "0.0";
    const hoursMatch = duration.match(/(\d+)h/);
    const minutesMatch = duration.match(/(\d+)m/);
    const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? parseFloat(minutesMatch[1]) : 0;
    return (hours + minutes / 60).toFixed(1);
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-card/50 rounded-lg border border-border/50">
        <div className="text-center p-8">
          <Plane className="h-12 w-12 text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-display font-bold text-primary-foreground mb-2">
            Mapbox Token Required
          </h3>
          <p className="text-sm text-muted-foreground">
            Set VITE_MAPBOX_TOKEN to view the interactive flight map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden shadow-glow border border-border/50">
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center bg-card">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-secondary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading map...</p>
            </div>
          </div>
        }
      >
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          mapboxAccessToken={MAPBOX_TOKEN}
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          terrain={{ source: "mapbox-dem", exaggeration: 1.5 }}
          projection={{ name: "globe" }}
          reuseMaps
          onLoad={() => {
            console.log("Map loaded, rendering flight routes");
            console.log(`Flight routes count: ${flightRoutes.length}`);
            console.log(`Airports to display: ${airportsToDisplay.length}`);
            console.log(`Bounds: ${bounds?.minLon}, ${bounds?.minLat} to ${bounds?.maxLon}, ${bounds?.maxLat}`);
            
            if (flightRoutes.length > 0) {
              console.log("Sample route:", {
                origin: flightRoutes[0].flight.route.originCode,
                destination: flightRoutes[0].destinationCode,
                coordinates: flightRoutes[0].arc.length,
              });
            }
            
            if (airportsToDisplay.length > 0 && mapRef.current && bounds) {
              mapRef.current.fitBounds(
                [
                  [bounds.minLon, bounds.minLat],
                  [bounds.maxLon, bounds.maxLat],
                ],
                {
                  padding: { top: 50, bottom: 50, left: 50, right: 50 },
                  duration: 1500,
                }
              );
            }
          }}
        >
          {/* Flight Routes - Combined into single GeoJSON source */}
          {flightRoutes.length > 0 && (
            <Source
              id="all-flight-routes"
              type="geojson"
              data={{
                type: "FeatureCollection",
                features: flightRoutes.map((route, routeIndex) => {
                  const routeCoordinates = route.arc.map(([lon, lat]) => [lon, lat] as [number, number]);
                  return {
                    type: "Feature" as const,
                    geometry: {
                      type: "LineString" as const,
                      coordinates: routeCoordinates,
                    },
                    properties: {
                      flightId: route.flight.id,
                      origin: route.flight.route.originCode,
                      destination: route.destinationCode,
                      routeIndex,
                    },
                  };
                }).filter(f => f.geometry.coordinates.length >= 2),
              }}
            >
              <Layer
                id="flight-routes-layer"
                type="line"
                paint={{
                  "line-color": "#a855f7",
                  "line-width": 3,
                  "line-opacity": 1,
                }}
                layout={{
                  "line-cap": "round",
                  "line-join": "round",
                }}
              />
            </Source>
          )}
          
          {/* Debug overlay */}
          {flightRoutes.length === 0 && (
            <div className="absolute top-4 left-4 bg-red-500/80 text-white p-2 rounded text-xs z-50">
              No routes to display (flightRoutes.length: {flightRoutes.length})
            </div>
          )}

          {/* Airport Markers - Only show airports with routes */}
          {airportsToDisplay.map((airport) => (
            <Marker
              key={`airport-${airport.code}`}
              longitude={airport.coords[0]}
              latitude={airport.coords[1]}
              anchor="bottom"
            >
              <div
                className="relative transition-all duration-500 opacity-100 scale-100 cursor-pointer"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  // Find a flight that uses this airport
                  const flight = flightHistory.find(
                    (f) => f.route.originCode === airport.code || f.route.destinationCode === airport.code
                  );
                  if (flight) {
                    setTooltip({
                      flight,
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                    });
                  }
                }}
                onMouseLeave={() => setTooltip(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const flight = flightHistory.find(
                    (f) => f.route.originCode === airport.code || f.route.destinationCode === airport.code
                  );
                  if (flight) {
                    setTooltip({
                      flight,
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                    });
                  }
                }}
              >
                <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-secondary/30 blur-sm animate-pulse-glow"></div>
                <MapPin className="h-5 w-5 text-secondary drop-shadow-lg" />
              </div>
            </Marker>
          ))}
        </Map>
      </Suspense>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-30 bg-card/95 backdrop-blur-xl border border-border rounded-lg p-4 shadow-glow pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%) translateY(-10px)",
          }}
        >
          <div className="space-y-2 min-w-[200px]">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium text-primary-foreground">
                {new Date(tooltip.flight.date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-secondary" />
              <span className="text-sm text-muted-foreground">
                {tooltip.flight.aircraft.type.split(" ").slice(-2).join(" ")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-secondary" />
              <span className="text-sm text-primary-foreground">
                {tooltip.flight.route.originCode} → {tooltip.flight.route.destinationCode}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-secondary" />
              <span className="text-sm text-muted-foreground">
                {parseFlightHours(tooltip.flight.duration)} hours
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

