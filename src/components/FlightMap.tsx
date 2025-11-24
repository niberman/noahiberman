import { useEffect, useRef, useState, useMemo, Suspense, lazy } from "react";
import { Plane, MapPin, Clock, Calendar } from "lucide-react";
import { flightHistory, type Flight } from "@/data/flights";
import { getAirportCoordinates, generateArc } from "@/lib/airport-coordinates";
import { extractAirportsFromFlight, mapAirportsToFlights } from "@/lib/flight-airports";
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

// Mapbox token - must be set in Vercel environment variables as VITE_MAPBOX_TOKEN
// Note: Client-side tokens are bundled into the JavaScript at build time, which is expected behavior for Mapbox
// To configure in Vercel: Go to Project Settings > Environment Variables and add VITE_MAPBOX_TOKEN
const getMapboxToken = (): string => {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  return token || "";
};

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

  // Collect all unique airports referenced across every flight (including description waypoints)
  const uniqueAirports = useMemo(() => {
    const airports = new Set<string>();
    flightHistory.forEach((flight) => {
      extractAirportsFromFlight(flight).forEach((code) => airports.add(code));
    });
    return Array.from(airports).filter((code) => code.length > 0);
  }, [flightHistory]);

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

  const airportFlights = useMemo(() => mapAirportsToFlights(flightHistory), [flightHistory]);

  // Build hub-and-spoke routes: draw a line from KAPA to every airport ever visited
  const flightRoutes = useMemo<FlightRoute[]>(() => {
    const kapaCoords = getAirportCoordinates("KAPA");
    if (!kapaCoords) {
      console.warn("KAPA coordinates not found!");
      return [];
    }

    const routes = airportsWithCoords
      .filter((airport) => airport.code !== "KAPA")
      .map((airport) => {
        const representativeFlight = airportFlights.get(airport.code);
        if (!representativeFlight) {
          console.warn(`No flight found for airport ${airport.code}`);
          return null;
        }

        return {
          flight: representativeFlight,
          originCoords: kapaCoords,
          destinationCoords: airport.coords,
          destinationCode: airport.code,
          arc: generateArc(kapaCoords, airport.coords, 100),
        } satisfies FlightRoute;
      })
      .filter((route): route is FlightRoute => route !== null);

    console.log(
      `Prepared ${routes.length} hub routes from KAPA covering ${airportsWithCoords.length - 1} airports`
    );

    return routes;
  }, [airportsWithCoords, airportFlights]);

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
      const [lon] = route.destinationCoords;
      const regionKey = lon < -110 ? "west" : lon < -102 ? "central" : "east";
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
        const [lon, lat] = routesInRegion[0].destinationCoords;

        // Smooth camera transition
        mapRef.current.flyTo({
          center: [lon, lat],
          zoom: 6.5,
          pitch: 55,
          bearing: -10,
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

  const mapboxToken = getMapboxToken();
  
  if (!mapboxToken) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-card/50 rounded-lg border border-border/50">
        <div className="text-center p-8 max-w-md">
          <Plane className="h-12 w-12 text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-display font-bold text-primary-foreground mb-2">
            Mapbox Token Required
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            To enable the interactive flight map, set the VITE_MAPBOX_TOKEN environment variable in Vercel.
          </p>
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg text-left space-y-1">
            <p className="font-semibold">Setup Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Go to your Vercel project settings</li>
              <li>Navigate to Environment Variables</li>
              <li>Add <code className="bg-background px-1 rounded">VITE_MAPBOX_TOKEN</code> with your Mapbox token</li>
              <li>Enable for Production, Preview, and Development</li>
              <li>Redeploy your project</li>
            </ol>
          </div>
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
          mapboxAccessToken={mapboxToken}
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
          {/* Flight Routes - Hub-and-spoke design from KAPA */}
          {flightRoutes.length > 0 && (
            <>
              {/* Outer glow layer for depth */}
              <Source
                id="flight-routes-glow"
                type="geojson"
                data={{
                  type: "FeatureCollection",
                  features: flightRoutes
                    .map((route, routeIndex) => {
                      const routeCoordinates = route.arc.map(([lon, lat]) => [lon, lat] as [number, number]);
                      return {
                        type: "Feature" as const,
                        geometry: {
                          type: "LineString" as const,
                          coordinates: routeCoordinates,
                        },
                        properties: {
                          flightId: route.flight.id,
                          origin: "KAPA",
                          destination: route.destinationCode,
                          routeIndex,
                        },
                      };
                    })
                    .filter((f) => f.geometry.coordinates.length >= 2),
                }}
              >
                <Layer
                  id="flight-routes-glow-layer"
                  type="line"
                  paint={{
                    "line-color": "#a855f7",
                    "line-width": 6,
                    "line-opacity": 0.12,
                    "line-blur": 5,
                  }}
                  layout={{
                    "line-cap": "round",
                    "line-join": "round",
                  }}
                />
              </Source>

              {/* Main route lines with gradient effect */}
              <Source
                id="all-flight-routes"
                type="geojson"
                lineMetrics
                data={{
                  type: "FeatureCollection",
                  features: flightRoutes
                    .map((route, routeIndex) => {
                      const routeCoordinates = route.arc.map(([lon, lat]) => [lon, lat] as [number, number]);
                      return {
                        type: "Feature" as const,
                        geometry: {
                          type: "LineString" as const,
                          coordinates: routeCoordinates,
                        },
                        properties: {
                          flightId: route.flight.id,
                          origin: "KAPA",
                          destination: route.destinationCode,
                          routeIndex,
                        },
                      };
                    })
                    .filter((f) => f.geometry.coordinates.length >= 2),
                }}
              >
                <Layer
                  id="flight-routes-layer"
                  type="line"
                  paint={{
                    "line-gradient": [
                      "interpolate",
                      ["linear"],
                      ["line-progress"],
                      0,
                      "#c4b5fd",
                      0.6,
                      "#a855f7",
                      1,
                      "#7c3aed",
                    ],
                    "line-width": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      3, 2.3,
                      8, 3.2,
                      12, 4,
                    ],
                    "line-opacity": 0.78,
                  }}
                  layout={{
                    "line-cap": "round",
                    "line-join": "round",
                  }}
                />
              </Source>

              {/* Accent highlight layer */}
              <Source
                id="flight-routes-highlight"
                type="geojson"
                data={{
                  type: "FeatureCollection",
                  features: flightRoutes
                    .map((route, routeIndex) => {
                      const routeCoordinates = route.arc.map(([lon, lat]) => [lon, lat] as [number, number]);
                      return {
                        type: "Feature" as const,
                        geometry: {
                          type: "LineString" as const,
                          coordinates: routeCoordinates,
                        },
                        properties: {
                          flightId: route.flight.id,
                          origin: "KAPA",
                          destination: route.destinationCode,
                          routeIndex,
                        },
                      };
                    })
                    .filter((f) => f.geometry.coordinates.length >= 2),
                }}
              >
                <Layer
                  id="flight-routes-highlight-layer"
                  type="line"
                  paint={{
                    "line-color": "#fdf4ff",
                    "line-width": 0.8,
                    "line-opacity": 0.28,
                  }}
                  layout={{
                    "line-cap": "round",
                    "line-join": "round",
                  }}
                />
              </Source>
            </>
          )}
          
          {/* Debug overlay */}
          {flightRoutes.length === 0 && (
            <div className="absolute top-4 left-4 bg-red-500/80 text-white p-2 rounded text-xs z-50">
              No routes to display (flightRoutes.length: {flightRoutes.length})
            </div>
          )}

          {/* Airport Markers - Show KAPA as home base and all visited airports */}
          {airportsToDisplay.map((airport) => {
            const isHomeBase = airport.code === "KAPA";
            return (
              <Marker
                key={`airport-${airport.code}`}
                longitude={airport.coords[0]}
                latitude={airport.coords[1]}
                anchor="bottom"
              >
                <div
                  className="relative transition-all duration-500 opacity-100 scale-100 cursor-pointer group"
                onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                  const flight =
                    airportFlights.get(airport.code) ||
                    flightHistory.find(
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
                  const flight =
                    airportFlights.get(airport.code) ||
                    flightHistory.find(
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
                  {/* Glow effect */}
                  <div 
                    className={`absolute ${isHomeBase ? '-top-4 -left-4 w-8 h-8' : '-top-3 -left-3 w-6 h-6'} rounded-full blur-sm animate-pulse-glow ${
                      isHomeBase ? 'bg-violet-500/50' : 'bg-secondary/30'
                    }`}
                  ></div>
                  
                  {/* Home base gets a special icon */}
                  {isHomeBase ? (
                    <div className="relative">
                      <Plane className="h-6 w-6 text-violet-400 drop-shadow-lg animate-pulse" />
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Home Base
                      </div>
                    </div>
                  ) : (
                    <MapPin className="h-5 w-5 text-secondary drop-shadow-lg" />
                  )}
                </div>
              </Marker>
            );
          })}
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
                {tooltip.flight.aircraft.type 
                  ? tooltip.flight.aircraft.type.split(" ").slice(-2).join(" ") || tooltip.flight.aircraft.type
                  : 'Unknown'}
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

