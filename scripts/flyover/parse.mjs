// Lenient tracklog parsers: KML (gx:Track + LineString), GPX 1.1, ForeFlight
// track CSV. Regex/string based on purpose — no XML dependency.
// All return { points: [{ lon, lat, alt, time }], meta: { tail?, name? } }
// with alt in meters MSL and time in epoch ms (or null).

const TAIL_RE = /\bN\d[\dA-Z]{1,5}\b/;

/** Quote-aware split of one CSV line. */
export function csvSplit(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseTrack(text, filename = "") {
  const ext = filename.toLowerCase().match(/\.(\w+)$/)?.[1];
  if (ext === "gpx" || /<gpx[\s>]/i.test(text.slice(0, 2000))) return parseGPX(text);
  if (ext === "kml" || /^﻿?\s*</.test(text)) return parseKML(text);
  return parseForeFlightCSV(text);
}

export function parseKML(text) {
  const meta = {};
  const name = text.match(/<name[^>]*>([\s\S]*?)<\/name>/i)?.[1].trim();
  if (name) {
    meta.name = name;
    const tail = name.match(TAIL_RE);
    if (tail) meta.tail = tail[0];
  }
  const whens = [...text.matchAll(/<when>([^<]+)<\/when>/gi)].map((m) => {
    const t = Date.parse(m[1].trim());
    return Number.isFinite(t) ? t : null;
  });
  let points = [...text.matchAll(/<gx:coord>([^<]+)<\/gx:coord>/gi)].map((m, i) => {
    const [lon, lat, alt] = m[1].trim().split(/\s+/).map(Number);
    return { lon, lat, alt: alt ?? 0, time: whens[i] ?? null };
  });
  if (!points.length) {
    points = [];
    for (const m of text.matchAll(/<coordinates[^>]*>([\s\S]*?)<\/coordinates>/gi)) {
      for (const tok of m[1].trim().split(/\s+/)) {
        const [lon, lat, alt] = tok.split(",").map(Number);
        points.push({ lon, lat, alt: alt ?? 0, time: null });
      }
    }
  }
  return { points: points.filter(validPoint), meta };
}

export function parseGPX(text) {
  const meta = {};
  const name = text.match(/<name[^>]*>([\s\S]*?)<\/name>/i)?.[1].trim();
  if (name) meta.name = name;
  const points = [];
  for (const m of text.matchAll(/<trkpt\b([^>]*?)(?:\/>|>([\s\S]*?)<\/trkpt>)/gi)) {
    const lat = Number(m[1].match(/lat\s*=\s*"([^"]+)"/i)?.[1]);
    const lon = Number(m[1].match(/lon\s*=\s*"([^"]+)"/i)?.[1]);
    const body = m[2] ?? "";
    const ele = Number(body.match(/<ele[^>]*>([^<]+)<\/ele>/i)?.[1]);
    const when = Date.parse(body.match(/<time[^>]*>([^<]+)<\/time>/i)?.[1] ?? "");
    points.push({ lon, lat, alt: Number.isFinite(ele) ? ele : 0, time: Number.isFinite(when) ? when : null });
  }
  return { points: points.filter(validPoint), meta };
}

export function parseForeFlightCSV(text) {
  const lines = text.split(/\r?\n/);
  const rows = lines.map(csvSplit);
  const headerIdx = rows.findIndex(
    (r) =>
      r.some((c) => /timestamp/i.test(c)) &&
      r.some((c) => /latitude/i.test(c)) &&
      r.some((c) => /longitude/i.test(c))
  );
  if (headerIdx < 0) return { points: [], meta: {} };

  const meta = {};
  // ForeFlight preamble: a metadata header row followed by its value row.
  for (let i = 0; i < headerIdx - 1; i++) {
    const col = rows[i].findIndex((c) => /tail/i.test(c));
    if (col >= 0 && rows[i + 1]?.[col]?.trim()) {
      meta.tail = rows[i + 1][col].trim();
      break;
    }
  }

  const header = rows[headerIdx];
  const ti = header.findIndex((c) => /timestamp/i.test(c));
  const lai = header.findIndex((c) => /latitude/i.test(c));
  const loi = header.findIndex((c) => /longitude/i.test(c));
  const ali = header.findIndex((c) => /alt/i.test(c));
  // ForeFlight exports feet under a bare "Altitude" header — assume feet
  // unless the header explicitly says meters.
  const altScale = ali >= 0 && /\bm\b|meter/i.test(header[ali]) ? 1 : 0.3048;

  const points = [];
  for (const r of rows.slice(headerIdx + 1)) {
    const lat = Number(r[lai]);
    const lon = Number(r[loi]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const rawAlt = ali >= 0 ? Number(r[ali]) : NaN;
    const rawT = (r[ti] ?? "").trim();
    let time = null;
    if (rawT) {
      const n = Number(rawT);
      // numeric epoch: seconds unless clearly milliseconds
      time = Number.isFinite(n) ? (n > 1e11 ? n : n * 1000) : Date.parse(rawT);
      if (!Number.isFinite(time)) time = null;
    }
    points.push({ lon, lat, alt: Number.isFinite(rawAlt) ? rawAlt * altScale : 0, time });
  }
  return { points: points.filter(validPoint), meta };
}

function validPoint(p) {
  return Number.isFinite(p.lon) && Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;
}
