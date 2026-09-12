#!/usr/bin/env node
/**
 * Measures web font vs local fallback metrics in a real browser and prints
 * the @font-face override blocks (size-adjust, ascent/descent-override) that
 * make the fallback occupy the same space, killing the font swap layout
 * shift. Output is pasted into index.css. Local tooling.
 */
import { chromium } from "playwright-core";
import { globSync } from "node:fs";

const exe = globSync(`${process.env.HOME}/.cache/ms-playwright/chromium-*/chrome-linux*/chrome`).sort().pop();
const b = await chromium.launch({ executablePath: exe });
const page = await b.newPage();
await page.setContent(`<!doctype html><html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&display=swap">
</head><body></body></html>`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.load('100px "Instrument Serif"'));
await page.evaluate(() => document.fonts.load('300 100px "Geist"'));
await page.evaluate(() => document.fonts.ready);

const pairs = [
  { name: "Instrument Serif", fallback: "Georgia" },
  { name: "Geist", fallback: "Arial" },
];

const result = await page.evaluate((pairs) => {
  const SAMPLE = "Things you can try Pruebalo tu mismo Flight school operations in one place";
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const measure = (font) => {
    ctx.font = `100px "${font}"`;
    const m = ctx.measureText(SAMPLE);
    return {
      width: m.width,
      ascent: m.fontBoundingBoxAscent,
      descent: m.fontBoundingBoxDescent,
    };
  };
  return pairs.map(({ name, fallback }) => {
    const t = measure(name);
    const f = measure(fallback);
    const sizeAdjust = t.width / f.width;
    return {
      name,
      fallback,
      sizeAdjust: (sizeAdjust * 100).toFixed(2),
      // Overrides are a percentage of the adjusted em box.
      ascent: ((t.ascent / 100 / sizeAdjust) * 100).toFixed(2),
      descent: ((t.descent / 100 / sizeAdjust) * 100).toFixed(2),
    };
  });
}, pairs);

for (const r of result) {
  console.log(`@font-face {
  font-family: "${r.name} Fallback";
  src: local("${r.fallback}");
  size-adjust: ${r.sizeAdjust}%;
  ascent-override: ${r.ascent}%;
  descent-override: ${r.descent}%;
  line-gap-override: 0%;
}`);
}
await b.close();
