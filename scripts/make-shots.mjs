#!/usr/bin/env node
/**
 * Captures a three frame screenshot strip from a live demo for a detail
 * page: the landing screen plus two scrolled views. Writes shot-1..3.webp
 * into public/projects/<slug>/ and prints the JSON to paste into
 * projects.json's shots array. Local tooling.
 *
 * Usage: node scripts/make-shots.mjs <slug> <url>
 */
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { globSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ffmpeg = path.join(root, "node_modules/ffmpeg-static/ffmpeg");
const exe =
  process.env.CHROME_BIN ||
  globSync(`${process.env.HOME}/.cache/ms-playwright/chromium-*/chrome-linux*/chrome`).sort().pop();

const [slug, url] = process.argv.slice(2);
if (!slug || !url) {
  console.error("usage: make-shots.mjs <slug> <url>");
  process.exit(1);
}
const outDir = path.join(root, "public/projects", slug);
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1200, height: 750 } });
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2500);

const shots = [];
for (let i = 0; i < 3; i += 1) {
  if (i > 0) {
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(1400);
  }
  const tmp = path.join(outDir, `.shot-${i + 1}.png`);
  const out = path.join(outDir, `shot-${i + 1}.webp`);
  await page.screenshot({ path: tmp });
  execFileSync(ffmpeg, ["-y", "-i", tmp, "-c:v", "libwebp", "-quality", "82", out], { stdio: "pipe" });
  rmSync(tmp);
  shots.push(`/projects/${slug}/shot-${i + 1}.webp`);
}
await browser.close();
console.log(JSON.stringify(shots));
