/**
 * Browser decoder for the flyover heightmap PNG (see scripts/flyover/FORMATS.md):
 * 16-bit grayscale, color type 0, non-interlaced, row filters 0 or 2 (Up).
 * Canvas can't do this — it clamps to 8 bits — so we walk the chunks and
 * inflate the IDAT stream ourselves via DecompressionStream.
 */

/** Thrown when the browser can't decode at all — caller leaves the poster. */
export class Png16UnsupportedError extends Error {
  constructor() {
    super("DecompressionStream unavailable");
    this.name = "Png16UnsupportedError";
  }
}

export interface DecodedHeightmap {
  width: number;
  height: number;
  /** elevation meters MSL, row 0 = north */
  data: Float32Array;
}

const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export async function decodePng16(
  buf: ArrayBuffer,
  minElev: number,
  maxElev: number
): Promise<DecodedHeightmap> {
  if (typeof DecompressionStream === "undefined") throw new Png16UnsupportedError();

  const bytes = new Uint8Array(buf);
  const view = new DataView(buf);
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== SIG[i]) throw new Error("flyover: heightmap is not a PNG");
  }

  let width = 0;
  let height = 0;
  const idat: Uint8Array[] = [];
  let idatLen = 0;
  let off = 8;
  while (off + 8 <= bytes.length) {
    const len = view.getUint32(off);
    const type = String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7]);
    const data = off + 8;
    if (type === "IHDR") {
      width = view.getUint32(data);
      height = view.getUint32(data + 4);
      const bitDepth = bytes[data + 8];
      const colorType = bytes[data + 9];
      const interlace = bytes[data + 12];
      if (bitDepth !== 16 || colorType !== 0 || interlace !== 0) {
        throw new Error("flyover: heightmap must be 16-bit grayscale non-interlaced");
      }
    } else if (type === "IDAT") {
      idat.push(bytes.subarray(data, data + len));
      idatLen += len;
    } else if (type === "IEND") {
      break;
    }
    off = data + len + 4; // skip CRC
  }
  if (!width || !height || !idatLen) throw new Error("flyover: malformed heightmap PNG");

  const zipped = new Uint8Array(idatLen);
  let zo = 0;
  for (const c of idat) {
    zipped.set(c, zo);
    zo += c.length;
  }
  // "deflate" = zlib-wrapped deflate, which is exactly what PNG IDAT carries.
  const raw = new Uint8Array(
    await new Response(
      new Blob([zipped]).stream().pipeThrough(new DecompressionStream("deflate"))
    ).arrayBuffer()
  );

  const rowBytes = 1 + width * 2;
  if (raw.length !== rowBytes * height) throw new Error("flyover: bad heightmap IDAT length");

  const out = new Float32Array(width * height);
  const scale = (maxElev - minElev) / 65535;
  const dataBytes = width * 2;
  for (let row = 0; row < height; row++) {
    const r = row * rowBytes;
    const filter = raw[r];
    // The pipeline emits filter 0 or 2/Up only (FORMATS.md) — anything else
    // means a foreign file.
    if (filter === 2 && row > 0) {
      // unfilter Up in place: add the byte directly above
      for (let i = 1; i <= dataBytes; i++) raw[r + i] = (raw[r + i] + raw[r + i - rowBytes]) & 0xff;
    } else if (filter !== 0 && !(filter === 2 && row === 0)) {
      throw new Error("flyover: unexpected PNG row filter");
    }
    let p = r + 1;
    const d = row * width;
    for (let col = 0; col < width; col++, p += 2) {
      out[d + col] = minElev + ((raw[p] << 8) | raw[p + 1]) * scale;
    }
  }
  return { width, height, data: out };
}
