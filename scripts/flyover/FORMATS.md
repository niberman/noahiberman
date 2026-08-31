# Flyover data formats — the binding contract

Every module (pipeline scripts and `src/flyover/` runtime) conforms to this file.
If something here is ambiguous, fix it HERE first, then in code.

## Local frame

Planar tangent frame, origin at KAPA (`data/flyover.config.json → airports.KAPA.lonLat`).

- `x` = meters east of KAPA, `y` = meters north of KAPA, `z` = meters **MSL** (not relative).
- Conversion lives in `scripts/flyover/frame.mjs` (`lonLatToXY`, `xyToLonLat`) and is the
  single source of truth for the degree→meter constants. The runtime never converts —
  it only consumes frame meters.
- Three.js mapping (runtime): scene `x = frame x`, scene `y = frame z − terrain.kapaElev`,
  scene `z = −frame y` (right-handed, Y-up, north = −Z).

## Published artifacts (`public/flyover/`, committed)

Privacy rule: nothing below carries timestamps, dates, tail numbers, pilot names, or
filenames. Chronology survives only as array ORDER.

### `tracks.bin` / `tracks-m.bin`
Raw little-endian `Uint16Array`, 3 quantized values `[qx, qy, qz]` per point,
all tracks concatenated **in chronological order** (rank = index in the JSON
`tracks` array). Dequantize per axis with `tracks.json → quant`:
`pos[a] = quant.min[a] + q * quant.scale[a]`. (6 bytes/point keeps the desktop
bin inside its 500 KB budget; the loader hands the scene Float32.)

### `tracks.json` / `tracks-m.json`
```json
{
  "version": 1,
  "stride": 3,
  "totalPoints": 123456,
  "tracks": [ { "o": 0, "n": 812, "c": 0 } ],
  "bounds": [minX, minY, minZ, maxX, maxY, maxZ],
  "quant": { "min": [minX, minY, minZ], "scale": [sx, sy, sz] }
}
```
- `o` = point offset into the bin (in points, not values), `n` = point count,
  `c` = class: `0` airplane, `1` helicopter. Rank is the array index.

### `heightmap.png` / `heightmap-m.png`
16-bit grayscale PNG (bit depth 16, color type 0), every row filter byte **0 or
2 (Up)** — decoders handle exactly those two, nothing else. Samples are
quantized to ~0.4 m steps before encoding (low 3 bits zeroed) so the Up-filtered
IDAT deflates well under the 1.5 MB budget. Row 0 = **north** edge.
Value `v` → elevation meters MSL: `minElev + (v / 65535) * (maxElev − minElev)`.

### `terrain.json` / `terrain-m.json`
```json
{
  "version": 1,
  "size": [w, h],
  "sw": [x, y],
  "cell": [dx, dy],
  "minElev": 1500.0,
  "maxElev": 4400.0,
  "kapaElev": 1793.7
}
```
Meters, local frame. Pixel `(col, row)` center is at
`x = sw[0] + (col + 0.5) * dx`, `y = sw[1] + (h − 1 − row + 0.5) * dy`
(row 0 north). `kapaElev` = heightmap sampled at the KAPA origin, meters MSL.

### `hero.bin` + `hero.json`
The hero track resampled to **2048 points at uniform arc-length spacing**
(Float32 `[x,y,z]` × 2048). Runtime samples pose at parameter `t ∈ [0,1]` by
linear interpolation at index `t * 2047`.
```json
{
  "version": 1,
  "points": 2048,
  "totalLen": 210345.0,
  "fixes": [ { "id": "ppl", "t": 0.1 } ]
}
```
`fixes` come from config `sectionFixes`; entries given as `lonLat` are resolved
by the pipeline to the `t` of the nearest hero-track point. `fixes` is sorted
by `t` ascending and each `id` matches a `data-fix` attribute in the page.

### `poster.jpg` (≤ 200 KB, 1920 px wide) / `poster-480.jpg` (480 px wide)
Node-rendered hillshade of the heightmap with every track drawn as a thin
additive line in the two palette colors. Dark, matches site background.

## Pipeline commands

- `npm run flyover:data` → parse `data/tracklogs/*` (KML / GPX / ForeFlight CSV),
  sort by start time, classify via config `aircraftMap` (filename + tail metadata),
  decimate (altitude-aware Douglas-Peucker; per-track budget proportional to arc
  length, clamped to `minPerTrack…perTrackMax*`, global cap `budgets.*Points`),
  project via `frame.mjs`, emit `tracks*.bin/json`, pick the hero track
  (longest track starting within `nearKm` of KAPA and ending within `nearKm` of
  KASE; fallback longest cross-country = greatest end-to-end displacement),
  emit `hero.bin/json`.
- `npm run flyover:terrain` → download USGS 3DEP 1 arc-second tiles
  (`https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1/TIFF/current/{n}{lat}{w}{lon}/USGS_1_{n}{lat}{w}{lon}.tif`)
  covering the track bbox + `marginKm` (or `boundsOverride` when set), cache in
  `scripts/flyover/.cache/` (idempotent), merge/resample to `res`/`mobileRes`,
  emit `heightmap*.png` + `terrain*.json`.
- `npm run flyover:poster` → emit `poster.jpg` + `poster-480.jpg`.
- `npm run flyover:build` → all three in order.
- `npm run flyover:fixtures` → synthesize placeholder KML tracks into
  `data/tracklogs/` from the shipped logbook flight list (dev only, until the
  real ForeFlight track exports land).

## Loader progress weights (runtime)

heightmap fetch+decode 0.40 · tracks fetch 0.30 · shader compile 0.20 · first frame 0.10.
