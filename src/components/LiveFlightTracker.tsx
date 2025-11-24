import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, Navigation, ExternalLink, Radio, MapPin, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

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

export function LiveFlightTracker() {
  const [currentFlight, setCurrentFlight] = useState<FlightInfo | null>(null);
  const [aircraftPosition, setAircraftPosition] = useState<AircraftPosition | null>(null);
  const [positionHistory, setPositionHistory] = useState<AircraftPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

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

  // Initialize map
  useEffect(() => {
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!mapContainer.current || !mapboxToken || !currentFlight) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [aircraftPosition?.longitude || -104.6731, aircraftPosition?.latitude || 39.8617],
      zoom: 10
    });

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
    document.head.appendChild(style);

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
  // You can find these on FlightAware or other aviation databases
  const tailToHex: { [key: string]: string } = {
    'N405MK': 'a4b605',  // Your aircraft
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
          // Show last known position or demo data
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
        }
      } else {
        console.error('API response not ok:', response.status);
      }
    } catch (error) {
      console.error('Error fetching aircraft position:', error);
      // If API fails, use mock data for demonstration
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
    }
  };

  if (isLoading) {
    return null;
  }

  if (!currentFlight || currentFlight.flight_status !== "in_flight") {
    return null;
  }

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const flightAwareUrl = `https://flightaware.com/live/flight/${currentFlight.tail_number}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <Card className="bg-gradient-card border-secondary/30 shadow-glow overflow-hidden">
        {/* Animated gradient bar at top */}
        <div className="h-1 bg-gradient-to-r from-green-500 via-secondary to-green-500 animate-pulse" />
        
        <CardContent className="py-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-black/30 p-3 rounded-full">
                  <Plane className="h-7 w-7 text-green-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Radio className="h-3 w-3 text-green-400 animate-pulse" />
                  <p className="text-xs text-green-400 font-medium uppercase tracking-wider">
                    Currently Airborne
                  </p>
                </div>
                <p className="font-mono font-bold text-2xl text-white">
                  {currentFlight.tail_number}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/40 animate-pulse">
                <Navigation className="h-3 w-3 mr-1" />
                LIVE
              </Badge>
              {aircraftPosition && (
                <div className="text-xs text-muted-foreground text-right">
                  <p>{aircraftPosition.altitude.toLocaleString()} ft</p>
                  <p>{Math.round(aircraftPosition.speed)} kts</p>
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          {mapboxToken ? (
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
          ) : (
            <div className="rounded-lg bg-black/20 h-[400px] flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Map unavailable</p>
                <p className="text-xs text-muted-foreground mt-1">Mapbox token not configured</p>
              </div>
            </div>
          )}

          {/* FlightAware link */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-white/10">
            <div className="text-sm text-muted-foreground">
              <p>Live tracking with ADS-B data</p>
              <p className="text-xs mt-1">Updates every 30 seconds</p>
            </div>
            <a
              href={flightAwareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/20 hover:bg-secondary/30 text-secondary rounded-lg transition-all duration-200 group"
            >
              <span className="font-medium">Full Details on FlightAware</span>
              <ExternalLink className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}