import type { Flight } from "@/data/flights";
import { generateArc, isPuertoRicoIcao } from "@/lib/airport-coordinates";

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

/** Airport codes in route order from `Route:` in description, else origin then destination. */
export function extractOrderedAirportsFromFlight(flight: Flight): string[] {
  const ordered: string[] = [];

  const push = (raw: string) => {
    const n = normalizeAirportCode(raw);
    if (!n) return;
    if (ordered.length === 0 || ordered[ordered.length - 1] !== n) {
      ordered.push(n);
    }
  };

  if (flight.description) {
    const routeMatch = flight.description.match(ROUTE_REGEX);
    if (routeMatch) {
      const routeString = routeMatch[1];
      const matches = routeString.match(new RegExp(CODE_REGEX.source, "gi")) ?? [];
      for (const m of matches) {
        push(m);
      }
      if (ordered.length > 0) {
        return ordered;
      }
    }
  }

  push(flight.route.originCode ?? "");
  push(flight.route.destinationCode ?? "");
  return ordered;
}

export interface PuertoRicoLegSegment {
  flight: Flight;
  originCode: string;
  destinationCode: string;
  originCoords: [number, number];
  destinationCoords: [number, number];
  arc: [number, number][];
}

/**
 * Consecutive TJ–TJ legs from the same flight (multi-stop island trips).
 * Skips KAPA hub lines; use with hub routes that exclude Puerto Rico.
 */
export function buildPuertoRicoConnectingSegments(
  flights: Flight[],
  getCoords: (code: string) => [number, number] | null
): PuertoRicoLegSegment[] {
  const segments: PuertoRicoLegSegment[] = [];
  const seen = new Set<string>();

  for (const flight of flights) {
    const ordered = extractOrderedAirportsFromFlight(flight);
    for (let i = 0; i < ordered.length - 1; i++) {
      const a = ordered[i];
      const b = ordered[i + 1];
      if (!isPuertoRicoIcao(a) || !isPuertoRicoIcao(b)) continue;
      const ca = getCoords(a);
      const cb = getCoords(b);
      if (!ca || !cb) continue;
      const key = `${a}-${b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      segments.push({
        flight,
        originCode: a,
        destinationCode: b,
        originCoords: ca,
        destinationCoords: cb,
        arc: generateArc(ca, cb, 50),
      });
    }
  }
  return segments;
}

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

