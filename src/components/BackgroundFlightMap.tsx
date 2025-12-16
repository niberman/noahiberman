import { useState, useEffect, useRef } from "react";
import type { Feature, LineString } from "geojson";
import { supabase } from "@/lib/supabase";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { flightHistory } from "@/data/flights";
import { getAirportCoordinates, generateArc } from "@/lib/airport-coordinates";
import { extractAirportsFromFlight } from "@/lib/flight-airports";

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

type RouteFeature = Feature<LineString, { index: number; origin: string; destination: string }>;

export function BackgroundFlightMap() {
  const [currentFlight, setCurrentFlight] = useState<FlightInfo | null>(null);
  const [aircraftPosition, setAircraftPosition] = useState<AircraftPosition | null>(null);
  const [positionHistory, setPositionHistory] = useState<AircraftPosition[]>([]);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isInFlightSection, setIsInFlightSection] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const rotationRef = useRef<number | null>(null);
  const airportVisitsRef = useRef<Map<string, number>>(new Map());
  const airportFeaturesRef = useRef<GeoJSON.Feature<GeoJSON.Point>[]>([]);
  const [hoveredAirport, setHoveredAirport] = useState<{ code: string; count: number; x: number; y: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Require explicit user action to enable interactive mode
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

  useEffect(() => {
    loadCurrentFlight();
  }, []);

  // Detect when the Follow My Flight section is in view
  useEffect(() => {
    const flightSection = document.getElementById('follow-my-flight');
    if (!flightSection) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isInView = entry.isIntersecting && entry.intersectionRatio > 0.2;
        setIsInFlightSection(isInView);
      },
      { threshold: [0, 0.2, 0.5, 0.7, 1] }
    );

    observer.observe(flightSection);
    return () => observer.disconnect();
  }, []);

  // Enable/disable map interactions based on click-to-interact ONLY (not scroll position)
  const shouldEnableInteractions = isInFlightSection && isInteractive;

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    if (shouldEnableInteractions) {
      // Stop rotation when user is interacting with the map
      if (rotationRef.current) {
        cancelAnimationFrame(rotationRef.current);
        rotationRef.current = null;
      }
      // Reset to flat view for better marker/line alignment
      map.current.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 500
      });
      // Enable full interactions
      map.current.dragPan.enable();
      map.current.dragRotate.enable();
      map.current.scrollZoom.enable();
      map.current.doubleClickZoom.enable();
      map.current.touchZoomRotate.enable();
      map.current.touchPitch.enable();
      map.current.keyboard.enable();
    } else {
      // Resume rotation with 3D perspective when not interactive
      map.current.easeTo({
        pitch: 45,
        duration: 500
      });
      // Restart rotation animation only once per disable cycle
      if (!rotationRef.current) {
        let bearing = map.current.getBearing();
        const rotateCamera = () => {
          bearing += 0.02;
          if (map.current && !shouldEnableInteractions) {
            map.current.setBearing(bearing);
            rotationRef.current = requestAnimationFrame(rotateCamera);
          }
        };
        rotationRef.current = requestAnimationFrame(rotateCamera);
      }
      // Disable interactions
      map.current.dragPan.disable();
      map.current.dragRotate.disable();
      map.current.scrollZoom.disable();
      map.current.doubleClickZoom.disable();
      map.current.touchZoomRotate.disable();
      map.current.touchPitch.disable();
      map.current.keyboard.disable();
    }
  }, [shouldEnableInteractions, mapLoaded]);

  // Fetch live position data when we have a tail number
  useEffect(() => {
    if (currentFlight?.tail_number && currentFlight.flight_status === "in_flight") {
      fetchAircraftPosition(currentFlight.tail_number);
      const interval = setInterval(() => {
        fetchAircraftPosition(currentFlight.tail_number);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentFlight]);

  // Initialize map
  useEffect(() => {
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    // Detect if mobile device
    const isMobile = window.innerWidth < 640;
    
    // Create map with appropriate style and initial view
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Dark style for faint background
      center: [-105.5, 41.5], // Center on Colorado/Wyoming region
      zoom: isMobile ? 4 : window.innerWidth < 768 ? 5.5 : 6.5, // Better zoom for small screens
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
      
      // Reduce the opacity of all map layers to make them very faint
      if (map.current) {
        // Dim all the base map layers
        const layers = map.current.getStyle().layers;
        layers?.forEach((layer) => {
          if (layer.type === 'background') {
            map.current!.setPaintProperty(layer.id, 'background-opacity', 0.4);
          } else if (layer.type === 'fill') {
            map.current!.setPaintProperty(layer.id, 'fill-opacity', 0.3);
          } else if (layer.type === 'line') {
            map.current!.setPaintProperty(layer.id, 'line-opacity', 0.4);
          } else if (layer.type === 'symbol') {
            map.current!.setPaintProperty(layer.id, 'text-opacity', 0.5);
            map.current!.setPaintProperty(layer.id, 'icon-opacity', 0.5);
          } else if (layer.type === 'raster') {
            map.current!.setPaintProperty(layer.id, 'raster-opacity', 0.4);
          }
        });
      }
      
      // Add historical flight routes if not currently flying
      if (!currentFlight || currentFlight.flight_status !== "in_flight") {
        addHistoricalRoutes();
        
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
        
        // Add subtle rotation animation for visual interest (only when NOT interactive)
        let bearing = -15;
        const rotateCamera = () => {
          bearing += 0.02; // Slower rotation
          if (map.current && !currentFlight && !isInFlightSection) {
            map.current.setBearing(bearing);
            rotationRef.current = requestAnimationFrame(rotateCamera);
          }
        };
        rotateCamera();
      }
    });

    return () => {
      if (rotationRef.current) {
        cancelAnimationFrame(rotationRef.current);
      }
      map.current?.remove();
    };
  }, []);

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

    const routes: RouteFeature[] = Array.from(visitedAirports)
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
        "line-width": 6,
        "line-opacity": 0.12,
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
        "line-width": 2.8,
        "line-opacity": 0.7,
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
        "line-opacity": 0.25,
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
        "circle-radius": ["case", ["get", "isHomeBase"], 8, 5],
        "circle-color": ["case", ["get", "isHomeBase"], "#c084fc", "#a78bfa"],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });

    // Store airport data for hover tooltip
    airportVisitsRef.current = airportVisits;
    airportFeaturesRef.current = airportFeatures;
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

  // Restore historical routes when landing
  useEffect(() => {
    if (!currentFlight && mapLoaded && map.current) {
      // Clear live tracking elements
      if (marker.current) {
        marker.current.remove();
        marker.current = null;
      }
      if (map.current.getLayer('live-flight-path-line')) {
        map.current.removeLayer('live-flight-path-line');
        map.current.removeSource('live-flight-path');
      }
      
      // Restore historical routes
      addHistoricalRoutes();
      
      // Reset view to Colorado/Wyoming region with better zoom
      map.current.easeTo({
        center: [-105.5, 41.5],
        zoom: window.innerWidth < 640 ? 4.5 : window.innerWidth < 768 ? 5.5 : 6.5,
        pitch: window.innerWidth < 640 ? 30 : 45,
        bearing: -15,
        duration: 2000
      });
    }
  }, [currentFlight, mapLoaded]);

  const loadCurrentFlight = async () => {
    if (!supabase) return;
    
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
    }
  };

  const tailToHex: { [key: string]: string } = {
    'N405MK': 'a4b605',
  };

  const fetchAircraftPosition = async (tailNumber: string) => {
    try {
      const hexCode = tailToHex[tailNumber.toUpperCase()] || '';
      
      if (!hexCode) {
        // Demo data for testing
        const newPosition = {
          latitude: 39.8617 + (Math.random() - 0.5) * 2,
          longitude: -104.6731 + (Math.random() - 0.5) * 2,
          altitude: 8500 + Math.random() * 2000,
          heading: Math.random() * 360,
          speed: 150 + Math.random() * 50,
          timestamp: Date.now()
        };
        setAircraftPosition(newPosition);
        setPositionHistory(prev => [...prev.slice(-19), newPosition]);
        return;
      }

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
          const newPosition = {
            latitude: parseFloat(aircraft.lat),
            longitude: parseFloat(aircraft.lon),
            altitude: parseInt(aircraft.alt_baro) || parseInt(aircraft.alt_geom) || 0,
            heading: parseInt(aircraft.track) || 0,
            speed: parseInt(aircraft.gs) || 0,
            timestamp: Date.now()
          };
          
          setAircraftPosition(newPosition);
          setPositionHistory(prev => [...prev.slice(-19), newPosition]);
        }
      }
    } catch (error) {
      console.error('Error fetching aircraft position:', error);
    }
  };

  const isMapCardActive = isInFlightSection;

  return (
    <>
      {/* The map container - z-index changes based on interactive state */}
      <div 
        className={`fixed inset-0 w-full h-full transition-all duration-700 ${
          isMapCardActive
            ? shouldEnableInteractions
              ? 'pointer-events-auto z-[100]'
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

      {/* CTA button to require explicit user action before map consumes scroll gestures */}
      {isMapCardActive && !shouldEnableInteractions && (
        <button
          onClick={() => setIsInteractive(true)}
          className="fixed bottom-[env(safe-area-inset-bottom,20px)] left-1/2 -translate-x-1/2 mb-4 sm:mb-6 z-[120] 
                     bg-secondary hover:bg-secondary/90 active:bg-secondary/80 
                     backdrop-blur-xl rounded-full 
                     px-6 sm:px-7 py-3.5 sm:py-4 
                     text-secondary-foreground text-sm sm:text-base font-semibold 
                     shadow-2xl transition-all active:scale-95 
                     flex items-center gap-2.5 
                     border-2 border-secondary/60
                     min-h-[52px] min-w-[160px] justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m6 0l-3 3m3-3l-3-3m9 3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Click to Explore Map</span>
        </button>
      )}

      {/* Exit affordance when interactive */}
      {shouldEnableInteractions && (
        <button
          onClick={() => setIsInteractive(false)}
          className="fixed top-[env(safe-area-inset-top,16px)] left-3 sm:left-4 mt-16 sm:mt-20 z-[120] 
                     bg-black/90 hover:bg-black active:bg-black/90 backdrop-blur-xl 
                     rounded-xl px-4 sm:px-5 py-3 sm:py-3.5 
                     text-white text-sm sm:text-base font-semibold 
                     transition-all active:scale-95
                     flex items-center gap-2.5 
                     shadow-2xl border border-white/30
                     min-h-[48px]"
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
