// Track pipeline: data/tracklogs/* -> public/flyover/tracks*.bin/json + hero.
// Formats per scripts/flyover/FORMATS.md. Published artifacts carry no
// timestamps, dates, tails, names, or filenames — chronology is array order.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CONFIG, OUT_DIR, REPO_ROOT, lonLatToXY } from "./frame.mjs";
import { decimateToCount } from "./decimate.mjs";
import { parseTrack } from "./parse.mjs";

const HERO_POINTS = 2048;
const TRACKLOG_DIR = path.join(REPO_ROOT, "data/tracklogs");

function arcLen(xyz) {
  let len = 0;
  for (let i = 1; i < xyz.length; i++) {
    const [ax, ay, az] = xyz[i - 1];
    const [bx, by, bz] = xyz[i];
    len += Math.hypot(bx - ax, by - ay, bz - az);
  }
  return len;
}

// Tail -> class from the logbook's aircraft table (rotorcraft_* = helicopter).
// Track exports only ever carry the tail, so model regexes alone can't see a
// helicopter; soft-fails to the aircraftMap patterns when no logbook exists.
function tailClasses() {
  const map = new Map();
  try {
    const dir = path.join(REPO_ROOT, "public");
    const file = readdirSync(dir).filter((f) => /^logbook_.*\.csv$/.test(f)).sort().pop();
    if (!file) return map;
    for (const line of readFileSync(path.join(dir, file), "utf8").split("\n")) {
      if (/^Flights Table/.test(line)) break;
      const cols = line.split(",");
      if (cols[0] && /airplane|rotorcraft|glider|powered_lift/i.test(cols[8] ?? "")) {
        map.set(cols[0].trim().toUpperCase(), /rotorcraft/i.test(cols[8]) ? "helicopter" : "airplane");
      }
    }
  } catch { /* no logbook — patterns only */ }
  return map;
}

function loadTracks() {
  let files = [];
  try {
    files = readdirSync(TRACKLOG_DIR).filter((f) => /\.(kml|gpx|csv)$/i.test(f));
  } catch { /* missing dir handled below */ }
  if (!files.length) {
    console.error(
      "data/tracklogs/ is empty — run `npm run flyover:fixtures` or drop in the monthly ForeFlight export."
    );
    process.exit(1);
  }

  const classifiers = CONFIG.aircraftMap.map((m) => ({ re: new RegExp(m.pattern, "i"), cls: m.class }));
  const tails = tailClasses();
  const tracks = [];
  for (const f of files.sort()) {
    let parsed;
    try {
      parsed = parseTrack(readFileSync(path.join(TRACKLOG_DIR, f), "utf8"), f);
    } catch (e) {
      console.error(`skip ${f}: ${e.message}`);
      continue;
    }
    if (parsed.points.length < 2) {
      console.error(`skip ${f}: fewer than 2 points`);
      continue;
    }
    const ident = `${f} ${parsed.meta.tail ?? ""} ${parsed.meta.name ?? ""}`;
    const tail = (parsed.meta.tail ?? ident.match(/\bN[0-9]{1,5}[A-Z]{0,2}\b/i)?.[0] ?? "").toUpperCase();
    let cls = tails.get(tail);
    if (!cls) {
      cls = CONFIG.defaultClass;
      for (const c of classifiers) if (c.re.test(ident)) { cls = c.cls; break; }
    }
    const xyz = parsed.points.map((p) => {
      const [x, y] = lonLatToXY(p.lon, p.lat);
      return [x, y, p.alt ?? 0];
    });
    tracks.push({
      xyz,
      c: cls === "helicopter" ? 1 : 0,
      start: parsed.points.find((p) => p.time != null)?.time ?? null,
      len: arcLen(xyz),
    });
  }
  if (!tracks.length) {
    console.error("no parseable tracks in data/tracklogs/");
    process.exit(1);
  }
  tracks.sort((a, b) => (a.start ?? Infinity) - (b.start ?? Infinity));
  return tracks;
}

// per-track point budgets proportional to arc length, clamped, rescaled to cap
function budgets(tracks, cap, perTrackMax) {
  const min = CONFIG.budgets.minPerTrack;
  const totalLen = tracks.reduce((s, t) => s + t.len, 0) || 1;
  let b = tracks.map((t) =>
    Math.min(t.xyz.length, Math.max(min, Math.min(perTrackMax, Math.round((cap * t.len) / totalLen))))
  );
  const sum = (arr) => arr.reduce((s, v) => s + v, 0);
  for (let i = 0; i < 8 && sum(b) > cap; i++) {
    const s = sum(b);
    b = b.map((v, j) => Math.min(tracks[j].xyz.length, Math.max(Math.min(min, v), Math.floor((v * cap) / s))));
  }
  return b;
}

function emitVariant(tracks, cap, perTrackMax, binName, jsonName) {
  const b = budgets(tracks, cap, perTrackMax);
  const index = [];
  const flat = [];
  const bounds = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  let o = 0;
  for (let i = 0; i < tracks.length; i++) {
    const pts = decimateToCount(tracks[i].xyz, b[i]);
    index.push({ o, n: pts.length, c: tracks[i].c });
    o += pts.length;
    for (const [x, y, z] of pts) {
      flat.push(x, y, z);
      if (x < bounds[0]) bounds[0] = x;
      if (y < bounds[1]) bounds[1] = y;
      if (z < bounds[2]) bounds[2] = z;
      if (x > bounds[3]) bounds[3] = x;
      if (y > bounds[4]) bounds[4] = y;
      if (z > bounds[5]) bounds[5] = z;
    }
  }
  const f32 = Float32Array.from(flat);
  assertFinite(f32, binName);
  if (o > cap) throw new Error(`${binName}: ${o} points exceeds cap ${cap}`);
  // Quantize to uint16 per axis (pos = min + q * scale) — 6 bytes/point keeps
  // the desktop bin inside the 500 KB budget; worst-axis step is ~9 m, well
  // under a ribbon's on-screen width.
  const quant = {
    min: [bounds[0], bounds[1], bounds[2]],
    scale: [
      (bounds[3] - bounds[0]) / 65535 || 1,
      (bounds[4] - bounds[1]) / 65535 || 1,
      (bounds[5] - bounds[2]) / 65535 || 1,
    ],
  };
  const q16 = new Uint16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const a = i % 3;
    q16[i] = Math.round((f32[i] - quant.min[a]) / quant.scale[a]);
  }
  writeFileSync(path.join(OUT_DIR, binName), Buffer.from(q16.buffer));
  writeFileSync(
    path.join(OUT_DIR, jsonName),
    JSON.stringify({ version: 1, stride: 3, totalPoints: o, tracks: index, bounds, quant }) + "\n"
  );
  return o;
}

function pickHero(tracks) {
  const rule = CONFIG.heroRule;
  const near = rule.nearKm * 1000;
  const startXY = lonLatToXY(...CONFIG.airports[rule.start].lonLat);
  const endXY = lonLatToXY(...CONFIG.airports[rule.end].lonLat);
  const d2 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const candidates = tracks.filter(
    (t) => d2(t.xyz[0], startXY) <= near && d2(t.xyz[t.xyz.length - 1], endXY) <= near
  );
  if (candidates.length)
    return candidates.reduce((a, t) => (t.len > a.len ? t : a));
  // fallback: longest cross-country = greatest end-to-end displacement
  return tracks.reduce((a, t) =>
    d2(t.xyz[0], t.xyz[t.xyz.length - 1]) > d2(a.xyz[0], a.xyz[a.xyz.length - 1]) ? t : a
  );
}

function resampleUniform(xyz, n) {
  const cum = [0];
  for (let i = 1; i < xyz.length; i++) {
    const [ax, ay, az] = xyz[i - 1];
    const [bx, by, bz] = xyz[i];
    cum.push(cum[i - 1] + Math.hypot(bx - ax, by - ay, bz - az));
  }
  const total = cum[cum.length - 1];
  const out = [];
  let seg = 0;
  for (let k = 0; k < n; k++) {
    const d = (total * k) / (n - 1);
    while (seg < xyz.length - 2 && cum[seg + 1] < d) seg++;
    const span = cum[seg + 1] - cum[seg];
    const f = span > 0 ? (d - cum[seg]) / span : 0;
    const a = xyz[seg], b = xyz[seg + 1];
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
  }
  return { points: out, totalLen: total };
}

function resolveFixes(heroPts) {
  const fixes = CONFIG.sectionFixes.map((f) => {
    if (f.lonLat) {
      const [x, y] = lonLatToXY(...f.lonLat);
      let bestI = 0, bestD = Infinity;
      for (let i = 0; i < heroPts.length; i++) {
        const dx = heroPts[i][0] - x, dy = heroPts[i][1] - y;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; bestI = i; }
      }
      return { id: f.id, t: bestI / (heroPts.length - 1) };
    }
    return { id: f.id, t: f.t };
  });
  fixes.sort((a, b) => a.t - b.t);
  for (let i = 1; i < fixes.length; i++)
    if (fixes[i].t <= fixes[i - 1].t) fixes[i].t = fixes[i - 1].t + 0.001;
  return fixes;
}

function assertFinite(f32, name) {
  for (let i = 0; i < f32.length; i++)
    if (!Number.isFinite(f32[i])) throw new Error(`${name}: non-finite value at float ${i}`);
}

function main() {
  const tracks = loadTracks();
  mkdirSync(OUT_DIR, { recursive: true });

  const { budgets: b } = CONFIG;
  const desktopTotal = emitVariant(tracks, b.desktopPoints, b.perTrackMaxDesktop, "tracks.bin", "tracks.json");
  const mobileTotal = emitVariant(tracks, b.mobilePoints, b.perTrackMaxMobile, "tracks-m.bin", "tracks-m.json");

  const hero = pickHero(tracks);
  const { points: heroPts, totalLen } = resampleUniform(hero.xyz, HERO_POINTS);
  const heroF32 = Float32Array.from(heroPts.flat());
  assertFinite(heroF32, "hero.bin");
  const fixes = resolveFixes(heroPts);
  for (let i = 1; i < fixes.length; i++)
    if (fixes[i].t <= fixes[i - 1].t) throw new Error("hero fixes not strictly increasing");
  writeFileSync(path.join(OUT_DIR, "hero.bin"), Buffer.from(heroF32.buffer));
  writeFileSync(
    path.join(OUT_DIR, "hero.json"),
    JSON.stringify({ version: 1, points: HERO_POINTS, totalLen, fixes }) + "\n"
  );

  console.error(
    `flyover:data ${tracks.length} tracks · desktop ${desktopTotal}/${b.desktopPoints} pts · mobile ${mobileTotal}/${b.mobilePoints} pts · hero ${HERO_POINTS}`
  );
}

main();
