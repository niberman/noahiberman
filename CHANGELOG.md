# Changelog

A consolidated history of fixes, features, and improvements.

---

## Recent Updates

### iNoah on OpenRouter (2026-08-16)
- **Fixed**: Both twins hard-failed with a 500 when `GEMINI_API_KEY` was absent, even with `OPENROUTER_API_KEY` set — so the OpenRouter key could never be the only configured provider. The config guard now requires just one of the two
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
