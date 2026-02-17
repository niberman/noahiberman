/**
 * Generate supabase/seed.sql from the static flights.ts and airport-coordinates.ts data.
 * Run: node scripts/generate-seed-sql.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// ── Parse airport-coordinates.ts ──────────────────────────────────────────────
const airportSrc = fs.readFileSync(
  path.join(rootDir, 'src/lib/airport-coordinates.ts'),
  'utf-8'
);

const airportEntries = [];
const airportRegex = /'([^']+)':\s*\[(-?[\d.]+),\s*(-?[\d.]+)\],?\s*\/\/\s*(.*)/g;
let match;
while ((match = airportRegex.exec(airportSrc)) !== null) {
  airportEntries.push({
    code: match[1],
    longitude: parseFloat(match[2]),
    latitude: parseFloat(match[3]),
    name: match[4].trim(),
  });
}

// ── Parse flights.ts ──────────────────────────────────────────────────────────
// We need to eval the flightHistory array. Since it's TS, we strip types and eval.
const flightsSrc = fs.readFileSync(
  path.join(rootDir, 'src/data/flights.ts'),
  'utf-8'
);

// Extract the array between "export const flightHistory: Flight[] = [" and the closing "];"
const arrayStart = flightsSrc.indexOf('export const flightHistory');
const bracketStart = flightsSrc.indexOf('[', arrayStart);
const bracketEnd = flightsSrc.lastIndexOf('];');
const arrayBody = flightsSrc.slice(bracketStart, bracketEnd + 1);

// Evaluate the array (it's plain JS object literals)
let flightHistory;
try {
  flightHistory = eval(arrayBody);
} catch (e) {
  console.error('Failed to parse flightHistory array:', e.message);
  process.exit(1);
}

// ── Escape SQL string ─────────────────────────────────────────────────────────
function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function escJson(obj) {
  if (!obj) return 'NULL';
  return "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";
}

// ── Build SQL ─────────────────────────────────────────────────────────────────
let sql = '-- Auto-generated seed data from static files\n';
sql += '-- Generated on ' + new Date().toISOString() + '\n\n';

// Airport coordinates
sql += '-- ═══ Airport Coordinates ═══\n\n';
for (const ap of airportEntries) {
  sql += `INSERT INTO public.airport_coordinates (code, name, longitude, latitude)\n`;
  sql += `VALUES (${esc(ap.code)}, ${esc(ap.name)}, ${ap.longitude}, ${ap.latitude})\n`;
  sql += `ON CONFLICT (code) DO NOTHING;\n\n`;
}

// Flights
sql += '\n-- ═══ Flights ═══\n\n';
for (const f of flightHistory) {
  const id = esc(f.id);
  const date = esc(f.date);
  const route = escJson(f.route);
  const aircraft = escJson(f.aircraft);
  const duration = esc(f.duration || null);
  const status = esc(f.status);
  const departureTime = esc(f.departureTime || null);
  const arrivalTime = esc(f.arrivalTime || null);
  const altitude = f.altitude != null ? f.altitude : 'NULL';
  const speed = f.speed != null ? f.speed : 'NULL';
  const position = f.position ? escJson(f.position) : 'NULL';
  const description = esc(f.description || null);

  sql += `INSERT INTO public.flights (id, date, route, aircraft, duration, status, departure_time, arrival_time, altitude, speed, position, description)\n`;
  sql += `VALUES (${id}, ${date}, ${route}, ${aircraft}, ${duration}, ${status}, ${departureTime}, ${arrivalTime}, ${altitude}, ${speed}, ${position}, ${description})\n`;
  sql += `ON CONFLICT (id) DO NOTHING;\n\n`;
}

// Write output
const outPath = path.join(rootDir, 'supabase/seed.sql');
fs.writeFileSync(outPath, sql);
console.log(`Generated ${airportEntries.length} airports and ${flightHistory.length} flights -> ${outPath}`);
