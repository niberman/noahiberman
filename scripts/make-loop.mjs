#!/usr/bin/env node
/**
 * Records a six second, silent, 1200x750 loop (webm + mp4) plus a poster PNG.
 *
 * Scenarios:
 *   node scripts/make-loop.mjs inoah <outDir>
 *   node scripts/make-loop.mjs generic <url> <outDir> [settleMs]
 *
 * Local tooling: playwright-core against the installed Chromium, ffmpeg-static
 * for the trim and the h264 transcode.
 */
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { globSync, mkdirSync, readdirSync, copyFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ffmpeg = path.join(root, "node_modules/ffmpeg-static/ffmpeg");
const exe =
  process.env.CHROME_BIN ||
  globSync(`${process.env.HOME}/.cache/ms-playwright/chromium-*/chrome-linux*/chrome`).sort().pop();

const [scenario, ...rest] = process.argv.slice(2);

/** Playwright screenshots only write png/jpeg; route webp through ffmpeg. */
async function shotWebp(page, out) {
  const tmp = out.replace(/\.webp$/, ".tmp.png");
  await page.screenshot({ path: tmp });
  execFileSync(ffmpeg, ["-y", "-i", tmp, "-c:v", "libwebp", "-quality", "82", out], { stdio: "pipe" });
  rmSync(tmp);
}

async function record(outDir, drive, { skipSeconds: defaultSkip = 0.4 } = {}) {
  mkdirSync(outDir, { recursive: true });
  const tmp = path.join(outDir, ".rec");
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });

  const browser = await chromium.launch({ executablePath: exe });
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 750 },
    recordVideo: { dir: tmp, size: { width: 1200, height: 750 } },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const skipSeconds = (await drive(page, outDir)) ?? defaultSkip;
  await ctx.close();
  await browser.close();

  const raw = path.join(tmp, readdirSync(tmp).find((f) => f.endsWith(".webm")));
  const common = ["-y", "-ss", String(skipSeconds), "-t", "6", "-i", raw, "-an", "-r", "30", "-vf", "scale=1200:750"];
  execFileSync(ffmpeg, [...common, "-c:v", "libvpx", "-b:v", "1.6M", "-crf", "12", path.join(outDir, "loop.webm")], { stdio: "pipe" });
  execFileSync(
    ffmpeg,
    [...common, "-c:v", "libx264", "-crf", "21", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(outDir, "loop.mp4")],
    { stdio: "pipe" }
  );
  rmSync(tmp, { recursive: true, force: true });
  console.log("loop written to", outDir);
}

if (scenario === "inoah") {
  const [outDir] = rest;
  await record(outDir, async (page, out) => {
    const t0 = Date.now();
    const at = () => (Date.now() - t0) / 1000;
    await page.goto("https://noahiberman.com/inoah", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await shotWebp(page, path.join(out, "poster.webp"));
    await page.waitForTimeout(700);
    const chip = page.getByRole("button", { name: "Who is Noah Berman?" });
    const clickAt = at();
    if (await chip.count()) {
      await chip.hover();
      await page.waitForTimeout(350);
      await chip.click();
    } else {
      await page.locator("textarea, input[type=text]").first().pressSequentially("Who is Noah Berman?", { delay: 55 });
      await page.keyboard.press("Enter");
    }
    // Wait for the reply to actually stream, then keep recording long enough
    // that a 6s window starting just before the click ends on moving text.
    await page.waitForTimeout(600);
    const baseline = await page.evaluate(() => document.body.innerText.length);
    await page
      .waitForFunction(
        (base) =>
          !/Thinking/.test(document.body.innerText) && document.body.innerText.length > base + 80,
        baseline,
        { timeout: 30000 }
      )
      .catch(() => {});
    const streamAt = at();
    // Window must end on streaming text; open on the chips when latency allows.
    const skip = Math.max(0.2, Math.min(clickAt - 1.0, streamAt + 2.4 - 6), streamAt + 2.4 - 6);
    const need = skip + 6.6 - at();
    if (need > 0) await page.waitForTimeout(need * 1000);
    return skip;
  });
} else if (scenario === "generic") {
  const [url, outDir, settle = "2500"] = rest;
  await record(outDir, async (page, out) => {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(Number(settle));
    await shotWebp(page, path.join(out, "poster.webp"));
    // Gentle life: slow scroll down and back with a drifting cursor.
    await page.mouse.move(300, 300);
    for (let i = 0; i < 12; i++) {
      await page.mouse.move(300 + i * 55, 300 + Math.sin(i / 2.2) * 90, { steps: 6 });
      await page.mouse.wheel(0, i < 7 ? 90 : -90);
      await page.waitForTimeout(420);
    }
    await page.waitForTimeout(1200);
  });
} else {
  console.error("unknown scenario");
  process.exit(1);
}
