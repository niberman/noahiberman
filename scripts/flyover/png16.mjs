// Minimal 16-bit grayscale PNG codec (bit depth 16, color type 0, filter 2
// "Up" on every row — vertical prediction compresses smooth terrain ~3x better
// than filter 0, and the runtime decoder handles both). No dependencies.
import { deflateSync, inflateSync } from "node:zlib";

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

export function encodePng16(samples, w, h) {
  if (samples.length !== w * h) throw new Error("encodePng16: size mismatch");
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 16; // bit depth
  // color type 0, compression 0, filter 0, interlace 0 — already zero
  const rowBytes = w * 2;
  const raw = Buffer.alloc(h * (1 + rowBytes));
  const cur = Buffer.alloc(rowBytes);
  const above = Buffer.alloc(rowBytes); // zeroed — row 0 predicts from 0
  for (let row = 0, p = 0; row < h; row++) {
    raw[p++] = 2; // filter: Up
    for (let col = 0; col < w; col++) cur.writeUInt16BE(samples[row * w + col], col * 2);
    for (let i = 0; i < rowBytes; i++) raw[p + i] = (cur[i] - above[i]) & 0xff;
    cur.copy(above);
    p += rowBytes;
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ponytail: decodes only what encodePng16 emits (16-bit gray, filter 0 or Up).
export function decodePng16(buf) {
  let off = 8;
  let w = 0, h = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      if (data[8] !== 16 || data[9] !== 0) throw new Error("decodePng16: not 16-bit grayscale");
    } else if (type === "IDAT") idat.push(data);
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const samples = new Uint16Array(w * h);
  const rowBytes = w * 2;
  for (let row = 0, p = 0; row < h; row++) {
    const filter = raw[p++];
    if (filter === 2 && row > 0) {
      for (let i = 0; i < rowBytes; i++) raw[p + i] = (raw[p + i] + raw[p - 1 - rowBytes + i]) & 0xff;
    } else if (filter !== 0 && !(filter === 2 && row === 0)) {
      throw new Error(`decodePng16: unsupported filter ${filter}`);
    }
    for (let col = 0; col < w; col++) samples[row * w + col] = raw.readUInt16BE(p + col * 2);
    p += rowBytes;
  }
  return { samples, w, h };
}
