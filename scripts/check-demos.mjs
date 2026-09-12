#!/usr/bin/env node
/**
 * Daily uptime check for the /projects demo links. Pings every demoUrl in
 * src/data/projects.json and rewrites public/demo-status.json with
 * online/offline per slug. The site reads that file to draw a status dot on
 * each card and to swap a dead demo's button for an offline state.
 *
 * Run by .github/workflows/demo-uptime.yml on a daily schedule; the workflow
 * commits the file only when a status actually changed.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { projects } = JSON.parse(readFileSync(path.join(root, "src/data/projects.json"), "utf8"));

async function ping(url) {
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
        headers: { "user-agent": "noahiberman-uptime/1.0" },
      });
      if (res.ok) return "online";
      if (method === "GET") return "offline";
    } catch {
      if (method === "GET") return "offline";
    }
  }
  return "offline";
}

const checks = projects.filter((p) => p.demoUrl);
const entries = await Promise.all(checks.map(async (p) => [p.slug, await ping(p.demoUrl)]));
const out = {
  checkedAt: new Date().toISOString(),
  status: Object.fromEntries(entries),
};
writeFileSync(path.join(root, "public/demo-status.json"), JSON.stringify(out, null, 2) + "\n");
console.log("check-demos:", out.status);
