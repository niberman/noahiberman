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
RAG-powered conversational agent that mirrors Noah's voice and knowledge. Uses Google Gemini 2.0 Flash with `text-embedding-004` embeddings matched against a pgvector `memories` table. Available as a site-wide chat widget and at `/inoah`. Rate-limited, prompt-filtered, and optionally Turnstile-protected.

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
