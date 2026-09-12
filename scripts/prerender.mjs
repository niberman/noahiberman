#!/usr/bin/env node
/**
 * Post-build prerender. Every statically known route gets its own HTML file
 * under dist/ with its own title, description, canonical, Open Graph tags,
 * and JSON-LD, so no route ever returns the home page's head to a crawler.
 * /projects and /projects/[slug] additionally get their full body markup
 * rendered through the SSR bundle; the SPA takes over on load and commits
 * identical markup. Other routes ship an empty #root (their bodies are
 * client rendered, as before) with corrected head data.
 *
 * Runs as part of `npm run build`, after `vite build`.
 */
import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, "dist");
const ORIGIN = "https://noahiberman.com";

const templatePath = path.join(dist, ".prerender-template.html");
const template = await fs.readFile(templatePath, "utf8");

// 1. Build the SSR bundle and load it.
execSync("npx vite build --ssr src/entry-server.tsx --outDir dist-ssr --logLevel warn", {
  cwd: root,
  stdio: "inherit",
});
const entryUrl = pathToFileURL(path.join(root, "dist-ssr/entry-server.js")).href;
const { render, prerenderManifest } = await import(entryUrl);
const routes = prerenderManifest();

// 2. Critical CSS inliner, same configuration as the vite plugin.
const { default: Beasties } = await import("beasties");
const beasties = new Beasties({ path: dist, preload: "media", logLevel: "warn" });

// Beasties prunes Tailwind's preflight reset out of the critical subset, so
// the page reflowed (UA margins, h1 sizing, button chrome) when the deferred
// full stylesheet applied. Pin the layout-affecting resets into the inline
// critical CSS so first paint and final paint agree.
const PREFLIGHT = [
  "blockquote,dl,dd,h1,h2,h3,h4,h5,h6,hr,figure,p,pre{margin:0}",
  "h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}",
  "img,svg,video,canvas,audio,iframe,embed,object{display:block;vertical-align:middle}",
  "img,video{max-width:100%;height:auto}",
  "button,input,optgroup,select,textarea{font-family:inherit;font-size:100%;font-weight:inherit;line-height:inherit;color:inherit;margin:0;padding:0}",
  "button,[role=button]{cursor:pointer}",
  "button{background-color:transparent;background-image:none;border:0}",
  "a{color:inherit;text-decoration:inherit}",
  "ul,ol{list-style:none;margin:0;padding:0}",
  // Metric-adjusted fallbacks (index.css): beasties strips @font-face from
  // the critical subset, but first paint must already use the adjusted
  // metrics or the deferred stylesheet reflows every serif headline.
  '@font-face{font-family:"Instrument Serif Fallback";src:local("Georgia");size-adjust:76.26%;ascent-override:129.82%;descent-override:40.65%;line-gap-override:0%}',
  '@font-face{font-family:"Geist Fallback";src:local("Arial");size-adjust:102.57%;ascent-override:98.47%;descent-override:29.25%;line-gap-override:0%}',
].join("");

function pinPreflight(html) {
  return html.replace("</title>", `</title><style>${PREFLIGHT}</style>`);
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

function replaceAll(html, pattern, replacement, label, route) {
  let hits = 0;
  const out = html.replace(pattern, () => {
    hits += 1;
    return replacement;
  });
  if (hits === 0) throw new Error(`prerender: pattern for ${label} matched nothing on ${route}`);
  return out;
}

function buildHead(html, meta) {
  const url = `${ORIGIN}${meta.path}`;
  const title = esc(meta.title);
  const desc = esc(meta.description);
  const og = `${ORIGIN}${meta.ogImage}`;

  html = replaceAll(html, /<title>[^<]*<\/title>/, `<title>${title}</title>`, "title", meta.path);
  html = replaceAll(
    html,
    /<meta name="title" content="[^"]*" \/>/,
    `<meta name="title" content="${title}" />`,
    "meta title",
    meta.path
  );
  html = replaceAll(
    html,
    /<meta name="description"\s+content="[^"]*" \/>/,
    `<meta name="description" content="${desc}" />`,
    "meta description",
    meta.path
  );
  html = replaceAll(
    html,
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${url}" />`,
    "canonical",
    meta.path
  );
  // hreflang alternates: en and x-default follow the route; the es alternate
  // only makes sense on the bilingual home pair.
  html = html.replace(
    /<link rel="alternate" hreflang="en" href="[^"]*" \/>/,
    `<link rel="alternate" hreflang="en" href="${url}" />`
  );
  html = html.replace(
    /<link rel="alternate" hreflang="x-default" href="[^"]*" \/>/,
    `<link rel="alternate" hreflang="x-default" href="${url}" />`
  );
  html = html.replace(
    /\s*<link rel="alternate" hreflang="es" href="[^"]*" \/>/,
    meta.path === "/es"
      ? `\n  <link rel="alternate" hreflang="es" href="${ORIGIN}/es" />`
      : ""
  );

  const ogPairs = {
    "og:type": meta.ogType,
    "og:url": url,
    "og:title": title,
    "og:description": desc,
    "og:image": og,
    "og:image:alt": title,
    "twitter:url": url,
    "twitter:title": title,
    "twitter:description": desc,
    "twitter:image": og,
    "twitter:image:alt": title,
  };
  for (const [key, value] of Object.entries(ogPairs)) {
    const attr = key.startsWith("og:") ? "property" : "name";
    html = replaceAll(
      html,
      new RegExp(`<meta ${attr}="${key}"\\s+content="[^"]*" \\/>`),
      `<meta ${attr}="${key}" content="${esc(value)}" />`,
      key,
      meta.path
    );
  }
  // The profile-specific OG pair only belongs on the home profile card.
  html = html.replace(/\s*<meta property="profile:(?:first|last)_name" content="[^"]*" \/>/g, "");
  // The home hero preloads its logo at high priority; on every other route
  // that steals bandwidth from the route's own LCP image.
  html = html.replace(/\s*<link rel="preload" as="image" href="\/logo\.webp"[^>]*>/, "");

  // Swap the home page's identity graph for this route's own JSON-LD.
  const ld = meta.jsonLd ? JSON.stringify(meta.jsonLd) : null;
  html = replaceAll(
    html,
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    ld ? `<script type="application/ld+json">${ld}</script>` : "",
    "json-ld",
    meta.path
  );
  return html;
}

function setBody(html, meta) {
  const open = html.indexOf('<div id="root">');
  if (open === -1) throw new Error("prerender: #root not found");
  // The template's #root contains the static home hero shell; find its end by
  // balancing divs from the opening tag.
  let i = html.indexOf(">", open) + 1;
  let depth = 1;
  const tag = /<div\b|<\/div>/g;
  tag.lastIndex = i;
  let match;
  let end = -1;
  while ((match = tag.exec(html))) {
    depth += match[0] === "</div>" ? -1 : 1;
    if (depth === 0) {
      end = match.index;
      break;
    }
  }
  if (end === -1) throw new Error("prerender: unbalanced #root");

  const inner = meta.ssr ? render(meta.path) : "";
  const openTag = meta.ssr ? `<div id="root" data-ssg="${meta.path}">` : '<div id="root">';
  return html.slice(0, open) + openTag + inner + html.slice(end);
}

let count = 0;
for (const meta of routes) {
  let html = buildHead(template, meta);
  html = setBody(html, meta);
  html = await beasties.process(html);
  html = pinPreflight(html);
  const outDir = path.join(dist, meta.path.slice(1));
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "index.html"), html);
  count += 1;
}

// 3. Sitemap covering home plus every prerendered route.
const today = new Date().toISOString().slice(0, 10);
const urlEntry = (loc, priority) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <priority>${priority}</priority>
  </url>`;
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntry(`${ORIGIN}/`, "1.0")}
${routes
  .map((r) =>
    urlEntry(`${ORIGIN}${r.path}`, r.path === "/projects" ? "0.9" : r.path.split("/").length > 2 ? "0.7" : "0.8")
  )
  .join("\n")}
</urlset>
`;
await fs.writeFile(path.join(dist, "sitemap.xml"), sitemap);
await fs.writeFile(path.join(root, "public/sitemap.xml"), sitemap);

await fs.rm(templatePath, { force: true });
await fs.rm(path.join(root, "dist-ssr"), { recursive: true, force: true });
console.log(`prerender: wrote ${count} routes + sitemap`);
