/**
 * Airport coordinate lookup using OurAirports public-domain data.
 * The bundled JSON maps ICAO/FAA ident -> [longitude, latitude, name].
 */
import usAirports from '@/data/us-airports.json';

export interface AirportLookupResult {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
}

const airportData = usAirports as Record<string, [number, number, string]>;

/**
 * Look up an airport by ICAO or FAA identifier.
 * Tries the code as-is first, then with a "K" prefix for 3-letter FAA codes.
 */
export function lookupAirport(code: string): AirportLookupResult | null {
  const upper = code.toUpperCase().trim();
  if (!upper) return null;

  const entry = airportData[upper];
  if (entry) {
    return { code: upper, name: entry[2], longitude: entry[0], latitude: entry[1] };
  }

  // Try adding K prefix for 3-letter codes (e.g., APA -> KAPA)
  if (upper.length === 3) {
    const withK = 'K' + upper;
    const kEntry = airportData[withK];
    if (kEntry) {
      return { code: withK, name: kEntry[2], longitude: kEntry[0], latitude: kEntry[1] };
    }
  }

  return null;
}

/**
 * Search airports by partial code or name match (for autocomplete).
 * Returns up to `limit` results.
 */
export function searchAirports(query: string, limit = 10): AirportLookupResult[] {
  const upper = query.toUpperCase().trim();
  if (!upper || upper.length < 2) return [];

  const results: AirportLookupResult[] = [];

  for (const [code, [lon, lat, name]] of Object.entries(airportData)) {
    if (results.length >= limit) break;
    if (code.includes(upper) || name.toUpperCase().includes(upper)) {
      results.push({ code, name, longitude: lon, latitude: lat });
    }
  }

  // Sort exact code matches first
  results.sort((a, b) => {
    const aExact = a.code === upper ? 0 : 1;
    const bExact = b.code === upper ? 0 : 1;
    return aExact - bExact;
  });

  return results;
}
