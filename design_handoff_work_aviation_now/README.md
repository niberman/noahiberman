# Handoff: Work, Aviation, Now — "Cinematic editorial" redesign

## Overview
Redesign of three routes on noahiberman.com — `/work` (`src/pages/CaseStudies.tsx`), `/aviation` (`src/pages/Aviation.tsx`), `/now` (`src/pages/Now.tsx`). **All copy, data, and ordering are unchanged**; only presentation changes. Data continues to come from `src/data/caseStudies.ts`, `src/data/aviationTimeline.ts`, `useFlightStats()`, and the constants in `Now.tsx`.

Scope: **only these three pages.** The existing site-wide `Navigation.tsx` and `Footer.tsx` stay as they are on every other route. On these three routes, render the page-local nav and footer described below instead (hide the global ones for these routes, or make the page components full-bleed and let the page own its chrome).

## About the Design Files
`Work.dc.html`, `Aviation.dc.html`, `Now.dc.html` are **design references built in HTML** (they open in a browser via `support.js`; `fx.js` holds the motion helpers). They are not production code. Recreate them in the existing stack — React 18 + Vite + TypeScript + Tailwind + Framer Motion (`m`/`motion`) + Lenis — following the codebase's patterns. Read the HTML for exact values; every style is inline so nothing is hidden in a stylesheet.

## Fidelity
**High-fidelity.** Recreate pixel-perfectly: colors, type, spacing, motion. Tailwind arbitrary values are fine (`text-[clamp(64px,13vw,210px)]`), or add tokens to `tailwind.config.ts` (see Design Tokens).

## Fonts
Add to `index.html` Google Fonts link (or self-host):
- **Instrument Serif** 400, regular + italic — all display type, page nav wordmark, nav active item.
- **Geist** 300/400/500/600 — body, labels, nav links.
- Lucide icons (already in the project via `lucide-react`): `ArrowRight`, `ArrowUpRight`, `Plane`, `Radio`, `Award`, `Wrench`, `GraduationCap`, `Waves`, `Snowflake`, `Mountain`, `Music`, `Github`, `Linkedin`, `Mail`.

Tailwind: `fontFamily.display` currently maps to Playfair — on these pages use a new `font-editorial: ['Instrument Serif','Georgia','serif']` and `font-body: ['Geist','system-ui','sans-serif']` rather than changing the global tokens.

## Design Tokens
Colors (hex, used verbatim):
- Page bg `#040208`; page bg gradient `radial-gradient(ellipse at 50% 0%, #12081f 0%, #040208 55%)`
- Text primary `#ece6f5`; text body `#c9c3d6`; text muted `#a79fb8`
- Accent (brand purple, unchanged) `#8033cc` = `hsl(270 60% 50%)`; accent light `#b48cf0`; hover fill `#9146db`
- Hairline `rgba(255,255,255,.12)`; faint hairline `rgba(255,255,255,.08)`; pill border `rgba(236,230,245,.25)`
- Glow `rgba(128,51,204,.18–.28)`; deep glow `rgba(70,20,130,.35)`

Type scale (all fluid):
- Page H1: Instrument Serif 400, `clamp(64px,13vw,210px)` (Work), `clamp(72px,15vw,240px)` (Aviation), `clamp(110px,24vw,360px)` (Now), line-height .78–.9, letter-spacing −.035 to −.06em. One word italic in `#b48cf0`.
- Section H2: Instrument Serif `clamp(44px,7vw,110px)`, lh .92, ls −.035em, centered; last phrase `<em>` in `#b48cf0`.
- Item title: Instrument Serif `clamp(48px,8vw,136px)` (Work), `clamp(26px,3.2vw,48px)` (Aviation timeline), `clamp(28px,3.6vw,56px)` (Now rows).
- Spanish subtitle: Instrument Serif italic `#b48cf0`, `clamp(24px,3vw,44px)` hero / `clamp(18px,2vw,28px)` items.
- Body: Geist 300, `clamp(16px,1.3vw,19px)`, lh 1.55–1.65, `#c9c3d6`.
- Eyebrow/label: Geist 500, 12px, `letter-spacing:.3em`, uppercase, `#a79fb8`. Tiny status label: 11px, `.26em`.
- Nav links: Geist 500 13px `.02em`; active item Instrument Serif italic 17px `#ece6f5`; wordmark Instrument Serif 24px.

Spacing: section padding `clamp(72px,10vw,140px)` vertical, `clamp(16px,4vw,56px)` horizontal. Content max-widths: Work sections 1200px, Aviation stats 1300px, Aviation timeline 1200px, Now 1200px.
Radii: pills `999px`; cards `24px`. Easing everywhere: `cubic-bezier(0.22,1,0.36,1)` (already `--ease-out-expo` in `index.css`).

## Shared chrome (these 3 pages only)
**Ambient layer** (fixed, behind content, `pointer-events:none`):
- Film grain: fixed div `inset:-48px`, opacity `.06`, the existing `.grain-overlay` SVG turbulence tile at 160px, `grain-shift` animation — reuse the site's existing `.grain-overlay` class.
- Two blurred orbs: (a) `left:10%; top:-20%; 70vw square; radial-gradient(circle, rgba(128,51,204,.28), transparent 60%); blur(60px)`, animates `translate(6vw,-4vh) scale(1.15)` at 50%, 18s ease-in-out infinite. (b) `right:-20%; bottom:-30%; 70vw; rgba(70,20,130,.35); blur(70px)`, `translate(-5vw,6vh) scale(.9)`, 22s.

**Nav** (fixed, `height:76px`, `z-index:100`, `padding:0 clamp(16px,4vw,56px)`, bg `linear-gradient(180deg, rgba(4,2,8,.9), rgba(4,2,8,0))`, no border):
- Left: logo `/logo.png` 24px + "Noah Berman" Instrument Serif 24px.
- Desktop (>760px): right-aligned link row, `gap:clamp(14px,2.2vw,30px)`: Home, Work, Aviation, Now, Blog, Follow My Flight, Contact, iNoah, ES — same targets/behaviour as `Navigation.tsx`'s `sectionLinks`. Inactive `#a79fb8`, hover `#fff`; the current page is Instrument Serif italic 17px `#ece6f5`.
- Mobile (≤760px): link row replaced by a text button "Menu"/"Close" (Instrument Serif italic 20px). Open state: fixed panel `inset:76px 0 0 0`, bg `rgba(4,2,8,.97)` + `backdrop-blur(20px)`, centered vertical list of the same links in Instrument Serif `clamp(40px,11vw,56px)` lh 1.15, footer line "Founder, Pilot, Engineer" (12px .3em uppercase muted) pinned to bottom. Closes on navigation and on breakpoint change.

**Footer** (`border-top:1px solid rgba(255,255,255,.08)`, `padding:clamp(72px,12vw,160px) clamp(16px,4vw,56px) 40px`, centered):
1. `"El cielo no es el límite."` — Instrument Serif italic `clamp(44px,9vw,150px)`, lh .95, ls −.03em, `max-width:14ch`, `text-wrap:balance`, parallax factor 0.1.
2. "The sky is not the limit." — 12px .3em uppercase `#a79fb8`, margin `20px 0 clamp(48px,7vw,96px)`.
3. Link row (Geist 14px, `gap:12px 32px`, wrap): Blog, Follow My Flight, Ask iNoah, Contact, Email(mailto). Hover `#b48cf0`.
4. Icon row: GitHub / LinkedIn / Email, 20px, `#a79fb8`, `gap:22px` — same hrefs as `Footer.tsx`.
5. Logo 20px + "Noah Berman" (Instrument Serif 22px) + "Founder, Pilot, Engineer" (13px muted).
6. "© {year} Noah Berman. All rights reserved." 12px muted.

## Screens

### 1. Work (`/work`)
**Hero** — `min-height:92vh`, centered column, `padding:140px x 60px`.
- Eyebrow "Work".
- H1 "Things I've **built**" — "built" italic `#b48cf0`. Words stagger in (see Motion). Parallax 0.08.
- "Lo que he construido" Instrument Serif italic `clamp(24px,3vw,44px)` `#a79fb8`, margin-top `clamp(20px,3vw,36px)`.
- Intro paragraph (existing copy), Geist 300 `clamp(17px,1.4vw,21px)` `#c9c3d6`, max-width 560px.
- Scroll cue: "SCROLL" 11px .3em + 1×48px vertical line `linear-gradient(180deg,#b48cf0,transparent)`, margin-top `clamp(48px,8vh,96px)`.

**Case-study sections** — one `<section>` per `caseStudies` item, in data order. `min-height:78vh`, flex-centered, `border-top:1px solid rgba(255,255,255,.08)`, `padding:clamp(72px,10vw,140px) clamp(16px,4vw,56px)`, `overflow:hidden`, whole section is the click target → `navigate('/work/${id}')`. Content column `max-width:1200px`, **alternating alignment**: even index left-aligned, odd index right-aligned (`align-items` + `text-align`).
- Cursor glow: absolutely-positioned overlay `radial-gradient(720px circle at var(--gx) var(--gy), rgba(128,51,204,.2), transparent 60%)`, opacity 0→1 on hover (`.6s`), `--gx/--gy` follow the pointer (see `fx.js glow()`).
- Eyebrow row: 32×1px purple rule `#8033cc` + `study.category` (12px .28em uppercase muted). No numbering.
- Title `study.title`: Instrument Serif `clamp(48px,8vw,136px)`, lh .92, ls −.035em, `max-width:16ch`, balance.
- Tagline `study.tagline`: Instrument Serif italic `clamp(24px,3vw,42px)` `#b48cf0`, max 30ch.
- Summary `study.summary`: body style, max-width 600px (not clamped).
- **No tech-stack row** (intentionally removed).
- CTA "Read the case study" + `ArrowRight` 16px: pill, `border:1px solid rgba(236,230,245,.25)`, `padding:14px 24px`, Geist 500 14px, `backdrop-blur(8px)`; hover `border-color:#b48cf0; background:rgba(128,51,204,.15)`; magnetic 0.15.

### 2. Aviation (`/aviation`)
**Stats ledger** (top, `max-width:1300px`, `padding-top:clamp(130px,18vh,190px)`):
- Header row: "Aviation" eyebrow left; right: 7px pulsing dot `#b48cf0` (ring pulse keyframe) + "Live from ForeFlight".
- Four rows separated by `1px rgba(255,255,255,.12)` hairlines (top border on the list). Each row: flex, baseline-aligned, space-between, wraps. Left: the number — Instrument Serif `clamp(72px,13vw,210px)`, lh .9, ls −.05em, tabular-nums, **counts up** from 0 on view (1.8s, ease-out quart). Right: label Instrument Serif italic `clamp(24px,3.4vw,52px)` `#b48cf0`, lowercase ("total hours", "flights", "airports", "mountain hours"). Rows stagger in .15s + i×.12s. Row hover glow as on Work.
- Values from `useFlightStats()`: `totalHoursDisplay`, `totalFlightsDisplay`, `uniqueAirports`, `mountainHours` (the HTML uses placeholders 562+/300+/48/61.2). While loading, show "…" as today.
- Footnote (13px muted): "Live numbers, synced from my ForeFlight logbook - never hand-edited, never stale."

**Hero** — `min-height:70vh` centered: H1 "The **flying**" (`clamp(72px,15vw,240px)`, "flying" italic purple), "El vuelo", intro paragraph — same treatment as Work hero.

**Ratings marquee** — eyebrow "Certificates and ratings" centered; below, a horizontal infinite marquee (translateX 0→−50%, 38s linear, content duplicated once) of pills: `border:1px solid rgba(255,255,255,.14)`, bg `rgba(255,255,255,.02)`, `padding:14px 24px`, Instrument Serif `clamp(20px,1.8vw,26px)`, icon 18px `#b48cf0` left. The `RATINGS` list from `Aviation.tsx` plus "CFI - in progress" styled outline: border `rgba(180,140,240,.7)`, text `#b48cf0` italic, bg `rgba(128,51,204,.1)`, `GraduationCap` icon. Pause on `prefers-reduced-motion`.

**Timeline** "The record, **in order**" (centered H2), `max-width:1200px`:
- Desktop: 3-column grid `minmax(0,1fr) 1px minmax(0,1fr)`, `gap:0 clamp(24px,4vw,64px)`, row padding `clamp(20px,3vw,40px) 0`. A vertical spine at the center: static `1px rgba(255,255,255,.1)` plus a purple progress line (`linear-gradient(180deg,#b48cf0,#8033cc)`) that `scaleY`s from 0→1 as the list scrolls through the viewport (`fx.js progressLine()`).
- Alternate sides: even index → year in col 1 (right-aligned), content in col 3 (left-aligned); odd → mirrored.
- Year: Instrument Serif `clamp(40px,6vw,96px)`, lh .9, `rgba(236,230,245,.45)`; the in-progress item's year is `#b48cf0`.
- Dot on the spine: 11px, `#8033cc`, `box-shadow:0 0 16px`, 2px page-bg border; in-progress dot `#b48cf0` with ring-pulse.
- Content: title (Instrument Serif `clamp(26px,3.2vw,48px)`), `subtitleEs` italic purple, body (max-width 460px).
- Mobile (≤760px): grid `1px minmax(0,1fr)`, spine at left 0, year and content both in col 2 stacked (year row 1, body row 2), left-aligned.

**CTA** centered: H2 "Every route, **on the map**", paragraph, button "Open the flight map" + `ArrowUpRight`: `bg:#8033cc`, white, pill, `padding:20px 36px`, Geist 500 16px, `box-shadow:0 0 80px rgba(128,51,204,.5)`, hover `#9146db`, magnetic 0.3. Same handler as today (`navigate('/')` then `scrollToId('follow-my-flight')`).

### 3. Now (`/now`)
`max-width:1200px`, `padding-top:clamp(130px,18vh,190px)`.
- Header row: "Now" eyebrow; right cluster: pulsing dot + "Live", "Denver HH:MM:SS" (live clock, `Intl.DateTimeFormat` `America/Denver`, 24h, tabular), "Updated {NOW_UPDATED}."
- Hero: flex, items-end, space-between, wrap. H1 "Now**.**" — Instrument Serif `clamp(110px,24vw,360px)`, lh .78, ls −.06em, the period italic purple. Right: "Ahora" italic purple `clamp(30px,4vw,60px)` + "What I am doing right now." body.
- **Right-now ledger**: `border-top` hairline, each `RIGHT_NOW` item a row: grid `minmax(120px,.5fr) minmax(0,1.2fr) minmax(0,1.4fr)`, `gap:clamp(16px,3vw,48px)`, `padding:clamp(28px,4vw,52px) 0`, bottom hairline, hover glow. Col 1: status only — 6px blinking dot `#b48cf0` + "ACTIVE" (11px .26em uppercase purple). **No numbers.** Col 2: title Instrument Serif `clamp(28px,3.6vw,56px)`. Col 3: body.
- **Next** row (`NEXT` items) — same grid; col 1 shows "Next" in Instrument Serif italic `clamp(28px,3vw,44px)` `#b48cf0` and a hollow-dot "QUEUED" label (muted).
- Mobile: rows collapse to a single column.
- H2 "Beyond **the cockpit**" centered, `margin:clamp(72px,10vw,140px) 0 clamp(32px,4vw,56px)`.
- `FLAVOR` cards: `grid auto-fit minmax(240px,1fr)`, centered text, `border:1px solid rgba(255,255,255,.1)`, radius 24px, `backdrop-blur(8px)`, bg radial glow following the cursor (`--mx/--my`), 3D tilt ±4° on hover. Icon 28px purple, title Instrument Serif `clamp(26px,2.4vw,34px)`, body 15px.
- Carillon card (full width, same card style): flex space-between; `Music` icon 28px + title "Carillon" + body; right: "Recording coming soon." Instrument Serif italic 20px muted. Keep `CarillonEmbed`'s `<audio>` probe logic — swap the italic text for the player when the file loads.

## Interactions & Motion
All motion honors `prefers-reduced-motion` (no animation, content visible).
- **Entry (hero)**: `rise` keyframe — from `opacity:0; translateY(.5em); blur(12px)`, `1–1.2s`, ease-out-expo, staggered per word (.15s, .3s, .45s) then Spanish (.65s), intro (.8s), scroll cue (1.1s). Use Framer `m.span` variants.
- **Scroll reveal** (`[data-reveal]`): start `opacity:0; translateY(36px); blur(8px)` → settle over .9s ease-out-expo when 12% visible, once; per-element delay in ms (60/80/110/140/160/200/220/260/300/320 as in the HTML). Framer `whileInView` + `viewport={{once:true, margin:'-8%'}}`.
- **Parallax** (`[data-parallax=f]`): `translateY(-c · f · 200px)` where c = element-center offset from viewport center in viewport heights (−1..1). Framer `useScroll` + `useTransform`.
- **Progress line** (Aviation spine): `scaleY = clamp((0.7·vh − listTop) / listHeight, 0, 1)`.
- **Count-up** (stats): 0→value, 1.8s, `1−(1−p)^4`, suffix "+" preserved, decimals per stat.
- **Cursor glow** (`[data-glow]`): on `mousemove` set `--gx/--gy` (px within element) and `--go:1`; `--go:0` on leave; overlay transitions opacity .5–.6s.
- **Tilt** (`[data-tilt=max]`): `perspective(1000px) rotateX(-y·max) rotateY(x·max) translateY(-3px)`, `.25s ease`; also sets `--mx/--my` (%) for the card's glow.
- **Magnetic** (`[data-magnetic=s]`): element translates toward cursor by `(offset · s)`, `.2s ease`; springs back `.6s` ease-out-expo.
- **Marquee**: `translateX(0 → −50%)` linear infinite on a duplicated track (38s ratings).
- **Pulse dot**: `box-shadow: 0 0 0 0 rgba(180,140,240,.7) → 0 0 0 12px transparent` at 70%, 2s ease-out infinite. **Blink**: opacity to .15 at 50%, 1.6s.
- Nav links: color transition; page-level nav uses the same routing behaviour as `Navigation.tsx` (page routes navigate; hash sections navigate home then `scrollToId`).

## State
- `isMobile` = `matchMedia('(max-width:760px)')` (or `useIsMobile` hook with that breakpoint); `menuOpen` boolean, reset on route change and breakpoint change.
- Aviation: `useFlightStats()` loading → "…" placeholders; count-up runs once numbers arrive.
- Now: 1s interval clock; clear on unmount.
- Cleanup all scroll/resize listeners on unmount (Lenis: use `useLenis` callback instead of `window.scroll` for the parallax/progress ticks).

## Assets
- `/logo.png` (already in `public/`; copy in `assets/logo.png` here for reference).
- Icons: `lucide-react` (already a dependency).
- Grain SVG: reuse `.grain-overlay` from `src/index.css`.

## Files
- `Work.dc.html`, `Aviation.dc.html`, `Now.dc.html` — the three designs (open in a browser; inline styles carry every value).
- `fx.js` — reference implementations of reveal, parallax, progressLine, countUp, glow, tilt, magnetic, clock.
- `support.js` — runtime for viewing the HTML references only; ignore for implementation.
- `assets/logo.png`.
