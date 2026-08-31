// Scene-space constants (FORMATS.md mapping: x = frame x, y = (frame z − kapaElev) · EXAG, z = −frame y).

export const EXAG = 1.3;

// FogExp2 density: terrain reads ~85% at 30 km, ~7% at 120 km, gone by ~180 km.
export const FOG_DENSITY = 1.35e-5;

export function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}
