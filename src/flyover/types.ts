/**
 * Shared contracts for the flyover runtime. Mirrors scripts/flyover/FORMATS.md —
 * that file is the source of truth for the on-disk formats.
 */

export interface TrackIndexEntry {
  /** point offset into tracks.bin (points, not floats) */
  o: number;
  /** point count */
  n: number;
  /** 0 airplane, 1 helicopter */
  c: 0 | 1;
}

export interface TracksIndex {
  version: 1;
  stride: 3;
  totalPoints: number;
  /** chronological order — rank is the array index */
  tracks: TrackIndexEntry[];
  bounds: [number, number, number, number, number, number];
  /** tracks.bin is uint16-quantized: pos[a] = min[a] + q * scale[a] */
  quant: { min: [number, number, number]; scale: [number, number, number] };
}

export interface TerrainMeta {
  version: 1;
  /** [w, h] pixels */
  size: [number, number];
  /** frame meters of the SW corner */
  sw: [number, number];
  /** [dx, dy] meters per pixel */
  cell: [number, number];
  /** meters MSL */
  minElev: number;
  maxElev: number;
  /** heightmap sampled at the KAPA origin, meters MSL */
  kapaElev: number;
}

export interface HeroFix {
  id: string;
  t: number;
}

export interface HeroMeta {
  version: 1;
  points: number;
  totalLen: number;
  /** sorted by t ascending; ids match [data-fix] attributes in the page */
  fixes: HeroFix[];
}

export interface FlyoverAssets {
  /** [x,y,z] frame meters × totalPoints */
  tracks: Float32Array;
  tracksIndex: TracksIndex;
  /** decoded heightmap, meters MSL, row 0 = north, length = w*h */
  height: Float32Array;
  terrain: TerrainMeta;
  /** hero polyline, [x,y,z] × heroMeta.points, uniform arc length */
  hero: Float32Array;
  heroMeta: HeroMeta;
  mobile: boolean;
}

/** Mirrors data/flyover.config.json palette — keep in sync by hand. */
export const PALETTE = {
  airplane: "#a855f7",
  helicopter: "#f5f3ff",
  terrainLow: "#07040d",
  terrainMid: "#191233",
  terrainHigh: "#2f2153",
  terrainPeak: "#57457f",
  fog: "#050308",
  background: "#000000",
} as const;

export interface FlyoverSceneOpts {
  mobile: boolean;
  /** reduced motion: no intro, no scroll flight — fixed camera on the finished scene */
  reducedMotion: boolean;
}

export interface FlyoverScene {
  /** Pre-warm shaders/GPU uploads. Resolves when a frame can render cheaply. */
  compile(): Promise<void>;
  /** Render a single frame now (used for the first frame while paused). */
  renderOnce(): void;
  /**
   * Play the intro (terrain wireframe→solid 1.5 s, then chronological track
   * draw-in 6 s). Resolves when done. Under reducedMotion resolves immediately
   * with the scene fully drawn.
   */
  startIntro(): Promise<void>;
  /** Scroll parameter 0..1 along the hero track (raw; the scene smooths). */
  setT(t: number): void;
  /** Start/stop the internal rAF loop (visibility / tab gating). */
  setRunning(run: boolean): void;
  resize(): void;
  dispose(): void;
}

export type ProgressCallback = (fraction: number) => void;
