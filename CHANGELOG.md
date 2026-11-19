# Changelog

A consolidated history of fixes, features, and improvements.

---

## Recent Updates

### iNoah voice and iOS pass (2026-11-19)
Every public route was driven in WebKit, the engine behind iOS Safari, under iPhone 15, iPhone SE, iPhone 15 Pro Max, landscape iPhone 15 and iPad Mini profiles, then re-checked in Chrome.
- **Changed**: iNoah no longer starts the browser's built-in voice by itself. When the ElevenLabs voice is unavailable, replies stay silent until the visitor taps the speaker, and that choice lasts for the page, not across visits. The ElevenLabs voice behaves as before (on by default, mute remembered)
- **Fixed**: When ElevenLabs failed partway through a reply, the system voice took over unasked. It now drops to silent
- **Fixed**: The homepage hero switched layouts partway down the first scroll on most iPhones. Its short-screen rules used a max-height media query, and Safari's toolbar collapsing makes the viewport about 90px taller. They now key off the small viewport height, which does not move
- **Fixed**: The hero was sized to 100vh, which on iOS is the height with the toolbar hidden, so its lower edge and scroll cue started out under the toolbar. It is now sized to the visible area
- **Fixed**: The iNoah page card and the mobile menu type were sized in dvh and resized as the toolbar came and went. Both use the stable small viewport now
- **Fixed**: Entrances and scroll reveals animated a blur filter, which repaints every frame and stutters on a phone exactly as a section scrolls in. Touch devices get the same rise and fade with no blur. Pointer devices are unchanged
- **Fixed**: Phone in landscape: map cards slid under the nav bar, the iNoah launcher sat on their last line, and the nav logo ignored the notch inset. Cards now stay below the bar and clear of the launcher, the launcher folds to its glyph, and fixed chrome adds the safe-area inset
- **Fixed**: iNoah on phones: opening it raised the keyboard over the suggested questions, and with the keyboard up Safari pushed the header and close button off the top. It opens with the keyboard down and the sheet now sizes itself to the space above the keyboard
- **Fixed**: iOS zoomed the page on focus for telephone, password, number and select fields (only text and email were covered), and contact fields were 14px on phones
- **Added**: Motion a phone can use: a slow aura drifting across the hero in place of the cursor spotlight, ledger rows that light as they cross the middle of the screen in place of the cursor glow (Safari 26 and later), and a press-in on buttons and pills. All off under reduced motion
- **Changed**: The iNoah eval gate retries a question twice on a network error, a 5xx or an empty answer, and reports unanswered questions separately from banned claims. When the model provider refuses the account (out of credits, over quota, bad key) it stops at the first such answer and says so. It still fails the build in every one of these cases
- **Result**: 60 WebKit screens (12 routes on 5 iPhone and iPad profiles) and 72 Chrome screens (18 routes at 4 widths) with no crash, horizontal overflow, clipped text, broken image or page error. Before the blur change the same WebKit run crashed on most editorial pages. Worst layout shift is about 0.02. Not yet checked on a physical iPhone: the toolbar, keyboard and notch behaviour cannot be reproduced in a desktop build of WebKit

### Front-end audit and polish (2026-11-18)
Every public route was driven in a headless browser at 320, 390, 768 and 1440px wide (plus a landscape phone and reduced motion), against the live site first and then against this build served under the production origin.
- **Fixed**: Typing a capital D in any field (contact form, booking form, iNoah composer) fired the Shift+D dashboard shortcut and threw the visitor onto the login page. The shortcut now ignores keystrokes made while typing
- **Fixed**: An invisible 96px hit box in the top-left corner (the secret dashboard zone, z-9999) swallowed every click on the nav logo and on the map's Exit Map button. The zone is now matched by pointer position with no element in the way
- **Fixed**: Deep links (/work, /blog/..., any route but /) painted the homepage hero first, then the footer directly under the nav, then the real page. The static shell is hidden off the homepage and the route fallback holds a full viewport. Layout shift on those loads went from about 1.0 to about 0
- **Fixed**: The homepage footer rendered underneath the fixed flight map, so the quote and links showed through map tiles, routes and place names
- **Fixed**: The contact section used `backdrop-blur-xs`, which is not a Tailwind 3 class, so map labels and routes showed through the form copy
- **Fixed**: Page content scrolled straight through the nav wordmark and links. The bar now blurs and fades what passes under it
- **Fixed**: Mobile menu: the page scrolled behind it, Escape did nothing, the last items fell off a 568px-tall phone, and a seam showed where the bar ended. It now locks scroll, closes on Escape, sizes to the viewport height and covers the screen
- **Fixed**: iNoah on phones: the empty state was scrolled to its bottom on open (orb and heading cut off the top, "More questions" cut off the bottom), the subtitle was truncated, and a dead band sat under the composer
- **Fixed**: Homepage hero on phones: map place names ran through the headline and buttons, the route hub was half off the left edge, and on short screens the logo slid under the nav wordmark
- **Fixed**: Explore Map mode left the waypoint card (still offering "Click to Explore Map") and the iNoah launcher parked on top of the map, and the Exit button and hint sat flush against the screen edge (`env(x, 16px)` only falls back when env() is unsupported)
- **Fixed**: The iNoah launcher covered the footer's copyright line on phones, and the footer signature broke "Noah / Berman" across two lines at 320px
- **Fixed**: Waypoint cards were 246px wide on tablets and broke titles mid-phrase
- **Fixed**: Invalid `-webkit-tap-highlight-color` value (rgba() with HSL components) that browsers were discarding
- **Improved**: First-visit font swap no longer moves anything. Metric-matched local fallbacks for Instrument Serif keep headlines on the same lines before and after the web font loads (the desktop homepage headline used to wrap to two lines and snap back: 0.30 layout shift, now about 0)
- **Improved**: Route navigation keeps the current page on screen until the next one is ready, and nav links prefetch their page on hover, focus or menu open
- **Improved**: Waypoint card handoffs no longer resize their container, the contact section reserves its measured height, the phone launcher folds to its glyph once the visitor scrolls, and keyboard focus gets one on-palette ring site-wide
- **Improved**: Blog and booking pages hold a full viewport while their data loads, so the footer no longer shows and then jumps down, and the launch screen no longer re-centers on narrow phones when its status line changes
- **Result**: 72 screens (18 routes at 4 widths) with no horizontal overflow, clipped text, broken images, page errors or failed requests. Worst layout shift on any screen went from 1.12 to under 0.02

### iNoah on OpenRouter (2026-08-16)
- **Fixed**: Both twins hard-failed with a 500 when `GEMINI_API_KEY` was absent, even with `OPENROUTER_API_KEY` set. As a result, the OpenRouter key could never be the only configured provider. The config guard now requires just one of the two
- **Fixed**: The Gemini fallback built a client with an undefined key when Gemini was unconfigured, masking the real OpenRouter error behind a second failure. It now rethrows the original
- **Changed**: Retrieval degrades to answering without context (with a warning) instead of blocking startup when the embedding key is missing; embeddings stay on `gemini-embedding-2` because OpenRouter has no embeddings endpoint and the stored vectors are not comparable to any other model
- **Added**: `OPENROUTER_API_KEY` and `GEMINI_API_KEY` documented in `.env.example` with the `supabase secrets set` commands, and the provider route logged per request alongside the existing `provider` response field

### iNoah Corpus Tiering (2026-08-05)
- **Security**: Closed the public context leak. Anonymous `debug_mode` no longer returns retrieved chunks; the flag is owner-only and silent for everyone else
- **Security**: Replaced blanket authenticated RLS on `memories` and `inoah_settings` with owner-only policies backed by an `app_owners` table; disabled public signup
- **Added**: Visibility tiers (`public`, `private`, `never`) with the boundary enforced in SQL: `match_memories_public` hardcodes its filter, `never` is terminal via trigger
- **Added**: `inoah-chat-private`, an owner-only twin over the full corpus, with a private chat panel on the dashboard
- **Added**: Hourly Google Drive sync of registered folders through a read-only service account; allowlist-driven, idempotent, always private
- **Added**: Dashboard tier controls: private review queue, type-publish promotion dialog, one-click demotion
- **Added**: Corpus-wide medical content cutoff enforced by a shared ingestion filter and a database trigger, plus a one-time purge
- **Changed**: Public persona rebuilt from the verified profile with hard refusals for unsettled facts; retired the stale seed identity and the decorative prompt blocklist
- **Changed**: Ingestion is secret-gated and idempotent; the unauthenticated bootstrap path is gone

### Flight Tracking System
- **Fixed**: Supabase 406 errors by changing `.single()` to `.maybeSingle()`
- **Fixed**: Duplicate flight indicators - now shows single clean indicator
- **Fixed**: Mapbox CSS warnings with global import
- **Added**: Collapsible live flight tracking map
- **Added**: Last update timestamp for live data
- **Improved**: Background map transitions seamlessly into interactive card
- **Improved**: Data accuracy with fallback calculations for heading

### Mobile Responsiveness
- Added mobile hamburger menu with smooth animations
- Responsive text sizing across all breakpoints (4xl → 8xl)
- Touch-friendly buttons with 44px minimum targets
- iOS safe area inset support
- Optimized map rendering for mobile devices
- Enhanced viewport configuration for mobile browsers

### Dashboard System
- Built comprehensive owner dashboard at `/dashboard`
- AI Agents management card
- Personal CRM with contact tracking
- Aircraft status monitoring
- Flight tracking integration
- AI post generator with image upload
- Full Row Level Security (RLS) on all tables

### Security & Authentication
- Secret dashboard access system (hidden click zones, keyboard shortcuts, mobile gestures)
- Protected routes with Supabase authentication
- Content Security Policy (CSP) headers for Cloudflare
- Environment variable validation and fixes

### Environment & Configuration
- Fixed invalid Mapbox tokens
- Corrected Supabase API keys
- Updated CSP headers for Cloudflare Insights
- Improved Vite server configuration

---

## Testing

See `TESTING_CHECKLIST.md` for comprehensive testing procedures.

---

## Documentation

- **Main README**: Project overview and setup
- **QUICKSTART**: 5-minute setup guide
- **DASHBOARD_README**: Dashboard features and API
- **DASHBOARD_STRUCTURE**: File organization

---

## Known Issues & Resolutions

All major issues have been resolved. See git history for detailed fix information.

---

*For detailed technical documentation, see individual README files in the root directory.*
