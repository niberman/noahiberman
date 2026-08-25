import { useState, useEffect, useRef, useMemo } from "react";
import type { Feature, LineString } from "geojson";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { flightHistory as staticFlightHistory } from "@/data/flights";
import { generateArc, isPuertoRicoIcao } from "@/lib/airport-coordinates";
import {
  extractAirportsFromFlight,
  buildPuertoRicoConnectingSegments,
} from "@/lib/flight-airports";
import { useFlights, useCurrentFlight } from "@/hooks/use-supabase-flights";
import { useAircraftPositionPolling } from "@/hooks/use-aircraft-position";
import type { AircraftPosition } from "@/lib/aircraft-position";
import { useAirportLookupMap } from "@/hooks/use-supabase-airports";
import { useActiveWaypointId } from "@/hooks/use-active-waypoint";
import { HERO_WAYPOINT, WAYPOINT_BY_ID, type MapWaypoint } from "@/data/waypoints";
import { setMapRef } from "@/lib/map-ref";

type RouteFeature = Feature<LineString, { index: number; origin: string; destination: string }>;

/** Match FlightMap: site chrome only after camera hits min zoom (clamped maximum zoom-out). */
const MAP_MIN_ZOOM = 2;
const MAP_MAX_ZOOM = 16;
/** Float tolerance vs getMinZoom(); keep tight so nav does not appear early. */
const AT_MIN_ZOOM_TOLERANCE = 0.02;

/** `onReady` fires on the map's first frame — or right away when there is no
 *  map to wait for — so Home can drop the loading state it holds. */
export function BackgroundFlightMap({ onReady }: { onReady?: () => void }) {
  const { data: supabaseFlights } = useFlights();
  const { lookupMap: airportCoordsMap } = useAirportLookupMap();
  const flightHistory = useMemo(() => supabaseFlights ?? staticFlightHistory, [supabaseFlights]);

  const getAirportCoordinates = (code: string): [number, number] | null => {
    return airportCoordsMap[code.toUpperCase()] || null;
  };

  const { data: currentFlight } = useCurrentFlight();
  const [aircraftPosition, setAircraftPosition] = useState<AircraftPosition | null>(null);
  const [positionHistory, setPositionHistory] = useState<AircraftPosition[]>([]);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  // No token or no hardware-accelerated WebGL: the map never mounts, so the
  // loading state must not sit there forever waiting for a first frame.
  const [mapUnavailable, setMapUnavailable] = useState(false);
  useEffect(() => {
    if (mapLoaded || mapUnavailable) onReady?.();
  }, [mapLoaded, mapUnavailable, onReady]);
  const activeWaypointId = useActiveWaypointId();
  const isInFlightSection = activeWaypointId === "follow-my-flight";
  const [isInteractive, setIsInteractive] = useState(false);
  const rotationRef = useRef<number | null>(null);
  const airportVisitsRef = useRef<Map<string, number>>(new Map());
  const airportFeaturesRef = useRef<GeoJSON.Feature<GeoJSON.Point>[]>([]);
  const [hoveredAirport, setHoveredAirport] = useState<{ code: string; count: number; x: number; y: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  /** After zoomend at min zoom, allow nav (z-110) above the map; false while zoomed in or mid-gesture. */
  const [revealSiteNavOverMap, setRevealSiteNavOverMap] = useState(false);
  // Refs mirroring state for use inside long-lived rAF/closures.
  const activeWaypointIdRef = useRef(activeWaypointId);
  useEffect(() => {
    activeWaypointIdRef.current = activeWaypointId;
  }, [activeWaypointId]);

  // Leaving the follow-my-flight waypoint disables interactive mode.
  useEffect(() => {
    if (!isInFlightSection && isInteractive) {
      setIsInteractive(false);
    }
  }, [isInFlightSection, isInteractive]);

  // Allow escape key to exit interactive mode quickly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isInteractive) {
        setIsInteractive(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isInteractive]);

  // Listen for custom event to enable interactive mode from other components
  useEffect(() => {
    const handleEnableInteractive = () => {
      setIsInteractive(true);
    };
    window.addEventListener("enableFlightMapInteractive", handleEnableInteractive);
    return () => window.removeEventListener("enableFlightMapInteractive", handleEnableInteractive);
  }, []);

  // Interactive mode is gated to the follow-my-flight waypoint only.
  const shouldEnableInteractions = isInFlightSection && isInteractive;
  const shouldEnableInteractionsRef = useRef(shouldEnableInteractions);
  useEffect(() => {
    shouldEnableInteractionsRef.current = shouldEnableInteractions;
  }, [shouldEnableInteractions]);

  // True on the effect run right after explore mode ends, so the return
  // flight can be snappier than the scroll-storytelling durations.
  const wasInteractiveRef = useRef(false);
  // Bumped when airport features finish loading, so explore mode can frame
  // all flights even if the user entered it before the data arrived.
  const [airportsVersion, setAirportsVersion] = useState(0);
  const exploreFramedRef = useRef(false);

  // One cinematic zoom-out that frames every flight. Returns false when the
  // airport data hasn't loaded yet. Used both on entering explore mode and by
  // the `fitRoutes` waypoint, which makes the same "every route, every
  // airport" promise — hence the padding/duration overrides, since that stop
  // has to leave room for the bottom-centered card.
  const frameAllFlights = (
    opts?: { padding?: mapboxgl.PaddingOptions | number; duration?: number },
  ): boolean => {
    const m = map.current;
    const airportFeatures = airportFeaturesRef.current;
    if (!m || airportFeatures.length === 0) return false;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const allFlightsBounds = new mapboxgl.LngLatBounds();
    airportFeatures.forEach((f) =>
      allFlightsBounds.extend(f.geometry.coordinates as [number, number]),
    );
    m.fitBounds(allFlightsBounds, {
      padding: opts?.padding ?? (window.innerWidth < 640 ? 48 : 80),
      pitch: 0,
      bearing: 0,
      maxZoom: 6,
      duration: prefersReducedMotion ? 0 : opts?.duration ?? 1600,
      essential: true,
    });
    return true;
  };

  /** Padding for the `fitRoutes` waypoint: clears the nav and the card. */
  const fitRoutesPadding = (): mapboxgl.PaddingOptions =>
    window.innerWidth < 640
      ? { top: 88, bottom: 240, left: 20, right: 20 }
      : { top: 110, bottom: 200, left: 48, right: 48 };

  // Drive the camera based on the active waypoint and interactive state.
  // Three modes:
  //   1. Interactive (user clicked Explore on the flight waypoint) — enable
  //      gestures, flatten view, no rotation.
  //   2. Hero waypoint — fly to the wide view, then start slow rotation.
  //   3. Any other waypoint — fly to its framing and sit still.
  // Live in-flight tracking overrides everything (handled in its own effect).
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Always cancel any rotation before applying a new mode — including when a
    // flight goes live mid-session (the poll makes that routine), or the hero
    // rotation keeps spinning under the live-tracking view.
    if (rotationRef.current) {
      cancelAnimationFrame(rotationRef.current);
      rotationRef.current = null;
    }

    if (currentFlight?.flight_status === "in_flight") return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (shouldEnableInteractions) {
      // Frame every flight (the waypoint promises "every route, every
      // airport") instead of leaving the user at the waypoint's zoom-6.5
      // framing. If the data hasn't loaded yet, the airportsVersion effect
      // below retries once it arrives.
      exploreFramedRef.current = frameAllFlights();
      if (!exploreFramedRef.current) {
        map.current.easeTo({ pitch: 0, bearing: 0, duration: prefersReducedMotion ? 0 : 500 });
      }
      map.current.dragPan.enable();
      map.current.dragRotate.enable();
      map.current.scrollZoom.enable();
      map.current.doubleClickZoom.enable();
      map.current.touchZoomRotate.enable();
      map.current.touchPitch.enable();
      map.current.keyboard.enable();
      drawWaypointArc(null);
      wasInteractiveRef.current = true;
      return;
    }

    const returningFromExplore = wasInteractiveRef.current;
    wasInteractiveRef.current = false;
    exploreFramedRef.current = false;

    map.current.dragPan.disable();
    map.current.dragRotate.disable();
    map.current.scrollZoom.disable();
    map.current.doubleClickZoom.disable();
    map.current.touchZoomRotate.disable();
    map.current.touchPitch.disable();
    map.current.keyboard.disable();

    const wp: MapWaypoint = WAYPOINT_BY_ID[activeWaypointId] ?? HERO_WAYPOINT;

    const applyCamera = () => {
      const m = map.current;
      if (!m) return;

      // The climax waypoint frames the real route bounds instead of a fixed
      // center/zoom, which went stale as the logbook grew and left Arizona and
      // Puerto Rico off-screen. Returns false until the airport data lands;
      // the airportsVersion effect below retries.
      const framed =
        wp.fitRoutes === true &&
        frameAllFlights({
          padding: fitRoutesPadding(),
          duration: returningFromExplore ? 1200 : wp.duration ?? 1800,
        });

      if (framed) {
        // fitBounds already moved the camera.
      } else if (prefersReducedMotion) {
        m.jumpTo({
          center: wp.center,
          zoom: wp.zoom,
          pitch: wp.pitch ?? 45,
          bearing: wp.bearing ?? 0,
        });
      } else {
        m.flyTo({
          center: wp.center,
          zoom: wp.zoom,
          pitch: wp.pitch ?? 45,
          bearing: wp.bearing ?? 0,
          // Waypoint durations are tuned for scroll storytelling; the return
          // from explore mode should feel like closing a panel, not a tour.
          duration: returningFromExplore ? 1200 : wp.duration ?? 1800,
          essential: true,
          curve: returningFromExplore ? 1.2 : 1.4,
        });
      }

      drawWaypointArc(wp);

      // Resume slow rotation only at hero, after the flyTo completes.
      // Skipped under reduced motion — no autonomous camera movement.
      if (wp.id === HERO_WAYPOINT.id && !prefersReducedMotion) {
        const startRotation = () => {
          if (activeWaypointIdRef.current !== HERO_WAYPOINT.id) return;
          if (shouldEnableInteractionsRef.current) return;
          if (rotationRef.current) return;
          let bearing = m.getBearing();
          const tick = () => {
            if (!map.current) return;
            if (activeWaypointIdRef.current !== HERO_WAYPOINT.id) {
              rotationRef.current = null;
              return;
            }
            if (shouldEnableInteractionsRef.current) {
              rotationRef.current = null;
              return;
            }
            // Don't fight in-progress flyTo — wait for it.
            if (!map.current.isMoving()) {
              bearing += 0.02;
              map.current.setBearing(bearing);
            }
            rotationRef.current = requestAnimationFrame(tick);
          };
          rotationRef.current = requestAnimationFrame(tick);
        };
        m.once("moveend", startRotation);
      }
    };

    // If the camera is still mid-flight from the previous waypoint (fast
    // scrolling), wait a beat before retargeting so a flick through several
    // stops becomes one smooth flight to where the user settles instead of
    // lurching through every intermediate flyTo. The effect cleanup clears
    // the timer whenever a newer waypoint arrives first.
    let settleTimer: number | undefined;
    if (map.current.isMoving()) {
      settleTimer = window.setTimeout(applyCamera, 200);
    } else {
      applyCamera();
    }
    return () => {
      if (settleTimer !== undefined) window.clearTimeout(settleTimer);
    };
  }, [activeWaypointId, shouldEnableInteractions, mapLoaded, currentFlight]);

  // If the all-flights framing was requested before the airport data loaded,
  // deliver it as soon as it arrives — for explore mode and for the
  // `fitRoutes` waypoint alike.
  useEffect(() => {
    if (!mapLoaded || exploreFramedRef.current) return;
    if (shouldEnableInteractions) {
      exploreFramedRef.current = frameAllFlights();
      return;
    }
    if (WAYPOINT_BY_ID[activeWaypointId]?.fitRoutes) {
      frameAllFlights({ padding: fitRoutesPadding() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airportsVersion]);

  // Draw or clear the IFR-style arc for waypoints with `arcTo`.
  const drawWaypointArc = (wp: MapWaypoint | null) => {
    if (!map.current) return;
    const sourceId = "waypoint-arc";
    const lineId = "waypoint-arc-line";
    const glowId = "waypoint-arc-glow";

    [lineId, glowId].forEach((id) => {
      if (map.current?.getLayer(id)) map.current.removeLayer(id);
    });
    if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);

    if (!wp?.arcTo) return;

    const arc = generateArc(wp.center, wp.arcTo, 64);
    map.current.addSource(sourceId, {
      type: "geojson",
      lineMetrics: true,
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: arc },
      },
    });
    map.current.addLayer({
      id: glowId,
      type: "line",
      source: sourceId,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#fde047",
        "line-width": 10,
        "line-opacity": 0.22,
        "line-blur": 6,
      },
    });
    map.current.addLayer({
      id: lineId,
      type: "line",
      source: sourceId,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-gradient": [
          "interpolate",
          ["linear"],
          ["line-progress"],
          0,
          "#fde047",
          1,
          "#f59e0b",
        ],
        "line-width": 2.6,
        "line-opacity": 0.95,
      },
    });
  };

  useAircraftPositionPolling(
    currentFlight?.tail_number,
    currentFlight?.flight_status === "in_flight",
    (position) => {
      setAircraftPosition(position);
      setPositionHistory((prev) => [...prev.slice(-19), position]);
    },
    { demoSpread: 2 },
  );

  // Initialize map
  useEffect(() => {
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!mapContainer.current || !mapboxToken) {
      setMapUnavailable(true);
      return;
    }

    // Software WebGL (GPU-less browsers, Lighthouse) rasterizes every frame on
    // the main thread — tens of seconds of jank. Skip the map there; the page
    // already renders fine without it (same path as a missing token).
    const glProbe = document.createElement("canvas").getContext("webgl2", {
      failIfMajorPerformanceCaveat: true,
    });
    if (!glProbe) {
      setMapUnavailable(true);
      return;
    }
    glProbe.getExtension("WEBGL_lose_context")?.loseContext();

    mapboxgl.accessToken = mapboxToken;
    
    // Detect if mobile device
    const isMobile = window.innerWidth < 640;
    
    // Create map with appropriate style and initial view
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Dark style for faint background
      center: [-105.5, 41.5], // Center on Colorado/Wyoming region
      zoom: isMobile ? 4 : window.innerWidth < 768 ? 5.5 : 6.5, // Better zoom for small screens
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      pitch: isMobile ? 25 : 45, // Less dramatic angle on mobile for better view
      bearing: -15,
      interactive: true,
      attributionControl: false,
      // All interactions disabled by default - enabled when user clicks "Explore Map"
      dragRotate: false,
      dragPan: false,
      keyboard: false,
      doubleClickZoom: false,
      touchZoomRotate: false,
      touchPitch: false,
      scrollZoom: false, // Disabled to allow page scrolling
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      setMapRef(map.current);

      // Reduce the opacity of all map layers to make them very faint
      if (map.current) {
        // Dim all the base map layers
        const layers = map.current.getStyle().layers;
        layers?.forEach((layer) => {
          if (layer.type === 'background') {
            map.current!.setPaintProperty(layer.id, 'background-opacity', 0.4);
          } else if (layer.type === 'fill') {
            map.current!.setPaintProperty(layer.id, 'fill-opacity', 0.4);
          } else if (layer.type === 'line') {
            map.current!.setPaintProperty(layer.id, 'line-opacity', 0.55);
          } else if (layer.type === 'symbol') {
            map.current!.setPaintProperty(layer.id, 'text-opacity', 0.75);
            map.current!.setPaintProperty(layer.id, 'icon-opacity', 0.7);
          } else if (layer.type === 'raster') {
            map.current!.setPaintProperty(layer.id, 'raster-opacity', 0.4);
          }
        });
      }
      
      // Routes themselves are drawn by the effect that watches `mapLoaded`;
      // this closure still sees mapLoaded === false, so it can only wire up
      // the hover handlers (layer-scoped listeners may predate the layer).
      if (!currentFlight || currentFlight.flight_status !== "in_flight") {
        // Set up hover handlers for airport circles
        map.current.on('mouseenter', 'airport-circles', (e) => {
          if (map.current) {
            map.current.getCanvas().style.cursor = 'pointer';
          }
          if (e.features && e.features[0]) {
            const props = e.features[0].properties as { code: string; count: number };
            setHoveredAirport({
              code: props.code,
              count: props.count,
              x: e.point.x,
              y: e.point.y,
            });
          }
        });

        map.current.on('mouseleave', 'airport-circles', () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = '';
          }
          setHoveredAirport(null);
        });

        map.current.on('mousemove', 'airport-circles', (e) => {
          if (e.features && e.features[0]) {
            const props = e.features[0].properties as { code: string; count: number };
            setHoveredAirport({
              code: props.code,
              count: props.count,
              x: e.point.x,
              y: e.point.y,
            });
          }
        });
      }
      // Rotation is now driven by the active-waypoint effect; nothing to start here.
    });

    return () => {
      if (rotationRef.current) {
        cancelAnimationFrame(rotationRef.current);
      }
      setMapRef(null);
      map.current?.remove();
    };
  }, []);

  // Only treat "maximum zoom out" when the gesture has ended at the clamp (zoomend), not while still zooming out.
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;
    const atMinZoom = () => m.getZoom() <= m.getMinZoom() + AT_MIN_ZOOM_TOLERANCE;

    const onZoom = () => {
      if (m.getZoom() > m.getMinZoom() + AT_MIN_ZOOM_TOLERANCE) {
        setRevealSiteNavOverMap(false);
      }
    };
    const onZoomEnd = () => {
      setRevealSiteNavOverMap(atMinZoom());
    };

    m.on("zoom", onZoom);
    m.on("zoomend", onZoomEnd);
    return () => {
      m.off("zoom", onZoom);
      m.off("zoomend", onZoomEnd);
    };
  }, [mapLoaded]);

  // Entering explore mode: hide nav until user hits min zoom again (unless already clamped there).
  useEffect(() => {
    if (!shouldEnableInteractions || !map.current || !mapLoaded) {
      if (!shouldEnableInteractions) setRevealSiteNavOverMap(false);
      return;
    }
    const m = map.current;
    setRevealSiteNavOverMap(m.getZoom() <= m.getMinZoom() + AT_MIN_ZOOM_TOLERANCE);
  }, [shouldEnableInteractions, mapLoaded]);

  useEffect(() => {
    const showSiteNav = !shouldEnableInteractions || revealSiteNavOverMap;
    window.dispatchEvent(
      new CustomEvent("flightMapNavVisibilityChange", {
        detail: { visible: showSiteNav },
      })
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("flightMapNavVisibilityChange", {
          detail: { visible: true },
        })
      );
    };
  }, [shouldEnableInteractions, revealSiteNavOverMap]);

  // Re-draw routes when Supabase data loads/changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    if (!currentFlight || currentFlight.flight_status !== "in_flight") {
      addHistoricalRoutes();
    }
  }, [flightHistory, airportCoordsMap, mapLoaded]);

  // Add historical flight routes to the map
  const addHistoricalRoutes = () => {
    if (!map.current || !mapLoaded) return;

    const kapaCoords = getAirportCoordinates("KAPA");
    if (!kapaCoords) {
      console.warn("Cannot render hub routes without KAPA coordinates");
      return;
    }

    const visitedAirports = new Set<string>();
    flightHistory.forEach((flight) => {
      extractAirportsFromFlight(flight).forEach((code) => visitedAirports.add(code));
    });
    visitedAirports.delete("KAPA");

    const hubFeatures: RouteFeature[] = Array.from(visitedAirports)
      .filter((code) => !isPuertoRicoIcao(code))
      .map((code, index) => {
        const destinationCoords = getAirportCoordinates(code);
        if (!destinationCoords) {
          console.warn(`Missing coordinates for visited airport: ${code}`);
          return null;
        }

        const arc = generateArc(kapaCoords, destinationCoords, 50);
        const feature: RouteFeature = {
          type: "Feature",
          properties: {
            index,
            origin: "KAPA",
            destination: code,
          },
          geometry: {
            type: "LineString",
            coordinates: arc,
          },
        };

        return feature;
      })
      .filter((feature): feature is RouteFeature => feature !== null);

    const prSegments = buildPuertoRicoConnectingSegments(
      flightHistory,
      getAirportCoordinates
    );
    const prFeatures: RouteFeature[] = prSegments.map((seg, i) => ({
      type: "Feature",
      properties: {
        index: hubFeatures.length + i,
        origin: seg.originCode,
        destination: seg.destinationCode,
      },
      geometry: {
        type: "LineString",
        coordinates: seg.arc,
      },
    }));

    const routes: RouteFeature[] = [...hubFeatures, ...prFeatures];

    // Add routes as a source
    if (map.current.getSource("flight-routes")) {
      ["flight-routes-highlight", "flight-routes-lines", "flight-routes-glow"].forEach((layerId) => {
        if (map.current?.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
      });
      map.current.removeSource("flight-routes");
    }

    map.current.addSource("flight-routes", {
      type: "geojson",
      lineMetrics: true,
      data: {
        type: "FeatureCollection",
        features: routes,
      },
    });

    // Add glow effect layer underneath
    map.current.addLayer({
      id: "flight-routes-glow",
      type: "line",
      source: "flight-routes",
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#a855f7",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 4, 7, 7, 12, 10],
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.16, 8, 0.12, 12, 0.06],
        "line-blur": 5,
      },
    });

    // Add the routes layer with gradient effect on top
    map.current.addLayer({
      id: "flight-routes-lines",
      type: "line",
      source: "flight-routes",
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
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
        // Ramp down when zoomed in: at a certificate stop the hub spokes are
        // just streaks across the frame, at the wide reveal they are the story.
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.6, 7, 2.6, 12, 2],
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.85, 8, 0.7, 12, 0.28],
      },
    });

    // Accent highlight layer
    map.current.addLayer({
      id: "flight-routes-highlight",
      type: "line",
      source: "flight-routes",
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#fdf4ff",
        "line-width": 0.7,
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.3, 8, 0.25, 12, 0.1],
      },
    });

    // Count visits to each airport
    const airportVisits = new Map<string, number>();
    flightHistory.forEach((flight) => {
      extractAirportsFromFlight(flight).forEach((code) => {
        airportVisits.set(code, (airportVisits.get(code) || 0) + 1);
      });
    });

    // Add airport markers using native Mapbox layers for perfect alignment
    const markerAirports = new Set<string>(visitedAirports);
    markerAirports.add("KAPA");

    // Create GeoJSON features for airport points
    const airportFeatures: GeoJSON.Feature<GeoJSON.Point>[] = [];
    markerAirports.forEach((code) => {
      const coords = getAirportCoordinates(code);
      if (!coords) return;
      
      airportFeatures.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: coords,
        },
        properties: {
          code,
          count: airportVisits.get(code) || 0,
          isHomeBase: code === "KAPA",
        },
      });
    });

    // Clean up existing airport sources/layers before re-adding
    if (map.current.getSource("airport-points")) {
      ["airport-labels", "airport-circles", "airport-glow"].forEach((layerId) => {
        if (map.current?.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
      });
      map.current.removeSource("airport-points");
    }

    // Add airport points source
    map.current.addSource("airport-points", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: airportFeatures,
      },
    });

    // Add circle layer for airport dots - these render on the map canvas
    // so they align perfectly with lines at any pitch/rotation
    map.current.addLayer({
      id: "airport-circles",
      type: "circle",
      source: "airport-points",
      paint: {
        // Scale with zoom so the whole-network shot reads as a constellation
        // rather than a pile of blobs, and close-ups still get a solid marker.
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          3, ["case", ["get", "isHomeBase"], 4, 2.5],
          7, ["case", ["get", "isHomeBase"], 6.5, 4],
          11, ["case", ["get", "isHomeBase"], 8, 5],
        ],
        "circle-color": ["case", ["get", "isHomeBase"], "#c084fc", "#a78bfa"],
        "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 3, 0.8, 7, 1.4, 11, 2],
        "circle-stroke-color": "#ffffff",
      },
    });

    // Store airport data for hover tooltip
    airportVisitsRef.current = airportVisits;
    airportFeaturesRef.current = airportFeatures;
    setAirportsVersion((v) => v + 1);
  };

  // Update live aircraft position on map
  useEffect(() => {
    if (!map.current || !aircraftPosition || !mapLoaded) return;

    // Clear historical routes when flying
    if (map.current.getSource("flight-routes")) {
      ["flight-routes-highlight", "flight-routes-lines", "flight-routes-glow"].forEach((layerId) => {
        if (map.current?.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
      });
      map.current.removeSource("flight-routes");
    }

    // Remove existing marker
    if (marker.current) {
      marker.current.remove();
    }

    // Create animated aircraft marker
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="
        position: relative;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          inset: -10px;
          background: radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, transparent 70%);
          border-radius: 50%;
          animation: pulse 2s infinite;
        "></div>
        <div style="
          position: relative;
          transform: rotate(${aircraftPosition.heading}deg);
        ">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2C10.67 2 10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z" fill="#22c55e" stroke="#fff" stroke-width="0.5"/>
          </svg>
        </div>
      </div>
    `;

    // Add CSS animation if not already present
    if (!document.head.querySelector('style[data-bg-aircraft-marker]')) {
      const style = document.createElement('style');
      style.setAttribute('data-bg-aircraft-marker', 'true');
      style.textContent = `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(2); opacity: 0.3; }
          100% { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    marker.current = new mapboxgl.Marker(el)
      .setLngLat([aircraftPosition.longitude, aircraftPosition.latitude])
      .addTo(map.current);

    // Smoothly pan to aircraft position
    map.current.easeTo({
      center: [aircraftPosition.longitude, aircraftPosition.latitude],
      zoom: 7,
      duration: 2000
    });

    // Draw live flight path
    if (positionHistory.length > 1) {
      const sourceId = 'live-flight-path';
      const layerId = 'live-flight-path-line';

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
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#22c55e',
          'line-width': 2,
          'line-opacity': 0.6
        }
      });
    }
  }, [aircraftPosition, positionHistory, mapLoaded]);

  // Restore historical routes when a live flight ends. Framing is handled
  // by the active-waypoint effect, which re-runs when `currentFlight` changes.
  useEffect(() => {
    if (!currentFlight && mapLoaded && map.current) {
      if (marker.current) {
        marker.current.remove();
        marker.current = null;
      }
      if (map.current.getLayer('live-flight-path-line')) {
        map.current.removeLayer('live-flight-path-line');
        map.current.removeSource('live-flight-path');
      }
      // Drop the ended flight's track so the next flight's path doesn't
      // connect to it.
      setAircraftPosition(null);
      setPositionHistory(prev => (prev.length ? [] : prev));
      addHistoricalRoutes();
    }
  }, [currentFlight, mapLoaded]);


  const isMapCardActive = isInFlightSection;
  /** Nav uses z-110; cover it until zoomend at min zoom so the menu never hovers early. */
  const mapAboveNavWhileExploring = shouldEnableInteractions && !revealSiteNavOverMap;

  return (
    <>
      {/* The map container - z-index changes based on interactive state */}
      <div 
        className={`fixed inset-0 w-full h-full transition-all duration-700 ${
          isMapCardActive
            ? shouldEnableInteractions
              ? mapAboveNavWhileExploring
                ? "pointer-events-auto z-[115]"
                : "pointer-events-auto z-[100]"
              : 'pointer-events-none z-0'
            : 'pointer-events-none z-0'
        }`}
      >
        <div 
          ref={mapContainer} 
          className="w-full h-full"
        />
        
        {/* Instruction hint while actively interacting */}
        {shouldEnableInteractions && (
          <div className="absolute bottom-[env(safe-area-inset-bottom,24px)] left-1/2 -translate-x-1/2 mb-4 z-[110] pointer-events-none">
            <div className="bg-black/70 backdrop-blur-md rounded-full px-4 py-2 text-white/80 text-xs sm:text-sm font-medium animate-pulse">
              Pinch to zoom • Drag to pan
            </div>
          </div>
        )}
        
        {/* Flying mode: Dramatic visual overlay */}
        {currentFlight && currentFlight.flight_status === "in_flight" && (
          <>
            {/* Animated border pulse */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 border-4 border-green-500/30 animate-pulse" />
              <div className="absolute inset-4 border-2 border-green-400/20 animate-ping" style={{ animationDuration: '3s' }} />
            </div>
            
            {/* Corner indicators */}
            <div className="absolute top-2 sm:top-4 left-2 sm:left-4 flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-green-500/20 to-transparent px-2 sm:px-4 py-1.5 sm:py-2 rounded-r-full pointer-events-none animate-pulse">
              <div className="h-2 w-2 sm:h-3 sm:w-3 bg-green-400 rounded-full animate-ping" />
              <span className="text-green-400 font-bold text-[10px] sm:text-xs md:text-sm tracking-wider">LIVE</span>
            </div>
            
            <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-green-500/20 to-transparent px-2 sm:px-4 py-1.5 sm:py-2 rounded-r-full pointer-events-none animate-pulse">
              <div className="h-2 w-2 sm:h-3 sm:w-3 bg-green-400 rounded-full animate-ping" />
              <span className="text-green-400 font-bold text-[10px] sm:text-xs md:text-sm tracking-wider">TRACKING</span>
            </div>
          </>
        )}
        
        {/* Gradient overlays for better text readability - only when NOT interactive */}
        {!shouldEnableInteractions && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Top gradient for header */}
            <div className="absolute top-0 left-0 right-0 h-24 sm:h-32 bg-gradient-to-b from-background/90 via-background/40 to-transparent" />
            
            {/* Bottom gradient for footer */}
            <div className="absolute bottom-0 left-0 right-0 h-20 sm:h-24 bg-gradient-to-t from-background/70 via-background/30 to-transparent" />
            
            {/* Subtle side gradients */}
            <div className="absolute inset-y-0 left-0 w-2 sm:w-4 md:w-8 bg-gradient-to-r from-background/20 to-transparent" />
            <div className="absolute inset-y-0 right-0 w-2 sm:w-4 md:w-8 bg-gradient-to-l from-background/20 to-transparent" />
            
            {/* Vignette effect */}
            <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-background/20" />
          </div>
        )}
      </div>

      {/* Airport hover tooltip - fixed positioning so it works regardless of parent */}
      {hoveredAirport && (
        <div
          ref={tooltipRef}
          className="fixed z-[200] bg-black/95 backdrop-blur-xl border-2 border-purple-500/70 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 shadow-xl pointer-events-none"
          style={{
            left: hoveredAirport.x,
            top: hoveredAirport.y,
            transform: 'translate(-50%, -100%) translateY(-12px)',
          }}
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${hoveredAirport.code === 'KAPA' ? 'bg-purple-400' : 'bg-purple-300'}`} />
            <span className={`text-xs sm:text-sm font-bold ${hoveredAirport.code === 'KAPA' ? 'text-purple-400' : 'text-purple-300'}`}>
              {hoveredAirport.code}
            </span>
            <span className="text-purple-300/70 text-xs sm:text-sm">
              ({hoveredAirport.count})
            </span>
          </div>
        </div>
      )}

      {/* The Click-to-Explore CTA now lives on the follow-my-flight waypoint
          card (see waypoints.ts), which dispatches `enableFlightMapInteractive`. */}

      {/* Exit affordance when interactive */}
      {shouldEnableInteractions && (
        <button
          onClick={() => setIsInteractive(false)}
          className={`fixed top-[env(safe-area-inset-top,16px)] left-3 sm:left-4 z-[120] 
                     bg-black/90 hover:bg-black active:bg-black/90 backdrop-blur-xl 
                     rounded-xl px-4 sm:px-5 py-3 sm:py-3.5 
                     text-white text-sm sm:text-base font-semibold 
                     transition-all active:scale-95
                     flex items-center gap-2.5 
                     shadow-2xl border border-white/30
                     min-h-[48px] ${
                       revealSiteNavOverMap ? "mt-16 sm:mt-20" : "mt-0"
                     }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Exit Map</span>
        </button>
      )}
      
    </>
  );
}
