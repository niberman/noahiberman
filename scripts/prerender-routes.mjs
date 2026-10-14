#!/usr/bin/env node
// Post-build: give every important route its own HTML file with the right
// <title>, description, canonical, Open Graph tags, and a plain-text version
// of the page in #root. The site is a client-rendered SPA, so without this
// every URL served the homepage head and hero, and crawlers, link previews
// and recruiters' tools saw the same page everywhere.
//
// React replaces #root on mount, so the static block only shows before JS
// runs. It reuses classes the app already ships so it is styled, not raw.
//
// Each file needs a matching rewrite in vercel.json (the catch-all would
// otherwise send the route to /index.html). The script fails the build if
// one is missing, so a new case study cannot ship without its head.
//
// Usage: node scripts/prerender-routes.mjs   (runs after `vite build`)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
const dist = resolve(root, "dist");
const SITE = "https://noahiberman.com";

// Load the TypeScript data modules the pages use, so the prerendered text is
// the same text, not a copy.
async function loadTs(entry) {
  const out = await build({
    entryPoints: [resolve(root, entry)],
    bundle: true,
    format: "esm",
    platform: "neutral",
    write: false,
    logLevel: "silent",
  });
  const code = out.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

const { ROUTE_META } = await loadTs("src/data/routeMeta.ts");
const { caseStudies } = await loadTs("src/data/caseStudies.ts");
const resume = JSON.parse(readFileSync(resolve(root, "src/data/resume.json"), "utf8"));

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Classes borrowed from CaseStudyDetail.tsx so they exist in the built CSS.
const C = {
  main: "min-h-screen bg-background pt-24 sm:pt-28 pb-20 px-4 sm:px-6",
  wrap: "container mx-auto max-w-3xl",
  eyebrow: "text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2",
  h1: "text-3xl sm:text-4xl md:text-5xl font-display font-normal tracking-[-0.03em] text-primary-foreground mb-2",
  sub: "text-xl text-ed-light font-display italic mb-6",
  p: "text-lg text-foreground/90 leading-relaxed mb-8",
  h2: "text-2xl font-display font-normal text-primary-foreground mb-4",
  ul: "space-y-3 mb-10",
  li: "flex items-start gap-3 text-foreground/85",
  a: "text-ed-light",
};

const list = (items) => `<ul class="${C.ul}">${items.map((i) => `<li class="${C.li}">${i}</li>`).join("")}</ul>`;
const page = (inner) => `<main class="${C.main}"><div class="${C.wrap}">${inner}</div></main>`;

const bodies = {
  "/work": () =>
    page(
      `<p class="${C.eyebrow}">Work</p><h1 class="${C.h1}">Things I've built</h1>` +
        `<p class="${C.sub}">Lo que he construido</p>` +
        `<p class="${C.p}">Aviation software first, then the rest of what I have shipped. I built each one myself.</p>` +
        caseStudies
          .map(
            (c) =>
              `<h2 class="${C.h2}"><a class="${C.a}" href="/work/${c.id}">${esc(c.title)}</a></h2>` +
              `<p class="${C.sub}">${esc(c.tagline)}</p><p class="${C.p}">${esc(c.summary)}</p>`,
          )
          .join(""),
    ),
  "/resume": () => {
    const r = resume;
    const exp = r.experience
      .map(
        (e) =>
          `<h2 class="${C.h2}">${esc(e.org)} | ${esc(e.title)}</h2><p class="${C.eyebrow}">${esc(
            [e.place, e.dates].filter(Boolean).join(" | "),
          )}</p>${list(e.bullets.map(esc))}`,
      )
      .join("");
    const proj = r.projects
      .map((p) => `<h2 class="${C.h2}">${esc(p.name)} | ${esc(p.kind)}</h2>${list(p.bullets.map(esc))}`)
      .join("");
    return page(
      `<p class="${C.eyebrow}">Resume</p><h1 class="${C.h1}">${esc(r.name)}</h1>` +
        `<p class="${C.sub}">${esc(r.headline)}</p>` +
        `<p class="${C.p}">${esc(r.location)} | <a class="${C.a}" href="mailto:${esc(r.contact.email)}">${esc(
          r.contact.email,
        )}</a> | ${esc(r.contact.github)} | ${esc(r.contact.linkedin)}<br>${esc(r.availability)}</p>` +
        `<p class="${C.p}">${esc(r.summary)}</p>` +
        `<h2 class="${C.h2}">Experience</h2>${exp}` +
        `<h2 class="${C.h2}">Selected projects</h2>${proj}` +
        `<h2 class="${C.h2}">Certificates and ratings</h2>${list(r.certificates.map(esc))}` +
        `<h2 class="${C.h2}">Pilot in command in</h2><p class="${C.p}">${esc(r.aircraft)}</p>` +
        `<h2 class="${C.h2}">Flight experience</h2>${list(r.flightExperience.map(esc))}` +
        `<h2 class="${C.h2}">Skills</h2>${list(r.skills.map((s) => `${esc(s.label)}: ${esc(s.items)}`))}` +
        `<h2 class="${C.h2}">Education</h2>${list(r.education.map((e) => `${esc(e.school)} | ${esc(e.detail)} | ${esc(e.dates)}`))}` +
        `<h2 class="${C.h2}">Languages and additional</h2>${list(r.additional.map(esc))}`,
    );
  },
  "/aviation": () =>
    page(
      `<p class="${C.eyebrow}">Aviation</p><h1 class="${C.h1}">The flying</h1><p class="${C.sub}">El vuelo</p>` +
        `<p class="${C.p}">Commercial pilot based at Centennial Airport (KAPA). Fixed-wing and rotorcraft, single and multi-engine, VFR and IFR.</p>` +
        `<h2 class="${C.h2}">Certificates and ratings</h2>${list(resume.certificates.map(esc))}` +
        `<h2 class="${C.h2}">Pilot in command in</h2><p class="${C.p}">${esc(resume.aircraft)}</p>` +
        `<h2 class="${C.h2}">Experience</h2>${list(resume.flightExperience.map(esc))}`,
    ),
  "/now": () =>
    page(
      `<p class="${C.eyebrow}">Now</p><h1 class="${C.h1}">Now.</h1><p class="${C.sub}">Ahora</p>` +
        `<p class="${C.p}">${esc(ROUTE_META["/now"].description)}</p>`,
    ),
  "/es": () =>
    page(
      `<p class="${C.eyebrow}">Noah Berman</p><h1 class="${C.h1}">Piloto, Ingeniero de software</h1>` +
        `<p class="${C.sub}">Software de aviación, hecho por un piloto.</p><p class="${C.p}">${esc(ROUTE_META["/es"].description)}</p>`,
    ),
};

for (const c of caseStudies) {
  bodies[`/work/${c.id}`] = () =>
    page(
      `<p class="${C.eyebrow}">${esc(c.category)}</p><h1 class="${C.h1}">${esc(c.title)}</h1>` +
        `<p class="${C.sub}">${esc(c.tagline)}</p><p class="${C.eyebrow}">${esc(c.year)} | ${esc(c.status)}</p>` +
        `<p class="${C.p}">${esc(c.summary)}</p><h2 class="${C.h2}">What I built</h2>${list(c.highlights.map(esc))}` +
        (c.stack.length ? `<p class="${C.p}">${c.stack.map(esc).join(", ")}</p>` : "") +
        `<p class="${C.p}"><a class="${C.a}" href="/resume">Resume</a> | <a class="${C.a}" href="mailto:noah@noahiberman.com">noah@noahiberman.com</a></p>`,
    );
}

const metaFor = (route) => {
  if (ROUTE_META[route]) return ROUTE_META[route];
  const c = caseStudies.find((s) => `/work/${s.id}` === route);
  return { title: `${c.title} | Noah Berman`, description: c.summary };
};

const template = readFileSync(resolve(dist, "index.html"), "utf8");

function render(route) {
  const { title, description } = metaFor(route);
  const url = `${SITE}${route}`;
  let html = template;
  const set = (re, value, label) => {
    if (!re.test(html)) throw new Error(`prerender: ${label} not found in dist/index.html`);
    html = html.replace(re, value);
  };
  set(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`, "<title>");
  set(/(<meta name="title" content=")[^"]*(")/, `$1${esc(title)}$2`, "meta title");
  set(/(<meta name="description"\s+content=")[^"]*(")/, `$1${esc(description)}$2`, "meta description");
  set(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`, "og:title");
  set(/(<meta property="og:description"\s+content=")[^"]*(")/, `$1${esc(description)}$2`, "og:description");
  set(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`, "og:url");
  set(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`, "twitter:title");
  set(/(<meta name="twitter:description"\s+content=")[^"]*(")/, `$1${esc(description)}$2`, "twitter:description");
  set(/(<meta name="twitter:url" content=")[^"]*(")/, `$1${url}$2`, "twitter:url");
  set(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`, "canonical");
  set(/(<meta property="og:type" content=")[^"]*(")/, `$1website$2`, "og:type");
  // The hreflang pair describes the homepage only.
  html = html.replace(/\s*<link rel="alternate" hreflang="[^"]*" href="[^"]*"\s*\/?>/g, "");
  if (route === "/es") html = html.replace('<html lang="en"', '<html lang="es"');
  // Swap the homepage hero shell for this route's static content.
  const start = html.indexOf('<div id="root">');
  const end = html.indexOf("</div>\n  <script>", start);
  if (start < 0 || end < 0) throw new Error("prerender: #root shell boundaries not found");
  html = `${html.slice(0, start)}<div id="root">${bodies[route]()}${html.slice(end)}`;
  return html;
}

const routes = Object.keys(bodies);
const vercel = JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8"));
const rewritten = new Set(
  (vercel.rewrites || []).filter((r) => r.destination === `${r.source}/index.html`).map((r) => r.source),
);
const missing = routes.filter((r) => !rewritten.has(r));
if (missing.length) {
  console.error(`prerender: vercel.json has no rewrite to <route>/index.html for: ${missing.join(", ")}`);
  process.exit(1);
}

for (const route of routes) {
  const file = resolve(dist, `.${route}`, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, render(route));
}
console.log(`prerender: wrote ${routes.length} route heads (${routes.join(", ")})`);
