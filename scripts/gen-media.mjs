#!/usr/bin/env node
/**
 * Generates the designed poster (1200x750) and Open Graph image (1200x630)
 * for every project, plus the /projects collection OG image. Runs locally;
 * outputs are committed. Posters for projects with live demos are later
 * replaced by real captures where available; the generated ones remain the
 * design for projects without a demo.
 *
 * Uses playwright-core against the machine's installed Chromium.
 */
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { globSync } from "node:fs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { projects } = JSON.parse(readFileSync(path.join(root, "src/data/projects.json"), "utf8"));

const exe = process.env.CHROME_BIN ||
  globSync(`${process.env.HOME}/.cache/ms-playwright/chromium-*/chrome-linux*/chrome`).sort().pop();

const STATUS_LABEL = {
  "in use": "In use",
  parked: "Parked",
  "in progress": "In progress",
  closed: "Closed",
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function italicizeLastWord(name) {
  const words = name.split(" ");
  if (words.length === 1) return `<em>${esc(name)}</em>`;
  const last = words.pop();
  return `${esc(words.join(" "))} <em>${esc(last)}</em>`;
}

const page_ = (w, h, inner) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500&display=swap">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: ${w}px; height: ${h}px; overflow: hidden; background: #05030b; font-family: Geist, sans-serif; }
  .stage { position: relative; width: 100%; height: 100%;
    background: radial-gradient(ellipse at 12% -10%, #150a24 0%, #05030b 58%); }
  .orbA { position: absolute; left: -18%; top: -42%; width: 74%; aspect-ratio: 1; border-radius: 50%;
    background: radial-gradient(circle, var(--acc-soft), transparent 62%); filter: blur(48px); }
  .orbB { position: absolute; right: -22%; bottom: -55%; width: 82%; aspect-ratio: 1; border-radius: 50%;
    background: radial-gradient(circle, rgba(70,20,130,.4), transparent 60%); filter: blur(56px); }
  .ring { position: absolute; right: -12%; top: 8%; width: 58%; aspect-ratio: 1; border-radius: 50%;
    border: 1.5px solid var(--acc-line); }
  .ring::after { content: ""; position: absolute; inset: 12%; border-radius: 50%;
    border: 1px solid rgba(255,255,255,.05); }
  .dotOnRing { position: absolute; right: calc(-12% + 29%); top: 8%; width: 10px; height: 10px;
    border-radius: 50%; background: var(--acc); box-shadow: 0 0 22px var(--acc); transform: translate(50%, -50%); }
  .frame { position: absolute; inset: 26px; border: 1px solid rgba(255,255,255,.09); border-radius: 22px; }
  .content { position: absolute; inset: 0; padding: 72px 78px; display: flex; flex-direction: column; }
  .eyebrow { display: flex; align-items: center; gap: 14px; font-size: 13px; font-weight: 500;
    letter-spacing: .32em; text-transform: uppercase; color: #a79fb8; }
  .eyebrow .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--acc); box-shadow: 0 0 14px var(--acc); }
  h1 { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; color: #ece6f5;
    font-size: var(--name-size); line-height: .95; letter-spacing: -.02em; max-width: 12ch;
    margin-top: auto; text-wrap: balance; }
  h1 em { color: var(--acc); font-style: italic; }
  .line { margin-top: 26px; font-weight: 300; font-size: 21px; line-height: 1.5; color: #c9c3d6; max-width: 52ch; }
  .foot { margin-top: 40px; display: flex; align-items: center; justify-content: space-between; }
  .site { font-size: 14px; letter-spacing: .08em; color: #7d7590; }
  .chip { font-size: 12px; font-weight: 500; letter-spacing: .24em; text-transform: uppercase;
    color: var(--acc); border: 1px solid var(--acc-line); border-radius: 999px; padding: 9px 18px 8px;
    background: var(--acc-faint); }
  .grid9 { position: absolute; right: 84px; top: 84px; display: grid; grid-template-columns: repeat(3, 16px);
    gap: 14px; }
  .grid9 span { width: 16px; height: 16px; border-radius: 5px; border: 1px solid rgba(255,255,255,.16); }
  .grid9 span.on { background: var(--cell); border-color: transparent; box-shadow: 0 0 16px var(--cell-glow); }
</style></head><body><div class="stage">${inner}</div></body></html>`;

function projectCard(p, w, h, minimal = false) {
  const nameSize = p.name.length > 22 ? 72 : p.name.length > 14 ? 84 : 96;
  const scale = minimal ? 1.24 : 1; // posters carry only the name; let it breathe larger
  const inner = `
  <div class="orbA"></div><div class="orbB"></div>
  <div class="ring"></div>
  <div class="frame"></div>
  <div class="content" style="--name-size:${Math.round((h < 700 ? nameSize * 0.92 : nameSize) * scale)}px">
    <div class="eyebrow"><span class="dot"></span> Noah Berman &nbsp;&middot;&nbsp; Projects</div>
    <h1${minimal ? ' style="margin-bottom:auto"' : ""}>${italicizeLastWord(p.displayName ?? p.name)}</h1>
    ${
      minimal
        ? ""
        : `<div class="line">${esc(p.oneLiner)}</div>
    <div class="foot">
      <div class="site">noahiberman.com/projects/${p.slug}</div>
      <div class="chip">${esc(p.statusNote ?? STATUS_LABEL[p.status])}</div>
    </div>`
    }
  </div>`;
  return page_(w, h, inner);
}

function collectionCard(w, h, accents) {
  const cells = accents
    .map(
      (a, i) =>
        `<span class="on" style="--cell:${a};--cell-glow:${a}55;animation:none;opacity:${0.95 - i * 0.04}"></span>`
    )
    .join("");
  const inner = `
  <div class="orbA"></div><div class="orbB"></div>
  <div class="frame"></div>
  <div class="grid9">${cells}</div>
  <div class="content" style="--name-size:${h < 700 ? 104 : 112}px">
    <div class="eyebrow"><span class="dot"></span> Noah Berman</div>
    <h1>Things you can <em>try</em></h1>
    <div class="line">Live demos of the things I build and run. Open one and use it yourself.</div>
    <div class="foot"><div class="site">noahiberman.com/projects</div></div>
  </div>`;
  return page_(w, h, inner);
}

const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({ deviceScaleFactor: 1 });

const ffmpeg = path.join(root, "node_modules/ffmpeg-static/ffmpeg");

async function shoot(html, w, h, out) {
  const pg = await ctx.newPage();
  await pg.setViewportSize({ width: w, height: h });
  await pg.setContent(html, { waitUntil: "networkidle" });
  await pg.evaluate(() => document.fonts.ready);
  mkdirSync(path.dirname(out), { recursive: true });
  if (out.endsWith(".webp")) {
    const tmp = out.replace(/\.webp$/, ".tmp.png");
    await pg.screenshot({ path: tmp });
    execFileSync(ffmpeg, ["-y", "-i", tmp, "-c:v", "libwebp", "-quality", "82", out], { stdio: "pipe" });
    rmSync(tmp);
  } else {
    await pg.screenshot({ path: out });
  }
  await pg.close();
  console.log("wrote", path.relative(root, out));
}

const REAL_CAPTURES = new Set((process.env.KEEP_POSTERS || "").split(",").filter(Boolean));
for (const p of projects) {
  const accVars = `--acc:${p.accent};--acc-soft:${p.accent}2e;--acc-line:${p.accent}59;--acc-faint:${p.accent}14`;
  const ogHtml = projectCard(p, 1200, 630).replace('class="stage"', `class="stage" style="${accVars}"`);
  // Posters that are real captures from a live demo are never overwritten
  // by the designed title card.
  if (!REAL_CAPTURES.has(p.slug)) {
    const posterHtml = projectCard(p, 1200, 750, true).replace('class="stage"', `class="stage" style="${accVars}"`);
    await shoot(posterHtml, 1200, 750, path.join(root, `public/projects/${p.slug}/poster.webp`));
  }
  await shoot(ogHtml, 1200, 630, path.join(root, `public/og/projects/${p.slug}.png`));
}

const accents = projects.map((p) => p.accent);
const collAcc = `--acc:#b48cf0;--acc-soft:#b48cf02e;--acc-line:#b48cf059;--acc-faint:#b48cf014`;
await shoot(
  collectionCard(1200, 630, accents).replace('class="stage"', `class="stage" style="${collAcc}"`),
  1200,
  630,
  path.join(root, "public/og/projects.png")
);

await browser.close();
