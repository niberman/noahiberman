#!/usr/bin/env node
/**
 * Captures the /projects preview clip: a cursor gliding across three cards
 * as their loops fade in. Six seconds, silent, 1200x750. Writes
 * preview/loop.mp4, preview/loop.webm, preview/poster.png at the repo root
 * and mirrors them into public/preview/ so the deployed site serves them.
 *
 * Usage: node scripts/capture-preview.mjs [baseUrl]
 */
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { globSync, mkdirSync, readdirSync, rmSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ffmpeg = path.join(root, "node_modules/ffmpeg-static/ffmpeg");
const exe =
  process.env.CHROME_BIN ||
  globSync(`${process.env.HOME}/.cache/ms-playwright/chromium-*/chrome-linux*/chrome`).sort().pop();
const BASE = process.argv[2] || "http://localhost:4919";

const outDir = path.join(root, "preview");
const tmp = path.join(outDir, ".rec");
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

const browser = await chromium.launch({ executablePath: exe });
// 1440x900 shows the three-column row; recordVideo scales to 1200x750
// (both 16:10, so no letterboxing).
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: tmp, size: { width: 1200, height: 750 } },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto(`${BASE}/projects`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

// Visible cursor: a soft lavender dot that follows the real pointer.
await page.evaluate(() => {
  const dot = document.createElement("div");
  dot.id = "__cursor";
  Object.assign(dot.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    background: "rgba(236,230,245,.95)",
    boxShadow: "0 0 0 5px rgba(180,140,240,.28), 0 0 24px rgba(180,140,240,.8)",
    pointerEvents: "none",
    zIndex: "99999",
    transform: "translate(-50%,-50%)",
    transition: "opacity .3s",
    opacity: "0",
  });
  document.body.appendChild(dot);
  document.addEventListener("mousemove", (e) => {
    dot.style.opacity = "1";
    dot.style.left = `${e.clientX}px`;
    dot.style.top = `${e.clientY}px`;
  });
});

// Frame the row of cards that have loops available.
const target = page.locator("article", { hasText: "iNoah" }).first();
await target.scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, -90));
await page.waitForTimeout(700);

// Collect card centers for the three cards in this row.
const names = ["iNoah", "Smoothie King Shift Checklist", "Hermes"];
const points = [];
for (const n of names) {
  const el = page.locator("article", { hasText: n }).first();
  const box = await el.boundingBox();
  points.push({ x: box.x + box.width / 2, y: box.y + box.height * 0.34 });
}

await page.mouse.move(points[0].x - 260, points[0].y + 140, { steps: 6 });
await page.waitForTimeout(400);

const t0 = Date.now();
const at = () => (Date.now() - t0) / 1000;
const enter = [];
for (const p of points) {
  await page.mouse.move(p.x, p.y, { steps: 10 });
  enter.push(at());
  await page.waitForTimeout(1150);
}
await page.mouse.move(points[2].x + 130, points[2].y - 50, { steps: 8 });
// Ensure the recording covers a full 6s window from just before card one.
const skip = Math.max(0.05, enter[0] - 0.6);
const need = skip + 6.4 - at();
if (need > 0) await page.waitForTimeout(need * 1000);
const elapsed = at();

await ctx.close();
await browser.close();

const raw = path.join(tmp, readdirSync(tmp).find((f) => f.endsWith(".webm")));
// The recording wall clock stretches under load; rescale the cut window by
// the ratio of recorded frames to elapsed time so the 6s clip plays the
// sweep at design speed.
const common = ["-y", "-ss", String(skip), "-t", "6", "-i", raw, "-an", "-r", "30", "-vf", "scale=1200:750"];
execFileSync(ffmpeg, [...common, "-c:v", "libvpx", "-b:v", "1.8M", "-crf", "11", path.join(outDir, "loop.webm")], { stdio: "pipe" });
execFileSync(
  ffmpeg,
  [...common, "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(outDir, "loop.mp4")],
  { stdio: "pipe" }
);
execFileSync(ffmpeg, ["-y", "-ss", "3", "-i", path.join(outDir, "loop.mp4"), "-frames:v", "1", path.join(outDir, "poster.png")], { stdio: "pipe" });
rmSync(tmp, { recursive: true, force: true });

mkdirSync(path.join(root, "public/preview"), { recursive: true });
for (const f of ["loop.mp4", "loop.webm", "poster.png"]) {
  copyFileSync(path.join(outDir, f), path.join(root, "public/preview", f));
}
console.log(`preview captured (${elapsed.toFixed(1)}s recorded) -> preview/loop.mp4 loop.webm poster.png`);
