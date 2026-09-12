# Decisions: the /projects rebuild

Calls made where the brief left room, in roughly the order they came up.

## The nine projects

- The brief's "nine projects in this document" resolve to the eight demo prompts (Aviari Platform, NWKRAFT, Riffcut, iNoah, Smoothie King checklist, Hermes replay, Flight Log Visualizer, Aviari client automation) plus Freedom Aviation, which the ninth prompt names with a required closed state. The ninth prompt is this page itself, so it is not a card.
- Status badges describe the project, not the demo build: iNoah, NWKRAFT, the checklist, Hermes, and the client automation pattern are in use; the Aviari Platform is parked as required; Riffcut and the Flight Log Visualizer are in progress; Freedom Aviation is closed and its badge carries the required "Closed May 2026" text instead of the generic label.
- Riffcut's demo build was skipped upstream because its repository does not exist. It stays on the page as one of the nine, in progress, with no demo button, because absence would read as an error against the ItemList the document promises.
- The Aviari client automation card uses the exact one line the brief dictates. Its name avoids the words product, package, or service.
- Grid order optimizes a cold visitor's first row: the platform, the map visualizer, the briefing tool. Freedom Aviation sits last because closed work belongs at the end of the story.

## Demo URLs and the uptime dot

- projects.json is the single source of truth. A null demo URL renders a card with no Demo button rather than a dead link; the sibling demo builds were still deploying while this page was built, so at deploy time the final sweep bakes in only URLs that answer over HTTP. Adding a late demo is a one field edit.
- The daily uptime check is a GitHub Actions workflow (07:00 UTC) running scripts/check-demos.mjs. It rewrites public/demo-status.json and commits only when a status flips, so the git history stays quiet and each push redeploys the site with fresh dots. No database, per the brief's exception.
- Dots: mint for live, muted red for offline. An offline demo swaps its Demo button for an inert Offline chip, on the card and on the detail page.

## Rendering architecture

- The site is a client rendered single page app, and every route returned the home page's HTML. Rather than migrate frameworks, a post build prerenderer (scripts/prerender.mjs) writes a real HTML file per route with its own title, description, canonical, Open Graph tags, and JSON-LD. Vercel serves files before rewrites, so the SPA fallback only catches genuinely unknown paths.
- /projects and /projects/[slug] are fully server rendered at build time through a small SSR bundle (src/entry-server.tsx), so crawlers and AI agents get the complete content. The other routes get corrected heads with an empty shell: showing the wrong home hero for a beat was worse than showing nothing, and their bodies remain client rendered as before.
- The prerendered pages land with markup already in #root plus a data-ssg marker. React mounts and commits identical markup. Entry animations are skipped when the document arrived prerendered for that exact path, so the takeover is invisible; in app navigation still gets the full editorial entrance. This mirrors the site's existing static hero shell pattern.
- JSON-LD: the collection page carries an ItemList plus one node per project (SoftwareApplication, or Organization for Freedom Aviation with its dissolution date), each keyed to the site's existing Person entity so the graph stays one cluster.

## Performance and stability

- Posters ship as WebP title cards around 15 KB instead of 300 KB PNGs. Where a sibling demo has already produced a real capture, the real screen replaces the designed card; Riffcut and Freedom Aviation keep designed cards permanently since there is nothing to capture.
- The loop videos never load until intent: hover or focus on desktop, mostly in view on touch devices. Reduced motion never mounts a video at all.
- The font swap layout shift was killed with metric adjusted local fallbacks (measured by scripts/font-fallback-metrics.mjs), and the critical CSS inliner was dropping Tailwind's preflight and those @font-face rules from its subset, so the prerenderer pins both into every page's inline critical CSS. Cumulative layout shift went from 0.15 to under 0.01.
- Local Lighthouse numbers during the build were suppressed by seven sibling demo builds saturating the same machine; the production deployment is the measurement of record.

## Interaction design

- Cards use the site's existing editorial vocabulary: cursor glow, accent tinted borders, magnetic pills, slow media zoom. Tilt was considered and dropped; video plus tilt plus glow read as noise.
- The whole card is a stretched link to the detail page with the Demo button layered above it, which keeps the markup valid (no nested anchors) and gives keyboard users two clean stops per card.
- The card grid animates in with the editorial rise stagger on in app navigation only; cold loads render settled for instant, stable paint.
- Detail pages end with a Next project link that cycles the nine, so a visitor who enters on a deep link can walk the whole set without going back.

## Repo buttons

- scripts/check-repos.mjs sends a HEAD request per repository at build time and writes the result into the data layer; private or missing repos drop their button silently, as specified. At build time only the site repo and the Freedom Aviation repo answered publicly.

## Media pipeline

- All preview media is committed, not fetched at build time, so deploys are deterministic and the demos' own uptime cannot break this site's build.
- The iNoah loop was captured from the live site. Its backend was mid upgrade by a sibling build during capture, so the final sweep recaptures it if the answer stream returns.
- The page's own preview clip (/preview) is captured from the running local build: a cursor moving across three cards as their loops fade in, six seconds, silent, 1200x750, MP4 and WebM plus a poster frame.
