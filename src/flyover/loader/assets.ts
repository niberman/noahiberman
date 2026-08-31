import type {
  FlyoverAssets,
  HeroMeta,
  ProgressCallback,
  TerrainMeta,
  TracksIndex,
} from "../types";
import { decodePng16 } from "./png16";

/**
 * Fetches and decodes every published flyover artifact. Progress fractions are
 * absolute (FORMATS.md weights): heightmap fetch+decode 0.00–0.40, bins
 * 0.40–0.70. 0.70–1.00 (compile + first frame) is reported by the caller.
 */

const BASE = "/flyover/";

async function getJson<T>(name: string): Promise<T> {
  const res = await fetch(BASE + name);
  if (!res.ok) throw new Error(`flyover: ${name} ${res.status}`);
  return res.json();
}

async function getBuf(
  name: string,
  onBytes?: (loaded: number, total: number) => void
): Promise<ArrayBuffer> {
  const res = await fetch(BASE + name);
  if (!res.ok) throw new Error(`flyover: ${name} ${res.status}`);
  const total = Number(res.headers.get("content-length")) || 0;
  if (!res.body || !onBytes || !total) return res.arrayBuffer();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    // content-length is the encoded size; loaded bytes are decoded — clamp so
    // a gzip-served asset never reports past its total.
    onBytes(Math.min(loaded, total), total);
  }
  const out = new Uint8Array(loaded);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.byteLength;
  }
  return out.buffer;
}

export async function loadAssets(
  mobile: boolean,
  onProgress: ProgressCallback
): Promise<FlyoverAssets> {
  const s = mobile ? "-m" : "";

  // Tiny metadata first — the sizes below are derived from it.
  const [terrain, tracksIndex, heroMeta] = await Promise.all([
    getJson<TerrainMeta>(`terrain${s}.json`),
    getJson<TracksIndex>(`tracks${s}.json`),
    getJson<HeroMeta>("hero.json"),
  ]);

  const hmBuf = await getBuf(`heightmap${s}.png`, (l, t) => onProgress(0.4 * (l / t)));
  const hm = await decodePng16(hmBuf, terrain.minElev, terrain.maxElev);
  if (hm.width !== terrain.size[0] || hm.height !== terrain.size[1]) {
    throw new Error("flyover: heightmap size does not match terrain.json");
  }
  onProgress(0.4);

  // Combined 0.40–0.70. Expected byte totals are exact from the metadata
  // (tracks are uint16-quantized triples, hero is float triples), independent
  // of transfer encoding.
  let tLoaded = 0;
  let hLoaded = 0;
  const binTotal = tracksIndex.totalPoints * 6 + heroMeta.points * 12;
  const bump = () => onProgress(0.4 + 0.3 * Math.min(1, (tLoaded + hLoaded) / binTotal));
  const [tracksBuf, heroBuf] = await Promise.all([
    getBuf(`tracks${s}.bin`, (l) => {
      tLoaded = l;
      bump();
    }),
    getBuf("hero.bin", (l) => {
      hLoaded = l;
      bump();
    }),
  ]);

  // ponytail: bins are little-endian and typed-array views use platform byte
  // order — every browser platform we serve is LE.
  const q16 = new Uint16Array(tracksBuf);
  const hero = new Float32Array(heroBuf);
  if (q16.length !== tracksIndex.totalPoints * 3) throw new Error("flyover: tracks.bin size mismatch");
  const { min, scale } = tracksIndex.quant;
  const tracks = new Float32Array(q16.length);
  for (let i = 0; i < q16.length; i++) {
    const a = i % 3;
    tracks[i] = min[a] + q16[i] * scale[a];
  }
  if (hero.length !== heroMeta.points * 3) throw new Error("flyover: hero.bin size mismatch");
  onProgress(0.7);

  return { tracks, tracksIndex, height: hm.data, terrain, hero, heroMeta, mobile };
}
