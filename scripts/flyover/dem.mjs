// Download + cache USGS 3DEP 1 arc-second tiles. Tile n{LAT}w{LON} covers
// [LAT-1, LAT] x [-LON, -LON+1] degrees.
import { createWriteStream, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import path from "node:path";

const CACHE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), ".cache");

export function tileName(latTop, lonWest) {
  return `n${String(latTop).padStart(2, "0")}w${String(lonWest).padStart(3, "0")}`;
}

async function download(name, dest) {
  const url = `https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1/TIFF/current/${name}/USGS_1_${name}.tif`;
  const res = await fetch(url);
  if (res.status === 404) {
    const err = new Error(`DEM tile not found (404): ${name} — ${url}`);
    err.notFound = true;
    throw err;
  }
  if (!res.ok) throw new Error(`DEM tile ${name}: HTTP ${res.status}`);
  const tmp = `${dest}.tmp`;
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
  renameSync(tmp, dest);
}

/** Returns the local path of a cached tile, downloading it if needed. */
export async function fetchTile(name) {
  mkdirSync(CACHE_DIR, { recursive: true });
  const dest = path.join(CACHE_DIR, `USGS_1_${name}.tif`);
  if (existsSync(dest) && statSync(dest).size > 1024 * 1024) return dest;
  if (existsSync(dest)) unlinkSync(dest); // truncated leftover
  process.stderr.write(`dem: downloading ${name}...\n`);
  try {
    await download(name, dest);
  } catch (err) {
    if (err.notFound) throw err;
    process.stderr.write(`dem: ${name} failed (${err.message}), retrying once\n`);
    await download(name, dest);
  }
  process.stderr.write(`dem: ${name} cached (${(statSync(dest).size / 1e6).toFixed(1)} MB)\n`);
  return dest;
}
