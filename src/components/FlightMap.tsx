import { useEffect, useRef, useState, useMemo, Suspense, lazy } from "react";
import { Plane, MapPin, Clock, Calendar } from "lucide-react";
import { flightHistory, type Flight } from "@/data/flights";
import { getAirportCoordinates, generateArc } from "@/lib/airport-coordinates";
import type { MapRef, ViewState } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

// Dynamically import Map components to avoid SSR issues  
const Map = lazy(() => import("react-map-gl/mapbox").then((mod) => ({ default: mod.default || mod.Map })));
const Source = lazy(() => import("react-map-gl/mapbox").then((mod) => ({ default: mod.Source })));
const Layer = lazy(() => import("react-map-gl/mapbox").then((mod) => ({ default: mod.Layer })));
const Marker = lazy(() => import("react-map-gl/mapbox").then((mod) => ({ default: mod.Marker })));

interface FlightRoute {
  flight: Flight;
  originCoords: [number, number];
  destinationCoords: [number, number];
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
  // This includes routes from origin->destination AND intermediate stops from the route description
  const flightRoutes = useMemo<FlightRoute[]>(() => {
    const routes: FlightRoute[] = [];
    const routeSet = new Set<string>(); // Track unique routes to avoid duplicates

    flightHistory.forEach((flight) => {
      // Process direct origin -> destination route
      if (flight.route.originCode !== flight.route.destinationCode) {
        const originCoords = getAirportCoordinates(flight.route.originCode);
        const destinationCoords = getAirportCoordinates(flight.route.destinationCode);

        if (originCoords && destinationCoords) {
          const routeKey = `${flight.route.originCode}-${flight.route.destinationCode}`;
          if (!routeSet.has(routeKey)) {
            routeSet.add(routeKey);
            const arc = generateArc(originCoords, destinationCoords, 100);
            routes.push({
              flight,
              originCoords,
              destinationCoords,
              arc,
            });
          }
        }
      }

      // Process intermediate airports from route description
      // Extract airport codes from description (e.g., "Route: KLXV KCFO - 3")
      if (flight.description) {
        const routeMatches = flight.description.match(/Route:\s*([A-Z0-9\s-]+)/i);
        if (routeMatches) {
          const routeString = routeMatches[1];
          // Extract all airport codes (3-4 letter codes)
          const airportCodes = routeString.match(/\b([A-Z][A-Z0-9]{2,3})\b/g) || [];
          
          // Create segments: origin -> first intermediate, intermediate -> intermediate, last intermediate -> destination
          const allAirports = [
            flight.route.originCode,
            ...airportCodes.filter(code => code.toUpperCase() !== flight.route.originCode && code.toUpperCase() !== flight.route.destinationCode),
            flight.route.destinationCode
          ].filter((code, index, arr) => arr.indexOf(code) === index); // Remove duplicates

          for (let i = 0; i < allAirports.length - 1; i++) {
            const fromCode = allAirports[i].toUpperCase().trim();
            const toCode = allAirports[i + 1].toUpperCase().trim();
            
            if (fromCode && toCode && fromCode !== toCode) {
              const routeKey = `${fromCode}-${toCode}`;
              if (!routeSet.has(routeKey)) {
                const fromCoords = getAirportCoordinates(fromCode);
                const toCoords = getAirportCoordinates(toCode);
                
                if (fromCoords && toCoords) {
                  routeSet.add(routeKey);
                  const arc = generateArc(fromCoords, toCoords, 100);
                  routes.push({
                    flight,
                    originCoords: fromCoords,
                    destinationCoords: toCoords,
                    arc,
                  });
                }
              }
            }
          }
        }
      }
    });

    console.log(`Processed ${routes.length} flight route segments out of ${flightHistory.length} flights`);
    console.log(`Found ${airportsWithCoords.length} unique airports with coordinates out of ${uniqueAirports.length} total`);
    return routes;
  }, [airportsWithCoords.length, uniqueAirports.length]);

  // Calculate bounds for all airports (not just routes)
  const bounds = useMemo(() => {
    if (airportsWithCoords.length === 0) return null;

    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    // Include all airports in bounds calculation
    airportsWithCoords.forEach((airport) => {
      const [lon, lat] = airport.coords;
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });

    return { minLon, maxLon, minLat, maxLat };
  }, [airportsWithCoords]);

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
          interactiveLayerIds={flightRoutes.map((r) => `route-${r.flight.id}`)}
          onLoad={() => {
            console.log("Map loaded, rendering flight routes");
            console.log(`Bounds: ${bounds?.minLon}, ${bounds?.minLat} to ${bounds?.maxLon}, ${bounds?.maxLat}`);
            if (airportsWithCoords.length > 0 && mapRef.current && bounds) {
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
          onMouseEnter={(e) => {
            if (e.features && e.features.length > 0) {
              const feature = e.features[0];
              const flightId = feature.properties?.flightId;
              if (flightId) {
                const route = flightRoutes.find((r) => r.flight.id === flightId);
                if (route) {
                  setTooltip({
                    flight: route.flight,
                    x: e.originalEvent.clientX,
                    y: e.originalEvent.clientY,
                  });
                }
              }
            }
          }}
          onMouseLeave={() => setTooltip(null)}
          cursor="pointer"
        >
          {/* Airport Markers and Flight Routes */}
          {flightRoutes.map((route) => {
            const isAnimated = animatedRoutes.has(route.flight.id);
            // Mapbox expects [longitude, latitude] format
            const routeCoordinates = route.arc.map(([lon, lat]) => [lon, lat] as [number, number]);

            return (
              <div key={`route-group-${route.flight.id}`}>
                <Source
                  id={`route-${route.flight.id}`}
                  type="geojson"
                  data={{
                    type: "Feature",
                    geometry: {
                      type: "LineString",
                      coordinates: routeCoordinates,
                    },
                    properties: {
                      flightId: route.flight.id,
                    },
                  }}
                >
                  <Layer
                    id={`route-${route.flight.id}`}
                    type="line"
                    paint={{
                      "line-color": "#a855f7",
                      "line-width": isAnimated ? 3 : 3,
                      "line-opacity": isAnimated ? 0.8 : 0.8,
                    }}
                    layout={{
                      "line-cap": "round",
                      "line-join": "round",
                    }}
                  />
                  {/* Animated glow trail */}
                  <Layer
                    id={`route-glow-${route.flight.id}`}
                    type="line"
                    paint={{
                      "line-color": "#a855f7",
                      "line-width": isAnimated ? 8 : 8,
                      "line-opacity": isAnimated ? 0.2 : 0.2,
                      "line-blur": 10,
                    }}
                    layout={{
                      "line-cap": "round",
                      "line-join": "round",
                    }}
                  />
                </Source>
              </div>
            );
          })}

          {/* All Unique Airport Markers */}
          {airportsWithCoords.map((airport) => (
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

