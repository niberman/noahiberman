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
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-98, 38], // Center of US
      zoom: window.innerWidth < 768 ? 3 : 4, // Wider view on mobile
      pitch: 30,
      bearing: 0,
      interactive: false, // Disable user interaction for background
      attributionControl: false
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      
      // Add historical flight routes if not currently flying
      if (!currentFlight || currentFlight.flight_status !== "in_flight") {
        addHistoricalRoutes();
      }
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Add historical flight routes to the map
  const addHistoricalRoutes = () => {
    if (!map.current || !mapLoaded) return;

    // Process flight history to create routes
    const routes: any[] = [];
    flightHistory.forEach((flight, index) => {
      const originCoords = getAirportCoordinates(flight.route.originCode);
      const destCoords = getAirportCoordinates(flight.route.destinationCode);
      
      if (originCoords && destCoords) {
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
      }
    });

    // Add routes as a source
    if (map.current.getSource('flight-routes')) {
      map.current.removeLayer('flight-routes-lines');
      map.current.removeSource('flight-routes');
    }

    map.current.addSource('flight-routes', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: routes
      }
    });

    // Add the routes layer with gradient effect
    map.current.addLayer({
      id: 'flight-routes-lines',
      type: 'line',
      source: 'flight-routes',
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 1,
        'line-opacity': 0.3,
        'line-blur': 1
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
        el.style.width = '6px';
        el.style.height = '6px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#3b82f6';
        el.style.opacity = '0.5';

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
      
      // Reset view to US
      map.current.easeTo({
        center: [-98, 38],
        zoom: window.innerWidth < 768 ? 3 : 4,
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
      
      {/* Gradient overlays for better text readability */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top gradient for header */}
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-background via-background/80 to-transparent" />
        
        {/* Bottom gradient for footer */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent" />
        
        {/* Side gradients for mobile */}
        <div className="absolute inset-y-0 left-0 w-8 md:w-16 bg-gradient-to-r from-background/50 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-8 md:w-16 bg-gradient-to-l from-background/50 to-transparent" />
      </div>

      {/* Live flight indicator */}
      {currentFlight && currentFlight.flight_status === "in_flight" && aircraftPosition && (
        <div className="absolute top-24 right-4 md:top-28 md:right-8 bg-black/70 backdrop-blur-sm rounded-lg p-3 md:p-4 text-white pointer-events-none animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs md:text-sm font-medium">LIVE TRACKING</span>
          </div>
          <div className="space-y-1 text-xs md:text-sm opacity-90">
            <p className="font-mono">{currentFlight.tail_number}</p>
            <p>{aircraftPosition.altitude.toLocaleString()} ft</p>
            <p>{Math.round(aircraftPosition.speed)} kts</p>
          </div>
        </div>
      )}
    </div>
  );
}
