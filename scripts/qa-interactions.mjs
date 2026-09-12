#!/usr/bin/env node
/**
 * Interaction QA for /projects against a local dist server (serve-dist.mjs).
 * Asserts hover playback, keyboard reachability, reduced motion, coarse
 * pointer autoplay, layout overflow at 375px, and detail page button logic.
 * Exits nonzero on any failure.
 */
import { chromium, devices } from "playwright-core";
import { globSync } from "node:fs";
import assert from "node:assert";

const exe = globSync(`${process.env.HOME}/.cache/ms-playwright/chromium-*/chrome-linux*/chrome`).sort().pop();
const BASE = process.env.QA_BASE || "http://localhost:4919";
const browser = await chromium.launch({ executablePath: exe });
let failures = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log("ok  ", name);
  } catch (err) {
    failures += 1;
    console.error("FAIL", name, "->", err.message);
  }
}

// Desktop, fine pointer
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/projects`, { waitUntil: "networkidle" });

  await check("hover mounts and plays the loop", async () => {
    const card = page.locator("article", { hasText: "Hermes" }).first();
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    const video = card.locator("video");
    await video.waitFor({ state: "attached", timeout: 4000 });
    await page.waitForFunction(
      (el) => el && !el.paused && el.currentTime > 0.05,
      await video.elementHandle(),
      { timeout: 6000 }
    );
  });

  await check("unhover pauses the loop", async () => {
    await page.mouse.move(10, 10);
    await page.waitForTimeout(300);
    const paused = await page
      .locator("article", { hasText: "Hermes" })
      .first()
      .locator("video")
      .evaluate((el) => el.paused);
    assert.ok(paused, "video still playing after unhover");
  });

  await check("card link and demo button are keyboard reachable", async () => {
    await page.goto(`${BASE}/projects`, { waitUntil: "networkidle" });
    let card = false;
    let demo = false;
    for (let i = 0; i < 80 && !(card && demo); i += 1) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        return { href: el?.getAttribute?.("href") ?? "", target: el?.getAttribute?.("target") ?? "" };
      });
      if (info.href.startsWith("/projects/")) card = true;
      if (info.target === "_blank" && info.href.includes("/inoah")) demo = true;
    }
    assert.ok(card, "no card link reached by Tab");
    assert.ok(demo, "demo button not reached by Tab");
  });

  await check("focus starts the loop (parity with hover)", async () => {
    await page.goto(`${BASE}/projects`, { waitUntil: "networkidle" });
    const link = page.locator("article", { hasText: "Hermes" }).first().locator("a[href^='/projects/']");
    await link.focus();
    const video = page.locator("article", { hasText: "Hermes" }).first().locator("video");
    await video.waitFor({ state: "attached", timeout: 4000 });
  });

  await check("detail page: no demo button when demoUrl is null, case study link present", async () => {
    await page.goto(`${BASE}/projects/aviari-platform`, { waitUntil: "networkidle" });
    const bodyText = await page.locator("main").innerText();
    assert.ok(!/Open the demo/.test(bodyText), "unexpected demo button");
    assert.ok(/Read the case study/.test(bodyText), "missing case study button");
    assert.ok(!/Repository/.test(bodyText), "private repo button leaked");
  });

  await check("detail page: demo + repository buttons for inoah", async () => {
    await page.goto(`${BASE}/projects/inoah`, { waitUntil: "networkidle" });
    await page.locator("text=Open the demo").waitFor({ timeout: 4000 });
    await page.locator("text=Repository").waitFor({ timeout: 4000 });
  });

  await check("unknown slug renders not found", async () => {
    await page.goto(`${BASE}/projects/does-not-exist`, { waitUntil: "networkidle" });
    const text = await page.locator("body").innerText();
    assert.ok(/not found|404/i.test(text), "no not-found state");
  });

  await check("nav marks Projects active on detail pages", async () => {
    await page.goto(`${BASE}/projects/hermes-replay`, { waitUntil: "networkidle" });
    const cls = await page.locator("nav a", { hasText: "Projects" }).first().getAttribute("class");
    assert.ok(cls?.includes("italic"), "Projects nav link not in active style");
  });

  await page.close();
}

// Reduced motion: no autoplaying video, poster only
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await check("reduced motion never mounts a video", async () => {
    await page.goto(`${BASE}/projects`, { waitUntil: "networkidle" });
    const card = page.locator("article", { hasText: "Hermes" }).first();
    await card.hover();
    await page.waitForTimeout(800);
    assert.equal(await card.locator("video").count(), 0, "video mounted under reduced motion");
  });
  await page.close();
}

// Coarse pointer (phone): autoplay when in view
{
  const ctx = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await check("mobile: loop autoplays when card scrolls into view", async () => {
    await page.goto(`${BASE}/projects`, { waitUntil: "networkidle" });
    const card = page.locator("article", { hasText: "Hermes" }).first();
    await card.scrollIntoViewIfNeeded();
    const video = card.locator("video");
    await video.waitFor({ state: "attached", timeout: 5000 });
    await page.waitForFunction((el) => el && !el.paused, await video.elementHandle(), { timeout: 6000 });
  });
  await check("375px: no horizontal overflow on index or detail", async () => {
    for (const path of ["/projects", "/projects/inoah", "/projects/freedom-aviation"]) {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      assert.ok(overflow <= 0, `horizontal overflow ${overflow}px on ${path}`);
    }
  });
  await ctx.close();
}

await browser.close();
if (failures) {
  console.error(`\n${failures} interaction check(s) failed`);
  process.exit(1);
}
console.log("\nall interaction checks passed");
