import type { Flight } from "@/data/flights";

const ROUTE_REGEX = /Route:\s*([A-Z0-9\s-]+)/i;
const CODE_REGEX = /\b([A-Z0-9]{2,4})\b/g;

const normalizeAirportCode = (code?: string): string | null => {
  if (!code) return null;
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
  if (!normalized) return null;
  if (normalized.length < 2 || normalized.length > 4) return null;
  return normalized;
};

export const extractAirportsFromFlight = (flight: Flight): string[] => {
  const airports = new Set<string>();

  const addAirport = (code?: string) => {
    const normalized = normalizeAirportCode(code);
    if (normalized) {
      airports.add(normalized);
    }
  };

  addAirport(flight.route.originCode);
  addAirport(flight.route.destinationCode);

  if (flight.description) {
    const routeMatch = flight.description.match(ROUTE_REGEX);
    if (routeMatch) {
      const routeString = routeMatch[1];
      const routeAirports = routeString.match(CODE_REGEX) || [];
      routeAirports.forEach(addAirport);
    }
  }

  return Array.from(airports);
};

export const mapAirportsToFlights = (flights: Flight[]): Map<string, Flight> => {
  const map = new Map<string, Flight>();

  flights.forEach((flight) => {
    extractAirportsFromFlight(flight).forEach((code) => {
      if (!map.has(code)) {
        map.set(code, flight);
      }
    });
  });

  return map;
};

