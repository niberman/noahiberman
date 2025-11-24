import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { flightHistory } from "@/data/flights";
import { getAirportCoordinates, generateArc } from "@/lib/airport-coordinates";

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

export function BackgroundFlightMap() {
  const [currentFlight, setCurrentFlight] = useState<FlightInfo | null>(null);
  const [aircraftPosition, setAircraftPosition] = useState<AircraftPosition | null>(null);
  const [positionHistory, setPositionHistory] = useState<AircraftPosition[]>([]);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    loadCurrentFlight();
  }, []);

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
    
    // Create map with appropriate style and initial view
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Dark style for faint background
      center: [-105.5, 41.5], // Center on Colorado/Wyoming region
      zoom: window.innerWidth < 768 ? 5.5 : 6.5, // Closer zoom to see routes clearly
      pitch: 45, // More dramatic angle
      bearing: -15,
      interactive: false, // Disable user interaction for background
      attributionControl: false
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      
      // Reduce the opacity of all map layers to make them very faint
      if (map.current) {
        // Dim all the base map layers
        const layers = map.current.getStyle().layers;
        layers?.forEach((layer) => {
          if (layer.type === 'background') {
            map.current!.setPaintProperty(layer.id, 'background-opacity', 0.2);
          } else if (layer.type === 'fill') {
            map.current!.setPaintProperty(layer.id, 'fill-opacity', 0.1);
          } else if (layer.type === 'line') {
            map.current!.setPaintProperty(layer.id, 'line-opacity', 0.15);
          } else if (layer.type === 'symbol') {
            map.current!.setPaintProperty(layer.id, 'text-opacity', 0.2);
            map.current!.setPaintProperty(layer.id, 'icon-opacity', 0.2);
          } else if (layer.type === 'raster') {
            map.current!.setPaintProperty(layer.id, 'raster-opacity', 0.15);
          }
        });
      }
      
      // Add historical flight routes if not currently flying
      if (!currentFlight || currentFlight.flight_status !== "in_flight") {
        addHistoricalRoutes();
        
        // Add subtle rotation animation for visual interest
        let bearing = -15;
        const rotateCamera = () => {
          bearing += 0.03; // Slower rotation
          if (map.current && !currentFlight) {
            map.current.setBearing(bearing);
            requestAnimationFrame(rotateCamera);
          }
        };
        rotateCamera();
      }
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Add historical flight routes to the map
  const addHistoricalRoutes = () => {
    if (!map.current || !mapLoaded) return;

    // Process flight history to create routes - include ALL flights
    const routes: any[] = [];
    const processedRoutes = new Set<string>(); // Track unique routes to avoid duplicates
    const allAirports = new Set<string>(); // Track all airports
    
    flightHistory.forEach((flight, index) => {
      const originCoords = getAirportCoordinates(flight.route.originCode);
      const destCoords = getAirportCoordinates(flight.route.destinationCode);
      
      // Track all airports
      allAirports.add(flight.route.originCode);
      allAirports.add(flight.route.destinationCode);
      
      if (originCoords && destCoords && flight.route.originCode !== flight.route.destinationCode) {
        // Create a unique key for this route (bidirectional)
        const routeKey1 = `${flight.route.originCode}-${flight.route.destinationCode}`;
        const routeKey2 = `${flight.route.destinationCode}-${flight.route.originCode}`;
        
        // Only add if we haven't seen this route before
        if (!processedRoutes.has(routeKey1) && !processedRoutes.has(routeKey2)) {
          const arc = generateArc(originCoords, destCoords, 50);
          routes.push({
            type: 'Feature',
            properties: {
              index,
              origin: flight.route.originCode,
              destination: flight.route.destinationCode
            },
            geometry: {
              type: 'LineString',
              coordinates: arc
            }
          });
          processedRoutes.add(routeKey1);
        }
      }
    });

    console.log(`Adding ${routes.length} unique flight routes connecting ${allAirports.size} airports`);
    console.log('Airports:', Array.from(allAirports).sort().join(', '));

    // Add routes as a source
    if (map.current.getSource('flight-routes')) {
      map.current.removeLayer('flight-routes-lines');
      map.current.removeLayer('flight-routes-glow');
      map.current.removeSource('flight-routes');
    }

    map.current.addSource('flight-routes', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: routes
      }
    });

    // Add glow effect layer underneath
    map.current.addLayer({
      id: 'flight-routes-glow',
      type: 'line',
      source: 'flight-routes',
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      },
      paint: {
        'line-color': '#60a5fa',
        'line-width': 6,
        'line-opacity': 0.3,
        'line-blur': 3
      }
    });

    // Add the routes layer with gradient effect on top
    map.current.addLayer({
      id: 'flight-routes-lines',
      type: 'line',
      source: 'flight-routes',
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      },
      paint: {
        'line-color': '#60a5fa', // Brighter blue
        'line-width': 3, // Even thicker for better visibility
        'line-opacity': 0.75, // More visible
        'line-blur': 0.5
      }
    });

    // Add airport markers
    const airports = new Set<string>();
    flightHistory.forEach(flight => {
      airports.add(flight.route.originCode);
      airports.add(flight.route.destinationCode);
    });

    airports.forEach(code => {
      const coords = getAirportCoordinates(code);
      if (coords) {
        const el = document.createElement('div');
        el.className = 'airport-marker';
        el.style.width = '10px';
        el.style.height = '10px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#60a5fa';
        el.style.border = '2px solid #fff';
        el.style.opacity = '0.9';
        el.style.boxShadow = '0 0 12px rgba(96, 165, 250, 1), 0 0 20px rgba(96, 165, 250, 0.5)';

        new mapboxgl.Marker(el)
          .setLngLat(coords as [number, number])
          .addTo(map.current!);
      }
    });
  };

  // Update live aircraft position on map
  useEffect(() => {
    if (!map.current || !aircraftPosition || !mapLoaded) return;

    // Clear historical routes when flying
    if (map.current.getLayer('flight-routes-lines')) {
      map.current.removeLayer('flight-routes-lines');
      map.current.removeSource('flight-routes');
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
        zoom: window.innerWidth < 768 ? 5.5 : 6.5,
        pitch: 45,
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
        .single();

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

  return (
    <div className="fixed inset-0 w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Flying mode: Dramatic visual overlay */}
      {currentFlight && currentFlight.flight_status === "in_flight" && (
        <>
          {/* Animated border pulse */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 border-4 border-green-500/30 animate-pulse" />
            <div className="absolute inset-4 border-2 border-green-400/20 animate-ping" style={{ animationDuration: '3s' }} />
          </div>
          
          {/* Corner indicators */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-gradient-to-r from-green-500/20 to-transparent px-4 py-2 rounded-r-full pointer-events-none animate-pulse">
            <div className="h-3 w-3 bg-green-400 rounded-full animate-ping" />
            <span className="text-green-400 font-bold text-xs md:text-sm tracking-wider">LIVE</span>
          </div>
          
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-gradient-to-r from-green-500/20 to-transparent px-4 py-2 rounded-r-full pointer-events-none animate-pulse">
            <div className="h-3 w-3 bg-green-400 rounded-full animate-ping" />
            <span className="text-green-400 font-bold text-xs md:text-sm tracking-wider">TRACKING</span>
          </div>
        </>
      )}
      
      {/* Gradient overlays for better text readability */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top gradient for header - more transparent */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background/90 via-background/40 to-transparent" />
        
        {/* Bottom gradient for footer - more transparent */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background/70 via-background/30 to-transparent" />
        
        {/* Very subtle side gradients - only when not flying */}
        {(!currentFlight || currentFlight.flight_status !== "in_flight") && (
          <>
            <div className="absolute inset-y-0 left-0 w-4 md:w-8 bg-gradient-to-r from-background/20 to-transparent" />
            <div className="absolute inset-y-0 right-0 w-4 md:w-8 bg-gradient-to-l from-background/20 to-transparent" />
          </>
        )}
        
        {/* Subtle vignette effect for depth */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-background/20" />
      </div>

      {/* Live flight indicator - more prominent */}
      {currentFlight && currentFlight.flight_status === "in_flight" && aircraftPosition && (
        <div className="absolute top-20 md:top-24 right-4 md:right-8 z-50 pointer-events-none animate-fade-in">
          {/* Glowing background effect */}
          <div className="absolute inset-0 bg-green-500/30 rounded-2xl blur-2xl animate-pulse" />
          
          {/* Main card */}
          <div className="relative bg-gradient-to-br from-green-500/30 via-green-600/20 to-green-700/10 backdrop-blur-xl rounded-2xl p-5 md:p-6 text-white border-2 border-green-400/50 shadow-2xl">
            {/* Animated corner accents */}
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-green-400 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-green-400 animate-pulse" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-green-400 animate-pulse" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-green-400 animate-pulse" />
            
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="h-4 w-4 bg-green-400 rounded-full animate-pulse" />
                <div className="absolute inset-0 h-4 w-4 bg-green-400 rounded-full animate-ping" />
                <div className="absolute inset-0 h-4 w-4 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
              </div>
              <span className="text-base md:text-lg font-black tracking-widest text-green-300 drop-shadow-lg">
                ✈ LIVE FLIGHT
              </span>
            </div>
            
            {/* Flight info */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-green-200/80">Aircraft:</span>
                <p className="font-mono text-xl md:text-2xl font-black text-green-300 drop-shadow-lg tracking-wider">
                  {currentFlight.tail_number}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-green-400/30">
                <div>
                  <p className="text-xs text-green-200/70 mb-1">Altitude</p>
                  <p className="text-base md:text-lg font-bold text-white">
                    {aircraftPosition.altitude.toLocaleString()}<span className="text-sm text-green-200/80 ml-1">ft</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-green-200/70 mb-1">Speed</p>
                  <p className="text-base md:text-lg font-bold text-white">
                    {Math.round(aircraftPosition.speed)}<span className="text-sm text-green-200/80 ml-1">kts</span>
                  </p>
                </div>
              </div>
              
              <div className="pt-2 border-t border-green-400/30">
                <p className="text-xs text-green-200/70 mb-1">Heading</p>
                <p className="text-base md:text-lg font-bold text-white">
                  {Math.round(aircraftPosition.heading)}°
                </p>
              </div>
            </div>
            
            {/* Status bar */}
            <div className="mt-4 pt-3 border-t border-green-400/30 flex items-center justify-between">
              <span className="text-xs text-green-200/70">ADS-B Tracking</span>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse" />
                <div className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
