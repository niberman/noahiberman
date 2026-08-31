// Synthesizes placeholder ForeFlight-style KML tracklogs into data/tracklogs/
// (gitignored) from the shipped logbook flight list, so the pipeline can run
// before the real track exports land. Dev-only fixtures — the pipeline scrubs
// identity downstream regardless.
import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT, OUT_DIR, lonLatToXY, xyToLonLat } from "./frame.mjs";
import { csvSplit } from "./parse.mjs";
import { decodePng16 } from "./png16.mjs";

const OUT = path.join(REPO_ROOT, "data/tracklogs");
const SPACING = 250; // meters between synthesized points
const GROUNDSPEED = 52; // m/s (~100 kt) for synthetic timestamps

// Field elevations, meters MSL (small curated map; default covers the rest).
const FIELD_ELEV = {
  KAPA: 1794, KASE: 2388, KLXV: 3026, KEGE: 1993, KTEX: 2767, KCOS: 1885,
  KBJC: 1729, KFNL: 1529, KCYS: 1876, KPUB: 1439, KGXY: 1420, KLMO: 1541,
  KBDU: 1612, KEIK: 1547, KLIC: 1638, KAKO: 1421, KSBS: 2097, KCFO: 1694,
  KTAD: 1757, KRAP: 966, KBIL: 1112, KGLD: 1114, KSNY: 1313, KLAR: 2218,
  KANK: 2296, KAEJ: 2422,
};
const DEFAULT_ELEV = 1600;
const elevOf = (code) => FIELD_ELEV[code] ?? DEFAULT_ELEV;

// deterministic per-flight rng: fnv1a hash -> mulberry32
function rngFor(seedStr) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadFlights() {
  const csvName = readdirSync(path.join(REPO_ROOT, "public"))
    .filter((f) => /^logbook_.*\.csv$/.test(f))
    .sort()
    .pop();
  if (!csvName) throw new Error("no public/logbook_*.csv found");
  const lines = readFileSync(path.join(REPO_ROOT, "public", csvName), "utf8").split(/\r?\n/);
  const h = lines.findIndex((l) => l.startsWith("Date,AircraftID,From,To,Route"));
  if (h < 0) throw new Error("Flights Table header not found in logbook CSV");
  const flights = [];
  for (const line of lines.slice(h + 1)) {
    const c = csvSplit(line);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c[0] ?? "")) continue;
    flights.push({
      date: c[0],
      tail: (c[1] ?? "").trim(),
      from: (c[2] ?? "").trim().toUpperCase(),
      to: (c[3] ?? "").trim().toUpperCase(),
      route: (c[4] ?? "").trim().toUpperCase().split(/\s+/).filter(Boolean),
    });
  }
  return flights;
}

// polyline in frame meters through waypoints, gentle seeded lateral wobble
// that stays zero at each waypoint so the path pins to the airports
function buildPathXY(wpts, rng) {
  const pts = [wpts[0]];
  for (let i = 0; i < wpts.length - 1; i++) {
    const [ax, ay] = wpts[i];
    const [bx, by] = wpts[i + 1];
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;
    const nx = -dy / len, ny = dx / len;
    const amp = Math.min(2000, len * 0.04) * (0.4 + rng() * 0.8);
    const freq = 1 + Math.floor(rng() * 3);
    const phase = rng() * Math.PI * 2;
    const steps = Math.max(2, Math.round(len / SPACING));
    for (let k = 1; k <= steps; k++) {
      const s = k / steps;
      const off = k === steps ? 0 : amp * Math.sin(Math.PI * s) * Math.sin(freq * Math.PI * s + phase);
      pts.push([ax + dx * s + nx * off, ay + dy * s + ny * off]);
    }
  }
  return pts;
}

// climb from origin+300 to cruise, cruise, descend to dest+300
function altitudeAt(d, totalLen, startAlt, endAlt, cruise) {
  const CLIMB = 0.05, DESC = 0.04;
  let climbD = (cruise - startAlt) / CLIMB;
  let descD = (cruise - endAlt) / DESC;
  if (climbD + descD > totalLen) {
    cruise = Math.max(
      startAlt, endAlt,
      (totalLen + startAlt / CLIMB + endAlt / DESC) / (1 / CLIMB + 1 / DESC)
    );
    climbD = Math.max(0, (cruise - startAlt) / CLIMB);
    descD = Math.max(0, (cruise - endAlt) / DESC);
  }
  if (d < climbD) return startAlt + CLIMB * d;
  if (d > totalLen - descD) return endAlt + DESC * (totalLen - d);
  return cruise;
}

// Terrain floor for the synthetic profiles: airport-elevation math alone sends
// the KAPA->KASE descent through Sawatch ridges (and the parked camera with
// it). Bilinear-samples the published heightmap when it exists; otherwise
// returns null and profiles go unclamped (run flyover:terrain first for
// terrain-safe fixtures).
function loadTerrainFloor() {
  try {
    const meta = JSON.parse(readFileSync(path.join(OUT_DIR, "terrain.json"), "utf8"));
    const { samples, w, h } = decodePng16(readFileSync(path.join(OUT_DIR, "heightmap.png")));
    const s = (meta.maxElev - meta.minElev) / 65535;
    return (x, y) => {
      const cf = Math.min(w - 1, Math.max(0, (x - meta.sw[0]) / meta.cell[0] - 0.5));
      const rf = Math.min(h - 1, Math.max(0, h - 1 - ((y - meta.sw[1]) / meta.cell[1] - 0.5)));
      const c0 = Math.floor(cf);
      const r0 = Math.floor(rf);
      const c1 = Math.min(w - 1, c0 + 1);
      const r1 = Math.min(h - 1, r0 + 1);
      const fc = cf - c0;
      const fr = rf - r0;
      const at = (r, c) => meta.minElev + samples[r * w + c] * s;
      return (at(r0, c0) * (1 - fc) + at(r0, c1) * fc) * (1 - fr) + (at(r1, c0) * (1 - fc) + at(r1, c1) * fc) * fr;
    };
  } catch {
    return null;
  }
}
const terrainAt = loadTerrainFloor();
const AGL_FLOOR = 250;

function synthesize(flight, airports, startMs) {
  const codes = [flight.from, ...flight.route.filter((c) => airports[c]), flight.to];
  const wpts = [];
  for (const c of codes) {
    const [lon, lat] = airports[c];
    const xy = lonLatToXY(lon, lat);
    const prev = wpts[wpts.length - 1];
    if (!prev || Math.hypot(xy[0] - prev[0], xy[1] - prev[1]) > 1) wpts.push(xy);
  }
  if (wpts.length < 2) return null;

  const seed = `${flight.date}|${flight.tail}|${flight.from}|${flight.to}|${flight.route.join(" ")}`;
  const xy = buildPathXY(wpts, rngFor(seed));

  const cum = [0];
  for (let i = 1; i < xy.length; i++)
    cum.push(cum[i - 1] + Math.hypot(xy[i][0] - xy[i - 1][0], xy[i][1] - xy[i - 1][1]));
  const totalLen = cum[cum.length - 1];

  const startAlt = elevOf(flight.from) + 300;
  const endAlt = elevOf(flight.to) + 300;
  const cruise = Math.min(
    4600,
    Math.max(...codes.map(elevOf)) + 900 + Math.min(1200, (totalLen / 1000) * 8)
  );

  return xy.map(([x, y], i) => {
    const [lon, lat] = xyToLonLat(x, y);
    let alt = altitudeAt(cum[i], totalLen, startAlt, endAlt, cruise);
    // never below terrain + AGL floor, except on the runway ends
    if (terrainAt && cum[i] > 2000 && totalLen - cum[i] > 2000) {
      alt = Math.max(alt, terrainAt(x, y) + AGL_FLOOR);
    }
    const time = new Date(startMs + (cum[i] / GROUNDSPEED) * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
    return { lon, lat, alt, time };
  });
}

function kml(flight, points) {
  const fmt = (n, d) => n.toFixed(d);
  const whens = points.map((p) => `      <when>${p.time}</when>`).join("\n");
  const coords = points
    .map((p) => `      <gx:coord>${fmt(p.lon, 6)} ${fmt(p.lat, 6)} ${fmt(p.alt, 1)}</gx:coord>`)
    .join("\n");
  const lineCoords = points
    .map((p) => `${fmt(p.lon, 6)},${fmt(p.lat, 6)},${fmt(p.alt, 1)}`)
    .join(" ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
  <Document>
    <name>${flight.tail} ${flight.from} - ${flight.to}</name>
    <Placemark>
      <gx:Track>
${whens}
${coords}
      </gx:Track>
    </Placemark>
    <Placemark>
      <LineString>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${lineCoords}</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>
`;
}

function main() {
  const airports = JSON.parse(readFileSync(path.join(REPO_ROOT, "src/data/us-airports.json"), "utf8"));
  const flights = loadFlights();

  mkdirSync(OUT, { recursive: true });
  for (const f of readdirSync(OUT)) if (f.endsWith(".kml")) unlinkSync(path.join(OUT, f));

  let written = 0, skipped = 0, points = 0;
  const perDate = new Map();
  const used = new Set();
  for (const flight of flights) {
    if (!airports[flight.from] || !airports[flight.to]) { skipped++; continue; }
    if (flight.from === flight.to && flight.route.filter((c) => airports[c]).length === 0) { skipped++; continue; }

    const nthToday = perDate.get(flight.date) ?? 0;
    perDate.set(flight.date, nthToday + 1);
    const startMs = Date.parse(`${flight.date}T15:00:00Z`) + nthToday * 3600 * 1000;

    const pts = synthesize(flight, airports, startMs);
    if (!pts) { skipped++; continue; }

    let name = `tracklog_${flight.tail}_${flight.from}-${flight.to}_${flight.date}`;
    if (used.has(name)) name += `_${nthToday}`;
    used.add(name);
    writeFileSync(path.join(OUT, `${name}.kml`), kml(flight, pts));
    written++;
    points += pts.length;
  }
  console.error(`flyover:fixtures wrote ${written} kml files (${points} points, ${skipped} flights skipped)`);
}

main();
