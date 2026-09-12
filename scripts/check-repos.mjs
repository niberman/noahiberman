#!/usr/bin/env node
/**
 * Build-time repository reachability check for /projects.
 *
 * Sends a HEAD request to every repoUrl in src/data/projects.json and writes
 * src/data/repo-status.json mapping url -> boolean. The page only renders a
 * repo button when its URL resolved publicly, so a private or deleted repo
 * degrades to no button instead of a 404 for visitors.
 *
 * Network failures keep the previously committed status rather than mass
 * dropping buttons because a build machine was briefly offline.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataPath = path.join(root, "src/data/projects.json");
const outPath = path.join(root, "src/data/repo-status.json");

const { projects } = JSON.parse(readFileSync(dataPath, "utf8"));
let previous = {};
try {
  previous = JSON.parse(readFileSync(outPath, "utf8"));
} catch {
  /* first run */
}

const urls = [...new Set(projects.map((p) => p.repoUrl).filter(Boolean))];

async function headOk(url) {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch (err) {
    return null; // network trouble: caller falls back to the committed value
  }
}

const entries = await Promise.all(
  urls.map(async (url) => {
    const ok = await headOk(url);
    if (ok === null) {
      console.warn(`check-repos: ${url} unreachable, keeping previous value`);
      return [url, previous[url] ?? false];
    }
    return [url, ok];
  })
);

const status = Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(outPath, JSON.stringify(status, null, 2) + "\n");
console.log("check-repos:", status);
