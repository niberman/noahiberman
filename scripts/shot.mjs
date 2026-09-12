#!/usr/bin/env node
/** Quick page screenshots for QA. Usage: node scripts/shot.mjs <url> <out> [w] [h] [fullPage] [hoverSel] */
import { chromium } from "playwright-core";
import { globSync } from "node:fs";

const [url, out, w = "1440", h = "900", full = "0", hoverSel = ""] = process.argv.slice(2);
const exe =
  process.env.CHROME_BIN ||
  globSync(`${process.env.HOME}/.cache/ms-playwright/chromium-*/chrome-linux*/chrome`).sort().pop();

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
if (hoverSel) {
  await page.hover(hoverSel);
  await page.waitForTimeout(900);
}
await page.waitForTimeout(400);
await page.screenshot({ path: out, fullPage: full === "1" });
await browser.close();
console.log("shot", out);
