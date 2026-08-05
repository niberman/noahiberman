# Agents & AI Systems

This document describes the AI agents and automated systems that power noahiberman.com.

---

## iNoah -- AI Digital Twin

**Type:** Two conversational agents over one tiered corpus
**Runtime:** Supabase Edge Functions (`supabase/functions/inoah-chat/`, `supabase/functions/inoah-chat-private/`)
**Model:** Google Gemini 3.5 Flash, routed through OpenRouter when `OPENROUTER_API_KEY` is set, Gemini direct otherwise
**Embedding:** Google `gemini-embedding-2`, native endpoint, `output_dimensionality: 768`

iNoah is a RAG-powered digital twin. The public twin answers anonymous visitors in the chat widget and at `/inoah`; the private twin answers the signed-in owner on `/dashboard`. Both retrieve from the same `memories` table, but the boundary between them is enforced in Postgres, not in a prompt: see `docs/inoah-data-tiers.md`.

### How it works

1. The prompt is embedded with `gemini-embedding-2` (768 dims; anything embedded with another model or width is stored but never retrieved).
2. The public twin calls the `match_memories_public` RPC, which has `visibility = 'public'` hardcoded in its SQL body. The private twin calls `match_memories_private` after verifying the caller is in `app_owners`. Threshold and count come from `inoah_settings` (currently 0.6 and 5).
3. Retrieved chunks are injected into the system prompt from `inoah_settings.system_prompt`, which is built from `docs/public-profile.md` and editable on the dashboard.
4. Gemini 3.5 Flash generates the response with low reasoning effort; output is post-processed to strip reasoning leakage.

### Guardrails

- **Tier boundary in SQL:** the public RPC cannot see private rows regardless of what any function or caller sends. There is no visibility parameter anywhere.
- **Medical cutoff:** content matching the medical pattern is excluded by every ingestion path and silently dropped by a trigger on `memories`. It cannot enter the corpus from any source.
- **debug_mode:** owner-only. Anonymous callers get the same 200 with no debug key, so the flag is not an oracle.
- **Rate limiting:** 30 requests per IP per minute on the public twin, 120 on the private one.
- **Turnstile:** optional Cloudflare Turnstile verification on the public twin.
- **Max prompt length:** 2,000 characters.

### Ingestion

- `inoah-embed`: dashboard writes; new entries land private.
- `inoah-ingest`: secret-gated batch ingestion; the caller must name a registered `ingest_sources` row and the row decides the tier.
- `inoah-sync-drive`: hourly cron syncs registered Drive folders (always private) and public site tables; idempotent via content hashes and the Drive changes token.

### Client

`src/lib/inoahClient.ts` -- fetch wrappers for both twins; the private one sends the session access token.

---

## Remote Visual Interface (Hands)

**Type:** Remote desktop control agent
**Runtime:** External FastAPI server (configured via `VITE_AGENT_URL`)
**UI:** `src/components/AgentsControl.tsx`

A dashboard widget that streams a live MJPEG video feed from a remote Mac and enables:
- **Click forwarding** -- click on the video to send mouse events to the host at mapped coordinates.
- **Text typing** -- send keystrokes to the remote machine.
- **Key presses** -- send individual keys (Enter, Escape, arrow keys, Command, etc.).

Requires granting Accessibility and Screen Recording permissions to the host process. Authenticated via `VITE_AGENT_SECRET` / `AGENT_SECRET_KEY` shared secret.

---

## ForeFlight Logbook Sync

**Type:** Automated data pipeline
**Runtime:** Python backend (`backend/services/logbook_sync.py`)
**Schedule:**

- Vercel Cron daily at 06:00 UTC → `GET /api/sync/logbook` (production)
- APScheduler every 24h (local dev only; disabled when `VERCEL=1`)

Automatically syncs flight log data from ForeFlight:

1. Connects to Gmail via IMAP and searches for recent ForeFlight logbook export emails.
2. Extracts and parses the attached CSV (handles multiple attachment formats).
3. Parses the ForeFlight CSV into structured flight records (date, route, aircraft, duration, comments).
4. Performs a full snapshot replace of the `flights` table in Supabase.
5. Optionally upserts airport coordinates from CSV latitude/longitude columns into `airport_coordinates`.

The sync endpoint is gated by a `CRON_SECRET` bearer token. Required env vars in production: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.

The frontend (`src/components/dashboard/FlightLogManager.tsx`) also supports manual CSV upload with the same parser (`src/lib/foreflight-csv-parser.ts`).

---

## Scheduling Engine

**Type:** Booking and calendar automation
**Runtime:** Python backend (`backend/services/scheduling.py`)
**Integration:** Google Calendar API (OAuth 2.0)

A self-hosted Calendly alternative that powers the `/book` pages:

1. **Meeting types** and **availability profiles** are stored in Supabase with per-day time windows and buffer rules.
2. Available slots are generated by intersecting profile rules with Google Calendar freeBusy data.
3. Booking creates a Google Calendar event with attendee email, sends invites, and validates the slot is still free at book time.
4. OAuth token management (authorization code exchange, refresh token persistence) is handled via Supabase storage.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/scheduling/auth/url` | Google OAuth consent URL |
| GET | `/scheduling/auth/status` | Whether Google Calendar is connected |
| POST | `/scheduling/auth/exchange` | Exchange OAuth code for tokens |
| GET | `/scheduling/auth/callback` | OAuth redirect handler |
| GET | `/scheduling/primary-meeting` | Homepage CTA meeting slug |
| GET | `/scheduling/meeting-types` | Public meeting type catalog |
| GET | `/scheduling/slots/{slug}` | Available slots for a meeting type |
| POST | `/scheduling/book/{slug}` | Book a specific slot |

---

## Contact Notification Agent

**Type:** Event-driven notification
**Runtime:** Supabase Edge Function (`supabase/functions/notify_contact_message/`)
**Trigger:** Supabase webhook on `contact_messages` insert

When a visitor submits the contact form, this function sends an email notification via Gmail SMTP (denomailer). The email includes the sender's name, email, and message, formatted in both HTML and plain text. Supports webhook secret verification for security.

---

## Aircraft Status API

**Type:** CRUD Edge Function
**Runtime:** Supabase Edge Function (`supabase/functions/aircraft-status/`)

GET/POST endpoints for managing aircraft status records (tail number, type, base airport, status). Used by the dashboard to update the public site's live flight status indicator.

---

## Flight Tracking API

**Type:** CRUD Edge Function (stub)
**Runtime:** Supabase Edge Function (`supabase/functions/track-flight/`)

Accepts a flight identifier and stores tracking data. Currently returns mock FlightAware data -- designed to be connected to the FlightAware AeroAPI for live tracking.

