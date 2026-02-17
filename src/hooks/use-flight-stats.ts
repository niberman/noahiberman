import { useMemo } from 'react';
import { useFlights } from '@/hooks/use-supabase-flights';
import type { Flight } from '@/data/flights';

const MOUNTAIN_AIRPORTS = ['KLXV', 'KASE', 'KTEX', 'KEGE', 'KSBS', '1V6', 'KAEJ', 'KANK'];

export interface FlightStats {
  totalHours: string;
  totalFlights: number;
  uniqueAirports: number;
  mountainHours: string;
  avgFlightDuration: string;
  /** Formatted display string like "562+" */
  totalHoursDisplay: string;
  /** Formatted display string like "300+" */
  totalFlightsDisplay: string;
}

function parseDuration(duration?: string): number {
  if (!duration) return 0;
  const hoursMatch = duration.match(/(\d+)h/);
  const minutesMatch = duration.match(/(\d+)m/);
  const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? parseFloat(minutesMatch[1]) : 0;
  return hours + minutes / 60;
}

function computeStats(flights: Flight[]): FlightStats {
  let totalHours = 0;
  let mountainHours = 0;
  const airports = new Set<string>();

  for (const flight of flights) {
    const hours = parseDuration(flight.duration);
    totalHours += hours;

    // Collect airports
    if (flight.route?.originCode) airports.add(flight.route.originCode.trim().toUpperCase());
    if (flight.route?.destinationCode) airports.add(flight.route.destinationCode.trim().toUpperCase());

    // Extract waypoints from description
    if (flight.description) {
      const routeMatch = flight.description.match(/Route:\s*([A-Z0-9\s-]+)/i);
      if (routeMatch) {
        const codes = routeMatch[1].match(/\b([A-Z][A-Z0-9]{1,3})\b/g) || [];
        codes.forEach(c => airports.add(c.toUpperCase()));
      }
    }

    // Mountain flying check
    const routeStr = [
      flight.route?.originCode,
      flight.route?.destinationCode,
      flight.description || '',
    ].join(' ');

    if (MOUNTAIN_AIRPORTS.some(ap => routeStr.includes(ap))) {
      mountainHours += hours;
    }
  }

  const avg = flights.length > 0 ? totalHours / flights.length : 0;

  return {
    totalHours: totalHours.toFixed(1),
    totalFlights: flights.length,
    uniqueAirports: airports.size,
    mountainHours: mountainHours.toFixed(1),
    avgFlightDuration: avg.toFixed(1),
    totalHoursDisplay: `${Math.floor(totalHours)}+`,
    totalFlightsDisplay: `${flights.length}+`,
  };
}

/**
 * Hook that computes flight statistics from Supabase data.
 * Replaces all hardcoded stats throughout the app.
 */
export function useFlightStats() {
  const { data: flights, isLoading, error } = useFlights();

  const stats = useMemo(() => {
    if (!flights || flights.length === 0) {
      // Fallback defaults while loading
      return {
        totalHours: '0',
        totalFlights: 0,
        uniqueAirports: 0,
        mountainHours: '0',
        avgFlightDuration: '0',
        totalHoursDisplay: '0',
        totalFlightsDisplay: '0',
      } satisfies FlightStats;
    }
    return computeStats(flights);
  }, [flights]);

  return { stats, isLoading, error };
}
