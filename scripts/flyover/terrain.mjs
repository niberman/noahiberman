// npm run flyover:terrain — build heightmap*.png + terrain*.json (FORMATS.md).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fromFile } from "geotiff";
import { CONFIG, OUT_DIR, lonLatToXY, xyToLonLat } from "./frame.mjs";
import { fetchTile, tileName } from "./dem.mjs";
import { encodePng16 } from "./png16.mjs";

function bounds() {
  const t = CONFIG.terrain;
  if (t.boundsOverride) {
    const { lon, lat } = t.boundsOverride;
    return { lonMin: lon[0], lonMax: lon[1], latMin: lat[0], latMax: lat[1] };
  }
  const idx = JSON.parse(readFileSync(path.join(OUT_DIR, "tracks.json"), "utf8"));
  const [minX, minY, , maxX, maxY] = idx.bounds;
  const m = t.marginKm * 1000;
  const [lonMin, latMin] = xyToLonLat(minX - m, minY - m);
  const [lonMax, latMax] = xyToLonLat(maxX + m, maxY + m);
  return { lonMin, lonMax, latMin, latMax };
}

function tilesFor({ lonMin, lonMax, latMin, latMax }) {
  const names = [];
  for (let lat = Math.floor(latMin) + 1; lat <= Math.floor(latMax) + 1; lat++)
    for (let lon = Math.ceil(-lonMax); lon <= Math.ceil(-lonMin); lon++)
      names.push(tileName(lat, lon));
  return names;
}

function makeGrid(res, b) {
  const [swX, swY] = lonLatToXY(b.lonMin, b.latMin);
  const [neX, neY] = lonLatToXY(b.lonMax, b.latMax);
  return {
    w: res,
    h: res,
    swX,
    swY,
    dx: (neX - swX) / res,
    dy: (neY - swY) / res,
    data: new Float32Array(res * res).fill(NaN),
  };
}

// Bilinear sample of one DEM raster at lon/lat; NaN when outside or nodata.
function sampleTile(tile, lon, lat) {
  const { data, w, h, west, north, resX, resY, nodata } = tile;
  const cf = (lon - west) / resX - 0.5;
  const rf = (north - lat) / resY - 0.5;
  if (cf < -0.5 || rf < -0.5 || cf > w - 0.5 || rf > h - 0.5) return NaN;
  const c0 = Math.max(0, Math.min(w - 1, Math.floor(cf)));
  const r0 = Math.max(0, Math.min(h - 1, Math.floor(rf)));
  const c1 = Math.min(w - 1, c0 + 1);
  const r1 = Math.min(h - 1, r0 + 1);
  const fc = Math.min(1, Math.max(0, cf - c0));
  const fr = Math.min(1, Math.max(0, rf - r0));
  const v00 = data[r0 * w + c0];
  const v01 = data[r0 * w + c1];
  const v10 = data[r1 * w + c0];
  const v11 = data[r1 * w + c1];
  if (v00 === nodata || v01 === nodata || v10 === nodata || v11 === nodata) return NaN;
  return (
    v00 * (1 - fc) * (1 - fr) + v01 * fc * (1 - fr) + v10 * (1 - fc) * fr + v11 * fc * fr
  );
}

function fillFromTile(grid, tile) {
  const { w, h, swX, swY, dx, dy, data } = grid;
  // Frame<->lon/lat is separable-linear, so the tile bbox maps to a col/row box.
  const [x0] = lonLatToXY(tile.west, 0);
  const [x1] = lonLatToXY(tile.west + tile.w * tile.resX, 0);
  const [, y0] = lonLatToXY(0, tile.north - tile.h * tile.resY);
  const [, y1] = lonLatToXY(0, tile.north);
  // padded a pixel each way so rounding can't leave seams between tiles
  const c0 = Math.max(0, Math.floor((x0 - swX) / dx) - 1);
  const c1 = Math.min(w - 1, Math.ceil((x1 - swX) / dx) + 1);
  const rTop = Math.max(0, Math.floor((swY + h * dy - y1) / dy) - 1);
  const rBot = Math.min(h - 1, Math.ceil((swY + h * dy - y0) / dy) + 1);
  for (let row = rTop; row <= rBot; row++) {
    for (let col = c0; col <= c1; col++) {
      const i = row * w + col;
      if (!Number.isNaN(data[i])) continue; // later tiles fill NaN only
      const x = swX + (col + 0.5) * dx;
      const y = swY + (h - 1 - row + 0.5) * dy;
      const [lon, lat] = xyToLonLat(x, y);
      const v = sampleTile(tile, lon, lat);
      if (!Number.isNaN(v)) data[i] = v;
    }
  }
}

function gridSampleXY(grid, x, y) {
  const { w, h, swX, swY, dx, dy, data } = grid;
  const cf = Math.min(w - 1, Math.max(0, (x - swX) / dx - 0.5));
  const rf = Math.min(h - 1, Math.max(0, h - 1 - ((y - swY) / dy - 0.5)));
  const c0 = Math.floor(cf);
  const r0 = Math.floor(rf);
  const c1 = Math.min(w - 1, c0 + 1);
  const r1 = Math.min(h - 1, r0 + 1);
  const fc = cf - c0;
  const fr = rf - r0;
  return (
    data[r0 * w + c0] * (1 - fc) * (1 - fr) +
    data[r0 * w + c1] * fc * (1 - fr) +
    data[r1 * w + c0] * (1 - fc) * fr +
    data[r1 * w + c1] * fc * fr
  );
}

function emit(grid, pngName, jsonName, kapaElev) {
  const { w, h, data } = grid;
  let minElev = Infinity;
  let maxElev = -Infinity;
  let nan = 0;
  for (const v of data) {
    if (Number.isNaN(v)) nan++;
    else {
      if (v < minElev) minElev = v;
      if (v > maxElev) maxElev = v;
    }
  }
  if (!Number.isFinite(minElev)) throw new Error("terrain: no DEM data landed in grid");
  if (nan) {
    process.stderr.write(`terrain: ${pngName}: filling ${nan} empty px with minElev\n`);
    for (let i = 0; i < data.length; i++) if (Number.isNaN(data[i])) data[i] = minElev;
  }
  const q = new Uint16Array(w * h);
  const scale = 65535 / (maxElev - minElev);
  // ponytail: drop the low 3 bits (~0.4 m steps over this range) — sub-meter
  // noise is invisible under displacement but triples the deflated size.
  for (let i = 0; i < data.length; i++) q[i] = Math.round((data[i] - minElev) * scale) & 0xfff8;
  writeFileSync(path.join(OUT_DIR, pngName), encodePng16(q, w, h));
  const meta = {
    version: 1,
    size: [w, h],
    sw: [grid.swX, grid.swY],
    cell: [grid.dx, grid.dy],
    minElev,
    maxElev,
    kapaElev,
  };
  writeFileSync(path.join(OUT_DIR, jsonName), JSON.stringify(meta) + "\n");
  return meta;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const b = bounds();
  const names = tilesFor(b);
  process.stderr.write(`terrain: bounds lon ${b.lonMin}..${b.lonMax} lat ${b.latMin}..${b.latMax} → ${names.length} tiles\n`);
  const desktop = makeGrid(CONFIG.terrain.res, b);
  const mobile = makeGrid(CONFIG.terrain.mobileRes, b);
  for (const name of names) {
    const file = await fetchTile(name);
    const tiff = await fromFile(file);
    const image = await tiff.getImage();
    const [west, , , north] = image.getBoundingBox();
    const tile = {
      data: (await image.readRasters())[0],
      w: image.getWidth(),
      h: image.getHeight(),
      west,
      north,
      resX: Math.abs(image.getResolution()[0]),
      resY: Math.abs(image.getResolution()[1]),
      nodata: image.getGDALNoData() ?? -999999,
    };
    fillFromTile(desktop, tile);
    fillFromTile(mobile, tile);
    tiff.close();
    process.stderr.write(`terrain: sampled ${name}\n`);
  }
  const kapaElev = gridSampleXY(desktop, 0, 0);
  const d = emit(desktop, "heightmap.png", "terrain.json", kapaElev);
  const m = emit(mobile, "heightmap-m.png", "terrain-m.json", kapaElev);
  process.stderr.write(
    `terrain: done — elev ${d.minElev.toFixed(1)}..${d.maxElev.toFixed(1)} m, kapa ${kapaElev.toFixed(1)} m, ` +
      `${d.size[0]}x${d.size[1]} + ${m.size[0]}x${m.size[1]}\n`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
