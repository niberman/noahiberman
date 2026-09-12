# noahiberman.com

Personal website and command center for **Noah Berman** -- commercial pilot, software engineer, and entrepreneur based at Centennial Airport (KAPA), Colorado.

Live at [noahiberman.com](https://noahiberman.com).

---

## What This Is

A full-stack web application that serves as both a public portfolio and a private operations dashboard. The public site features an interactive 3D flight map, a blog, an AI digital twin (iNoah), a self-hosted scheduling system, and bilingual content. The private dashboard manages flight status, logbook imports, blog posts, meeting types, and AI agents.

---

## Architecture

```
Frontend (React/Vite)        Backend (FastAPI/Python)       Edge Functions (Deno/Supabase)
├── Home + 3D Flight Map     ├── Scheduling engine          ├── iNoah chat (Gemini + RAG)
├── Blog                     ├── Google Calendar OAuth       ├── Contact email notifications
├── /inoah chat              ├── ForeFlight logbook sync     ├── Aircraft status CRUD
├── /book scheduling         └── Vercel serverless via       └── Flight tracking
├── /dashboard (protected)       api/index.py wrapper
└── SEO + structured data
```

**Database:** Supabase (PostgreSQL + pgvector + Row Level Security)
**Hosting:** Vercel (frontend + Python serverless functions)

---

## Key Features

### Interactive 3D Flight Map
Mapbox GL globe on the homepage renders every flight from the logbook as arc routes. Data is sourced from Supabase (synced from ForeFlight) with a static fallback. Supports live aircraft position tracking when the pilot toggles "Currently Flying" in the dashboard. Hub routes fan out from KAPA with separate handling for Puerto Rico connecting segments.

### iNoah -- AI Digital Twin
Voice-first RAG agent that answers strangers in Noah's first-person voice, from his public notes only. Available as a site-wide launcher (side panel on desktop, full-screen sheet on mobile) and inline at `/inoah`.

**What a visitor gets.** A permanent disclosure line ("You are talking to iNoah, an AI built by Noah. It answers from his public notes."), shown before the first turn, read aloud, and logged to `inoah_events` as shown. Six suggested question chips rotating from a pool of eighteen, all drawn from the corpus so the first click always lands on a strong answer. Replies stream token by token over SSE and are spoken as they stream: the reply is cut into sentence-sized segments and the first segment plays while the rest is still arriving, which keeps first audio inside a 700ms budget. A waveform moves while iNoah speaks. Mute persists per visitor. Transcript copy and an "Ask Noah directly" mailto are one tap away.

**Voice engines.** `inoah-tts` proxies ElevenLabs when `ELEVENLABS_API_KEY` is set on the Supabase project and reports `browser` otherwise, in which case the client speaks with the SpeechSynthesis API. The widget probes once per page load and switches automatically, so adding the key upgrades the voice with no deploy.

**Retrieval and honesty.** `inoah-chat` embeds the question with `gemini-embedding-2`, retrieves through `match_memories_public` (its SQL body hardcodes `visibility = 'public'`, which is the entire privacy wall), and answers via OpenRouter with the persona in `inoah_settings.system_prompt`. When nothing clears the match threshold, the function declines deterministically without calling the model: it says it does not have that on file and returns the two nearest questions the corpus can answer, which the client renders as chips. iNoah states no flight hours, no revenue, no client names other than Smoothie King, and no proof metrics.

**Corpus flow.** The `AI Context` Drive folder holds `noah.md`, `aviari.md`, `noah-voice-brief.md`, `CONTEXT.md`, and `public-answers.md` (forty question and answer pairs rendered from the first two, one markdown heading per question, each answer carrying its source line in a hidden HTML comment). A Postgres cron job (`inoah-drive-sync-hourly`, `17 * * * *`) calls `inoah-sync-drive`, which re-chunks and re-embeds changed files into `public.memories`. Chunk visibility comes from file frontmatter and per-section markers; only `public` rows are ever retrievable by the site. Editing the Drive files is the whole content workflow, the next hourly pass ships it.

**Evaluation gate.** `npm run eval:inoah` (`scripts/inoah-eval.mjs`) runs thirty held-out stranger questions against the live function and fails on any banned claim from the "Do not claim" lists in `noah.md` and `aviari.md`: hours, revenue, unnameable clients, stack names, proof metrics, aviation-SaaS framing, and the rest. The Vercel build command runs it before `vite build`, so a corpus or prompt regression cannot ship. Style deviations (em dashes, exclamation points, emojis) print as warnings without failing the build.

**Preview.** A six second capture of the widget (chip click, streaming answer, moving waveform) lives at `preview/loop.mp4`, `preview/loop.webm`, and `preview/poster.png`.

### Self-Hosted Scheduling
A Calendly alternative built from scratch. The Python backend manages meeting types, availability profiles with per-day time windows, and buffer rules. Slots are computed by intersecting profile rules with Google Calendar freeBusy data. Booking creates a calendar event and sends invites. Frontend at `/book` with timezone detection and week navigation.

### ForeFlight Logbook Sync
A background job (APScheduler, 24h interval) connects to Gmail via IMAP, finds ForeFlight CSV exports, parses them into structured flight records, and performs a full snapshot replace of the `flights` table. Also supports manual CSV upload from the dashboard.

### Blog
Markdown-rendered blog posts stored in Supabase with image galleries, tags, and SEO structured data. Managed from the dashboard with a TipTap rich text editor.

### Dashboard
Protected owner-only area at `/dashboard` with:
- **Flight Command** -- set tail number and flying status for live tracking
- **Scheduler Manager** -- create/edit meeting types and availability profiles, connect Google Calendar
- **Flight Log Manager** -- view stats, upload ForeFlight CSVs, manage individual flights
- **Blog Post Manager** -- create, edit, publish/unpublish posts
- **Remote Visual Interface** -- stream and control a remote Mac (click, type, send keys)

### Contact Form
Public contact form that writes to Supabase and triggers an Edge Function to send an email notification via Gmail SMTP.

---

## Tech Stack

**Frontend:**
- React 18, TypeScript, Vite
- Tailwind CSS, Shadcn/UI, Framer Motion
- Mapbox GL (3D globe and flight routes)
- TanStack React Query, React Router, TipTap
- react-markdown with remark-gfm and rehype-raw

**Backend:**
- FastAPI (Python) -- scheduling engine, logbook sync, health check
- APScheduler -- background job scheduling
- Deployed as Vercel serverless functions via `api/index.py` ASGI wrapper

**Edge Functions (Supabase/Deno):**
- iNoah chat, contact notifications, aircraft status, flight tracking

**Database & Auth:**
- Supabase (PostgreSQL, pgvector, Row Level Security, Auth, Storage)

**Infrastructure:**
- Vercel (hosting + serverless)

---

## Project Structure

```
.
├── api/                    # Vercel serverless entry point (wraps backend)
├── backend/                # FastAPI application
│   ├── main.py             # App + scheduling/health endpoints
│   └── services/
│       ├── scheduling.py   # Google Calendar OAuth + slot computation + booking
│       └── logbook_sync.py # ForeFlight CSV parsing + Gmail IMAP sync
├── scripts/                # Logbook parsers, seed generators, setup scripts
├── src/
│   ├── components/         # React components
│   │   ├── dashboard/      # Dashboard managers (blog, flights, scheduler)
│   │   ├── inoah/          # Chat shell, input, messages, widget
│   │   ├── sections/       # Homepage sections (about, ventures, blog, contact, flight)
│   │   └── ui/             # Shadcn/UI primitives
│   ├── data/               # Static data (about, brand, ventures, flights fallback)
│   ├── hooks/              # React Query hooks for Supabase tables
│   ├── lib/                # Supabase client, iNoah client, airport utils, CSV parser
│   └── pages/              # Route pages (Home, Dashboard, Blog, Book, Inoah, Login)
├── supabase/
│   ├── functions/          # Deno Edge Functions
│   │   ├── inoah-chat/     # AI digital twin
│   │   ├── notify_contact_message/  # Email notifications
│   │   ├── aircraft-status/# Aircraft CRUD
│   │   └── track-flight/   # Flight tracking
│   └── migrations/         # Database migrations
├── AGENTS.md               # Documentation for all AI agents and automated systems
├── vercel.json             # Vercel routing and serverless config
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+ (for backend)
- Supabase CLI (for database setup)

### Quick Start

See `QUICKSTART.md` for a 5-minute setup guide.

### Manual Setup

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd noahiberman
   npm install
   ```

2. **Environment variables**

   Create a `.env` file in the root:
   ```env
   VITE_MAPBOX_TOKEN=your_mapbox_token
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   Optional for iNoah public chat:
   ```env
   VITE_SUPABASE_FUNCTIONS_URL=your_supabase_url
   VITE_INOAH_FUNCTION_PATH=/functions/v1/inoah-chat
   ```

   Optional for the remote agent interface:
   ```env
   VITE_AGENT_URL=http://127.0.0.1:8000
   VITE_AGENT_SECRET=your_shared_secret
   ```

   Backend (in `backend/.env` or root `.env`):
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:8000/scheduling/auth/callback
   GMAIL_USER=your_gmail
   GMAIL_APP_PASSWORD=your_app_password
   ```

3. **Database setup**
   ```bash
   ./scripts/setup-dashboard.sh
   ```

4. **Run**
   ```bash
   npm run dev          # Frontend (localhost:5173)
   cd backend && uvicorn main:app --reload  # Backend (localhost:8000)
   ```

---

## Deployment

Deployed on **Vercel** with the Python backend running as serverless functions under `/api`. Vercel rewrites route `/scheduling/*` and `/api/*` to the FastAPI app. Frontend is built with Vite.

Supabase Edge Functions are deployed separately via the Supabase CLI.

---

## Documentation

- **AGENTS.md** -- AI agents and automated systems
- **QUICKSTART.md** -- 5-minute quick start guide
- **DASHBOARD_README.md** -- Dashboard features and API documentation
- **DASHBOARD_STRUCTURE.md** -- File organization and structure
- **CHANGELOG.md** -- History of fixes and improvements
