import { useEffect, useRef, useState, useMemo } from "react";
import { Plane, MapPin, Clock, Calendar, Radio } from "lucide-react";
import { flightHistory as staticFlightHistory, type Flight } from "@/data/flights";
import { generateArc, isPuertoRicoIcao } from "@/lib/airport-coordinates";
import {
  extractAirportsFromFlight,
  mapAirportsToFlights,
  buildPuertoRicoConnectingSegments,
} from "@/lib/flight-airports";
import { useCurrentFlight, useFlights } from "@/hooks/use-supabase-flights";
import { useAircraftPositionPolling } from "@/hooks/use-aircraft-position";
import type { AircraftPosition } from "@/lib/aircraft-position";
import { useAirportLookupMap } from "@/hooks/use-supabase-airports";
import { Map, Source, Layer, Marker, NavigationControl } from "react-map-gl/mapbox";
import type { MapRef, ViewState } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";

interface FlightRoute {
  flight: Flight;
  originCode: string;
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

interface AirportTooltip {
  code: string;
  count: number;
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
  const { data: supabaseFlights } = useFlights();
  const { lookupMap: airportCoordsMap } = useAirportLookupMap();
  const flightHistory = supabaseFlights ?? staticFlightHistory;

  const getAirportCoordinates = (code: string): [number, number] | null => {
    return airportCoordsMap[code.toUpperCase()] || null;
  };

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
  const [airportTooltip, setAirportTooltip] = useState<AirportTooltip | null>(null);
  const [animatedRoutes, setAnimatedRoutes] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Live flight tracking state
  const { data: currentFlight } = useCurrentFlight();
  const [aircraftPosition, setAircraftPosition] = useState<AircraftPosition | null>(null);
  const [positionHistory, setPositionHistory] = useState<AircraftPosition[]>([]);
  const liveMarkerRef = useRef<mapboxgl.Marker | null>(null);

  useAircraftPositionPolling(
    currentFlight?.tail_number,
    currentFlight?.flight_status === "in_flight",
    (position) => {
      setAircraftPosition(position);
      setPositionHistory((prev) => [...prev.slice(-19), position]);
    },
    { demoSpread: 2 },
  );

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

  // Count visits to each airport
  const airportVisits = useMemo(() => {
    // Map is shadowed by react-map-gl's component import
    const visits = new globalThis.Map<string, number>();
    flightHistory.forEach((flight) => {
      extractAirportsFromFlight(flight).forEach((code) => {
        visits.set(code, (visits.get(code) || 0) + 1);
      });
    });
    return visits;
  }, [flightHistory]);
  
  // Check if currently flying
  const isFlying = currentFlight && currentFlight.flight_status === "in_flight";

  // Hub-and-spoke from KAPA (excludes Puerto Rico — those use multi-leg segments below)
  const hubFlightRoutes = useMemo<FlightRoute[]>(() => {
    const kapaCoords = getAirportCoordinates("KAPA");
    if (!kapaCoords) {
      console.warn("KAPA coordinates not found!");
      return [];
    }

    const routes = airportsWithCoords
      .filter(
        (airport) =>
          airport.code !== "KAPA" && !isPuertoRicoIcao(airport.code)
      )
      .map((airport) => {
        const representativeFlight = airportFlights.get(airport.code);
        if (!representativeFlight) {
          console.warn(`No flight found for airport ${airport.code}`);
          return null;
        }

        return {
          flight: representativeFlight,
          originCode: "KAPA",
          originCoords: kapaCoords,
          destinationCoords: airport.coords,
          destinationCode: airport.code,
          arc: generateArc(kapaCoords, airport.coords, 100),
        } satisfies FlightRoute;
      })
      .filter((route): route is FlightRoute => route !== null);

    return routes;
  }, [airportsWithCoords, airportFlights, isFlying]);

  // Consecutive TJ–TJ legs from the same flight (e.g. island multi-stop)
  const prLegFlightRoutes = useMemo<FlightRoute[]>(() => {
    return buildPuertoRicoConnectingSegments(flightHistory, getAirportCoordinates).map(
      (seg) => ({
        flight: seg.flight,
        originCode: seg.originCode,
        originCoords: seg.originCoords,
        destinationCoords: seg.destinationCoords,
        destinationCode: seg.destinationCode,
        arc: seg.arc,
      })
    );
  }, [flightHistory, airportCoordsMap]);

  const allFlightRoutes = useMemo(
    () => [...hubFlightRoutes, ...prLegFlightRoutes],
    [hubFlightRoutes, prLegFlightRoutes]
  );

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
    if (allFlightRoutes.length > 0) {
      const allFlightIds = new Set(allFlightRoutes.map((r) => r.flight.id));
      setAnimatedRoutes(allFlightIds);
    }
  }, [allFlightRoutes]);

  // Update live aircraft marker on the map
  useEffect(() => {
    if (!mapRef.current || !aircraftPosition || !isFlying) {
      // Clean up marker if not flying
      if (liveMarkerRef.current) {
        liveMarkerRef.current.remove();
        liveMarkerRef.current = null;
      }
      return;
    }

    const mapboxMap = mapRef.current.getMap();
    if (!mapboxMap) return;

    // Remove existing marker
    if (liveMarkerRef.current) {
      liveMarkerRef.current.remove();
    }

    // Create custom animated aircraft marker
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="
        position: relative;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          inset: -10px;
          background: radial-gradient(circle, rgba(34, 197, 94, 0.5) 0%, transparent 70%);
          border-radius: 50%;
          animation: pulse-live 2s infinite;
        "></div>
        <div style="
          position: relative;
          background: rgb(34, 197, 94);
          padding: 10px;
          border-radius: 50%;
          transform: rotate(${aircraftPosition.heading}deg);
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.6);
        ">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
            <path d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2C10.67 2 10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z" fill="white"/>
          </svg>
        </div>
      </div>
    `;

    // Add CSS animation if not already present
    if (!document.head.querySelector('style[data-live-aircraft-marker]')) {
      const style = document.createElement('style');
      style.setAttribute('data-live-aircraft-marker', 'true');
      style.textContent = `
        @keyframes pulse-live {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(2); opacity: 0.3; }
          100% { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    // Create marker using mapbox-gl
    liveMarkerRef.current = new mapboxgl.Marker(el)
      .setLngLat([aircraftPosition.longitude, aircraftPosition.latitude])
      .addTo(mapboxMap);

    // Smoothly pan to aircraft position
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [aircraftPosition.longitude, aircraftPosition.latitude],
        zoom: 9,
        pitch: 50,
        duration: 2000
      });
    }

    // Draw live flight path
    if (positionHistory.length > 1) {
      const sourceId = 'live-flight-path';
      const layerId = 'live-flight-path-line';

      if (mapboxMap.getSource(sourceId)) {
        if (mapboxMap.getLayer(layerId)) {
          mapboxMap.removeLayer(layerId);
        }
        mapboxMap.removeSource(sourceId);
      }

      mapboxMap.addSource(sourceId, {
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

      mapboxMap.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#22c55e',
          'line-width': 3,
          'line-opacity': 0.8
        }
      });
    }
  }, [aircraftPosition, positionHistory, isFlying]);

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
  }, [bounds, isInitialized, airportsWithCoords.length, allFlightRoutes.length]);

  // Animate route sequence - fly to each region
  const animateRouteSequence = () => {
    if (allFlightRoutes.length === 0 || !mapRef.current) return;

    // Group routes by region (rough clustering)
    const regions: Record<string, FlightRoute[]> = {};
    allFlightRoutes.forEach((route) => {
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
        allFlightRoutes.forEach((route, idx) => {
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
    <div 
      className="relative w-full h-full rounded-lg overflow-hidden shadow-glow border border-border/50"
      onWheel={(e) => {
        // Only allow map zoom if Ctrl/Cmd key is held, otherwise allow page scroll
        if (!e.ctrlKey && !e.metaKey) {
          // Temporarily disable map interactions to allow page scroll
          if (mapRef.current) {
            const map = mapRef.current.getMap();
            if (map) {
              map.scrollZoom.disable();
              setTimeout(() => {
                if (mapRef.current) {
                  mapRef.current.getMap()?.scrollZoom.enable();
                }
              }, 50);
            }
          }
        }
      }}
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
          // Enable all interactions for exploration
          dragRotate={true}
          dragPan={true}
          scrollZoom={true}
          touchZoomRotate={true}
          touchPitch={true}
          doubleClickZoom={true}
          keyboard={true}
          // Set max/min zoom for comfortable exploration
          minZoom={2}
          maxZoom={16}
          maxPitch={85}
          onLoad={() => {
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
          onMouseMove={(e) => {
            if (!mapRef.current) return;
            const features = mapRef.current.queryRenderedFeatures(e.point, {
              layers: ["airport-circles"],
            });
            if (features.length > 0) {
              const feature = features[0];
              const props = feature.properties as { code: string; count: number };
              setAirportTooltip({
                code: props.code,
                count: props.count,
                x: e.point.x,
                y: e.point.y,
              });
              mapRef.current.getCanvas().style.cursor = "pointer";
            } else {
              setAirportTooltip(null);
              if (mapRef.current) {
                mapRef.current.getCanvas().style.cursor = "";
              }
            }
          }}
          onMouseLeave={() => {
            setAirportTooltip(null);
          }}
          interactiveLayerIds={["airport-circles"]}
        >
          {/* Live Flight Status Indicator */}
          {isFlying && aircraftPosition && (
            <div className="absolute top-4 left-4 z-50 pointer-events-none animate-fade-in">
              {/* Glowing background effect */}
              <div className="absolute inset-0 bg-green-500/30 rounded-xl blur-xl animate-pulse" />
              
              {/* Main card */}
              <div className="relative bg-gradient-to-br from-green-500/40 via-green-600/30 to-green-700/20 backdrop-blur-xl rounded-xl p-4 text-white border-2 border-green-400/60 shadow-2xl">
                {/* Animated corner accents */}
                <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-green-400 animate-pulse" />
                <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-green-400 animate-pulse" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-green-400 animate-pulse" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-green-400 animate-pulse" />
                
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative">
                    <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse" />
                    <div className="absolute inset-0 h-3 w-3 bg-green-400 rounded-full animate-ping" />
                  </div>
                  <span className="text-sm font-black tracking-widest text-green-300 drop-shadow-lg flex items-center gap-2">
                    <Radio className="h-3 w-3" />
                    LIVE FLIGHT
                  </span>
                </div>
                
                {/* Flight info */}
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-green-200/80">Aircraft:</span>
                    <p className="font-mono text-lg font-black text-green-300 drop-shadow-lg tracking-wider">
                      {currentFlight.tail_number}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-green-400/30">
                    <div>
                      <p className="text-xs text-green-200/70 mb-0.5">Altitude</p>
                      <p className="text-sm font-bold text-white">
                        {aircraftPosition.altitude.toLocaleString()}<span className="text-xs text-green-200/80 ml-1">ft</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-green-200/70 mb-0.5">Speed</p>
                      <p className="text-sm font-bold text-white">
                        {Math.round(aircraftPosition.speed)}<span className="text-xs text-green-200/80 ml-1">kts</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-green-400/30">
                    <p className="text-xs text-green-200/70 mb-0.5">Heading</p>
                    <p className="text-sm font-bold text-white">
                      {Math.round(aircraftPosition.heading)}°
                    </p>
                  </div>
                </div>
                
                {/* Status bar */}
                <div className="mt-3 pt-2 border-t border-green-400/30 flex items-center justify-between">
                  <span className="text-xs text-green-200/70">ADS-B Tracking</span>
                  <div className="flex items-center gap-1">
                    <div className="h-1 w-1 bg-green-400 rounded-full animate-pulse" />
                    <div className="h-1 w-1 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="h-1 w-1 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Flight Routes - Hub-and-spoke design from KAPA */}
          {allFlightRoutes.length > 0 && (
            <>
              {/* Outer glow layer for depth */}
              <Source
                id="flight-routes-glow"
                type="geojson"
                data={{
                  type: "FeatureCollection",
                  features: allFlightRoutes
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
                          origin: route.originCode,
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
                  features: allFlightRoutes
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
                          origin: route.originCode,
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
                  features: allFlightRoutes
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
                          origin: route.originCode,
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
          
          {/* Airport Circles - hover for details */}
          <Source
            id="airport-labels"
            type="geojson"
            data={{
              type: "FeatureCollection",
              features: airportsToDisplay.map((airport) => ({
                type: "Feature" as const,
                geometry: {
                  type: "Point" as const,
                  coordinates: airport.coords,
                },
                properties: {
                  code: airport.code,
                  count: airportVisits.get(airport.code) || 0,
                  isHomeBase: airport.code === "KAPA",
                },
              })),
            }}
          >
            {/* Circle markers for airports - hover to see details */}
            <Layer
              id="airport-circles"
              type="circle"
              paint={{
                "circle-radius": ["case", ["get", "isHomeBase"], 10, 6],
                "circle-color": ["case", ["get", "isHomeBase"], "#c084fc", "#a78bfa"],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
              }}
            />
          </Source>
          
          {/* Navigation Controls */}
          <NavigationControl 
            position="top-right" 
            showCompass={true}
            showZoom={true}
            visualizePitch={true}
          />
          
          {/* Exploration Instructions Overlay */}
          <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-xl border border-border rounded-lg p-3 shadow-glow pointer-events-none max-w-xs">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-primary-foreground">Explore:</span> Drag to pan • Ctrl/Cmd + scroll to zoom • Right-click drag to rotate • Shift+drag to tilt
            </p>
          </div>
        </Map>

      {/* Tooltip */}
      {/* Flight route tooltip */}
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
      
      {/* Airport hover tooltip */}
      {airportTooltip && (
        <div
          className="absolute z-30 bg-card/95 backdrop-blur-xl border border-secondary/50 rounded-lg px-3 py-2 shadow-glow pointer-events-none"
          style={{
            left: airportTooltip.x,
            top: airportTooltip.y,
            transform: "translate(-50%, -100%) translateY(-12px)",
          }}
        >
          <div className="flex items-center gap-2">
            <div 
              className={`w-2 h-2 rounded-full ${
                airportTooltip.code === "KAPA" ? "bg-[#c084fc]" : "bg-[#a78bfa]"
              }`} 
            />
            <span className="text-sm font-bold text-primary-foreground">
              {airportTooltip.code}
            </span>
            <span className="text-xs text-muted-foreground">
              ({airportTooltip.count} {airportTooltip.count === 1 ? "visit" : "visits"})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

