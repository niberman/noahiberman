// npm run flyover:poster — hillshade + additive track lines → poster.jpg (FORMATS.md).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import jpeg from "jpeg-js";
import { CONFIG, OUT_DIR, REPO_ROOT } from "./frame.mjs";
import { decodePng16 } from "./png16.mjs";

const W = 1920;
const H = 1080;
const Z_EX = 2; // slope exaggeration so 160 m cells still read as relief
const TONE_K = 0.35;

const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const P = CONFIG.palette;
const RAMP = [P.terrainLow, P.terrainMid, P.terrainHigh, P.terrainPeak].map(hex);
const FOG = hex(P.fog);
const CLASS_COLORS = [hex(P.airplane), hex(P.helicopter)];

function loadHeight() {
  const meta = JSON.parse(readFileSync(path.join(OUT_DIR, "terrain.json"), "utf8"));
  const { samples, w, h } = decodePng16(readFileSync(path.join(OUT_DIR, "heightmap.png")));
  const elev = new Float32Array(w * h);
  const s = (meta.maxElev - meta.minElev) / 65535;
  for (let i = 0; i < samples.length; i++) elev[i] = meta.minElev + samples[i] * s;
  return { meta, elev, w, h };
}

function sampleElev({ elev, w, h, meta }, x, y) {
  const [dx, dy] = meta.cell;
  const cf = Math.min(w - 1, Math.max(0, (x - meta.sw[0]) / dx - 0.5));
  const rf = Math.min(h - 1, Math.max(0, h - 1 - ((y - meta.sw[1]) / dy - 0.5)));
  const c0 = Math.floor(cf);
  const r0 = Math.floor(rf);
  const c1 = Math.min(w - 1, c0 + 1);
  const r1 = Math.min(h - 1, r0 + 1);
  const fc = cf - c0;
  const fr = rf - r0;
  return (
    elev[r0 * w + c0] * (1 - fc) * (1 - fr) +
    elev[r0 * w + c1] * fc * (1 - fr) +
    elev[r1 * w + c0] * (1 - fc) * fr +
    elev[r1 * w + c1] * fc * fr
  );
}

function rampColor(t) {
  const s = Math.min(0.99999, Math.max(0, t)) * 3;
  const i = Math.floor(s);
  const f = s - i;
  return [0, 1, 2].map((c) => RAMP[i][c] + (RAMP[i + 1][c] - RAMP[i][c]) * f);
}

function encodeUnder(rgba, w, h, limit) {
  let lo = 25;
  let hi = 95;
  let best = null;
  while (lo <= hi) {
    const q = (lo + hi) >> 1;
    const out = jpeg.encode({ data: rgba, width: w, height: h }, q).data;
    if (out.length <= limit) {
      best = { out, q };
      lo = q + 1;
    } else hi = q - 1;
  }
  if (!best) throw new Error(`poster: cannot fit ${w}x${h} under ${limit} bytes`);
  return best;
}

function main() {
  const hm = loadHeight();
  const { meta } = hm;
  const spanX = meta.size[0] * meta.cell[0];
  const spanY = meta.size[1] * meta.cell[1];
  const scale = Math.min(W / spanX, H / spanY);
  const cw = Math.round(spanX * scale);
  const ch = Math.round(spanY * scale);
  const offX = (W - cw) >> 1;
  const offY = (H - ch) >> 1;
  const yTop = meta.sw[1] + spanY;
  const range = meta.maxElev - meta.minElev;
  const step = 1 / scale; // one output pixel in frame meters
  const lz = Math.SQRT2; // NW light, 45 deg elevation
  const lNorm = Math.hypot(1, 1, lz);

  const rgb = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i++) rgb.set(FOG, i * 3);

  for (let py = 0; py < ch; py++) {
    const y = yTop - (py + 0.5) * step;
    for (let px = 0; px < cw; px++) {
      const x = meta.sw[0] + (px + 0.5) * step;
      const e = sampleElev(hm, x, y);
      const dzdx = ((sampleElev(hm, x + step, y) - sampleElev(hm, x - step, y)) / (2 * step)) * Z_EX;
      const dzdy = ((sampleElev(hm, x, y + step) - sampleElev(hm, x, y - step)) / (2 * step)) * Z_EX;
      const nNorm = Math.hypot(dzdx, dzdy, 1);
      const diffuse = Math.max(0, (dzdx - dzdy + lz) / (nNorm * lNorm)); // dot(n, L)
      const shade = 0.25 + 0.75 * diffuse;
      const c = rampColor((e - meta.minElev) / range);
      const o = ((py + offY) * W + px + offX) * 3;
      rgb[o] = c[0] * shade;
      rgb[o + 1] = c[1] * shade;
      rgb[o + 2] = c[2] * shade;
    }
  }

  const binPath = path.join(OUT_DIR, "tracks.bin");
  if (existsSync(binPath)) {
    let buf = readFileSync(binPath);
    if (buf.byteOffset % 2) buf = Buffer.from(buf); // realign for the Uint16 view
    const q16 = new Uint16Array(buf.buffer, buf.byteOffset, buf.length / 2);
    const idx = JSON.parse(readFileSync(path.join(OUT_DIR, "tracks.json"), "utf8"));
    // dequantize (FORMATS.md: pos = quant.min + q * quant.scale)
    const pts = new Float32Array(q16.length);
    for (let i = 0; i < q16.length; i++) {
      const a = i % 3;
      pts[i] = idx.quant.min[a] + q16[i] * idx.quant.scale[a];
    }
    const acc = [new Float32Array(W * H), new Float32Array(W * H)];
    for (const { o, n, c } of idx.tracks) {
      const a = acc[c];
      let last = -1;
      let prevX = NaN;
      let prevY = NaN;
      for (let i = 0; i < n; i++) {
        const px = offX + (pts[(o + i) * 3] - meta.sw[0]) * scale;
        const py = offY + (yTop - pts[(o + i) * 3 + 1]) * scale;
        if (i > 0) {
          const steps = Math.max(1, Math.ceil(Math.max(Math.abs(px - prevX), Math.abs(py - prevY))));
          for (let s = 1; s <= steps; s++) {
            const ix = Math.round(prevX + ((px - prevX) * s) / steps);
            const iy = Math.round(prevY + ((py - prevY) * s) / steps);
            if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
            const p = iy * W + ix;
            if (p !== last) a[p] += 1; // additive; stacked approaches bloom
            last = p;
          }
        }
        prevX = px;
        prevY = py;
      }
    }
    for (let i = 0; i < W * H; i++) {
      for (const c of [0, 1]) {
        if (acc[c][i] === 0) continue;
        const t = 1 - Math.exp(-TONE_K * acc[c][i]);
        const col = CLASS_COLORS[c];
        rgb[i * 3] += col[0] * t;
        rgb[i * 3 + 1] += col[1] * t;
        rgb[i * 3 + 2] += col[2] * t;
      }
    }
  } else {
    process.stderr.write("poster: WARNING public/flyover/tracks.bin missing — rendering hillshade only; re-run flyover:poster after flyover:data\n");
  }

  const rgba = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    rgba[i * 4] = Math.min(255, rgb[i * 3]);
    rgba[i * 4 + 1] = Math.min(255, rgb[i * 3 + 1]);
    rgba[i * 4 + 2] = Math.min(255, rgb[i * 3 + 2]);
    rgba[i * 4 + 3] = 255;
  }
  const big = encodeUnder(rgba, W, H, 200 * 1024);
  writeFileSync(path.join(OUT_DIR, "poster.jpg"), big.out);

  // 480-wide: 4x box downsample of the finished frame
  const sw = W / 4;
  const sh = H / 4;
  const small = new Uint8Array(sw * sh * 4);
  for (let sy = 0; sy < sh; sy++) {
    for (let sx = 0; sx < sw; sx++) {
      const sums = [0, 0, 0];
      for (let ky = 0; ky < 4; ky++)
        for (let kx = 0; kx < 4; kx++) {
          const p = ((sy * 4 + ky) * W + sx * 4 + kx) * 4;
          sums[0] += rgba[p];
          sums[1] += rgba[p + 1];
          sums[2] += rgba[p + 2];
        }
      const q = (sy * sw + sx) * 4;
      small[q] = sums[0] / 16;
      small[q + 1] = sums[1] / 16;
      small[q + 2] = sums[2] / 16;
      small[q + 3] = 255;
    }
  }
  const sm = encodeUnder(small, sw, sh, 60 * 1024);
  writeFileSync(path.join(OUT_DIR, "poster-480.jpg"), sm.out);

  // ~1 KB inline LQIP of the same frame, written into src/index.css between
  // the FLYOVER-LQIP markers — the first-paint background costs no network
  // fetch; Home swaps in the full JPEG after load (.poster-hd).
  const lw = 24;
  const lh = Math.round((H / W) * lw);
  const lq = new Uint8Array(lw * lh * 4);
  for (let ly = 0; ly < lh; ly++)
    for (let lx = 0; lx < lw; lx++) {
      const p = (Math.floor(((ly + 0.5) * H) / lh) * W + Math.floor(((lx + 0.5) * W) / lw)) * 4;
      const q = (ly * lw + lx) * 4;
      lq[q] = rgba[p];
      lq[q + 1] = rgba[p + 1];
      lq[q + 2] = rgba[p + 2];
      lq[q + 3] = 255;
    }
  const lqJpg = jpeg.encode({ data: Buffer.from(lq), width: lw, height: lh }, 50).data;
  const cssPath = path.join(REPO_ROOT, "src/index.css");
  const css = readFileSync(cssPath, "utf8");
  const lqRule = `background: #000 url("data:image/jpeg;base64,${Buffer.from(lqJpg).toString("base64")}") center / cover no-repeat;`;
  const marked = css.replace(
    /(\/\* FLYOVER-LQIP-START \*\/\n)[\s\S]*?(\n\s*\/\* FLYOVER-LQIP-END \*\/)/,
    `$1  ${lqRule}$2`
  );
  if (marked === css && !css.includes(lqRule)) throw new Error("poster: FLYOVER-LQIP markers not found in src/index.css");
  writeFileSync(cssPath, marked);

  process.stderr.write(
    `poster: poster.jpg ${big.out.length} B (q${big.q}), poster-480.jpg ${sm.out.length} B (q${sm.q}), lqip ${lqJpg.length} B\n`
  );
}

main();
