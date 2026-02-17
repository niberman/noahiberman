/**
 * Client-side parser for ForeFlight digital logbook CSV exports.
 *
 * ForeFlight CSV structure:
 *   - Rows 1-2: Header/blank
 *   - "Aircraft Table" section (rows ~4-80): AircraftID, TypeCode, Year, Make, Model, ...
 *   - "Flights Table" section (rows ~87+): Date, AircraftID, From, To, Route, ...
 *
 * Key flight columns (0-indexed):
 *   [0] Date, [1] AircraftID, [2] From, [3] To, [4] Route,
 *   [11] TotalTime, [52] InstructorComments, [56] PilotComments
 */

import type { Flight } from '@/data/flights';
import { lookupAirport, type AirportLookupResult } from '@/lib/airport-lookup';

export interface ParsedImport {
  flights: Omit<Flight, 'id'>[];
  newAirports: AirportLookupResult[];
  skippedRows: number;
  totalRows: number;
}

interface AircraftInfo {
  make: string;
  model: string;
}

/**
 * Parse a ForeFlight CSV logbook string into flights and new airport coordinates.
 *
 * @param csvText  Raw CSV file content
 * @param existingAirportCodes  Set of airport codes already in the database (to detect new ones)
 * @param existingFlightKeys  Set of "date|from|to|aircraft" keys for dedup
 */
export function parseForeFlight(
  csvText: string,
  existingAirportCodes: Set<string> = new Set(),
  existingFlightKeys: Set<string> = new Set(),
): ParsedImport {
  const lines = csvText.split('\n');

  // ── Parse Aircraft Table ─────────────────────────────────────────────────
  const aircraftMap: Record<string, AircraftInfo> = {};
  let inAircraftTable = false;

  for (let i = 0; i < lines.length && i < 85; i++) {
    const line = lines[i];
    if (line.includes('AircraftID,TypeCode')) {
      inAircraftTable = true;
      continue;
    }
    if (inAircraftTable && line.trim() && !line.startsWith(',,,,')) {
      const parts = line.split(',');
      const id = parts[0]?.trim();
      const make = parts[3]?.trim() || 'Unknown';
      const model = parts[4]?.trim() || 'Aircraft';
      if (id && id.length > 0 && !id.includes('AircraftID')) {
        aircraftMap[id] = { make, model };
      }
    }
  }

  // ── Parse Flights Table ──────────────────────────────────────────────────
  const flights: Omit<Flight, 'id'>[] = [];
  const seenAirports = new Set<string>();
  const newAirportsMap = new Map<string, AirportLookupResult>();
  let inFlightsTable = false;
  let skippedRows = 0;
  let totalRows = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('Date,AircraftID,From')) {
      inFlightsTable = true;
      continue;
    }
    if (!inFlightsTable || !line.trim()) continue;

    const parts = line.split(',');
    const date = parts[0]?.trim();
    if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) continue;

    totalRows++;

    const aircraftId = parts[1]?.trim();
    const from = parts[2]?.trim();
    const to = parts[3]?.trim();
    const route = parts[4]?.trim();
    const totalTime = parseFloat(parts[11]) || 0;

    // Extract comments (handle triple-quoted strings from ForeFlight)
    const instructorComments = parts[52]?.replace(/"""/g, '').replace(/""/g, '').trim() || '';
    const pilotComments = parts[56]?.replace(/"""/g, '').replace(/""/g, '').trim() || '';
    const comments = (instructorComments || pilotComments).replace(/^"|"$/g, '').trim();

    if (totalTime <= 0 || !from || !to || !aircraftId) {
      skippedRows++;
      continue;
    }

    // Deduplication
    const flightKey = `${date}|${from}|${to}|${aircraftId}`;
    if (existingFlightKeys.has(flightKey)) {
      skippedRows++;
      continue;
    }

    // Format duration
    const hours = Math.floor(totalTime);
    const minutes = Math.round((totalTime - hours) * 60);
    const duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    // Look up airport names
    const fromLookup = lookupAirport(from);
    const toLookup = lookupAirport(to);
    const fromName = fromLookup?.name || from;
    const toName = toLookup?.name || to;

    // Track airports for coordinate auto-discovery
    for (const code of [from, to]) {
      if (seenAirports.has(code)) continue;
      seenAirports.add(code);

      if (!existingAirportCodes.has(code)) {
        const lookup = lookupAirport(code);
        if (lookup && !newAirportsMap.has(lookup.code)) {
          newAirportsMap.set(lookup.code, lookup);
        }
      }
    }

    // Also extract intermediate waypoints from route description
    if (route) {
      const waypointCodes = route.match(/\b([A-Z][A-Z0-9]{1,3})\b/g) || [];
      for (const code of waypointCodes) {
        if (seenAirports.has(code)) continue;
        seenAirports.add(code);
        if (!existingAirportCodes.has(code)) {
          const lookup = lookupAirport(code);
          if (lookup && !newAirportsMap.has(lookup.code)) {
            newAirportsMap.set(lookup.code, lookup);
          }
        }
      }
    }

    // Build aircraft info
    const aircraft = aircraftMap[aircraftId] || { make: 'Unknown', model: 'Aircraft' };
    const aircraftType = [aircraft.make, aircraft.model].filter(Boolean).join(' ');

    // Build route description
    const routeDesc = route ? `Route: ${route}` : '';
    const description = comments
      ? (routeDesc ? `${routeDesc} - ${comments}` : comments)
      : routeDesc;

    flights.push({
      date,
      route: {
        origin: fromName,
        originCode: from,
        destination: toName,
        destinationCode: to,
      },
      aircraft: {
        type: aircraftType,
        registration: aircraftId,
      },
      duration,
      status: 'completed',
      description: description || undefined,
    });
  }

  // Sort by date descending
  flights.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    flights,
    newAirports: Array.from(newAirportsMap.values()),
    skippedRows,
    totalRows,
  };
}
