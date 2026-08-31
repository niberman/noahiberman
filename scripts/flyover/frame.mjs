// Single source of truth for the local planar frame (see FORMATS.md).
// x = meters east of KAPA, y = meters north of KAPA, z = meters MSL.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const CONFIG = JSON.parse(readFileSync(path.join(root, "data/flyover.config.json"), "utf8"));
export const REPO_ROOT = root;
export const OUT_DIR = path.join(root, "public/flyover");

const [lon0, lat0] = CONFIG.airports.KAPA.lonLat;
const rad = (d) => (d * Math.PI) / 180;
// Series expansion for meters per degree at the origin latitude — exact enough
// over the few hundred km these tracks span.
const M_PER_DEG_LAT =
  111132.954 - 559.822 * Math.cos(2 * rad(lat0)) + 1.175 * Math.cos(4 * rad(lat0));
const M_PER_DEG_LON = 111412.84 * Math.cos(rad(lat0)) - 93.5 * Math.cos(3 * rad(lat0));

export function lonLatToXY(lon, lat) {
  return [(lon - lon0) * M_PER_DEG_LON, (lat - lat0) * M_PER_DEG_LAT];
}

export function xyToLonLat(x, y) {
  return [lon0 + x / M_PER_DEG_LON, lat0 + y / M_PER_DEG_LAT];
}

export const FT_TO_M = 0.3048;
