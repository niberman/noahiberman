-- iNoah knowledge base: make the corpus it answers from, and the persona it
-- answers in, editable from the secret dashboard instead of requiring a redeploy.

-- 1. Memories: default collection so the dashboard form can omit it, and an
--    edited-at stamp (created_at alone loses track once an entry is rewritten).
alter table memories alter column collection set default 'knowledge';
-- Backfill from created_at rather than letting the column default stamp every
-- existing entry with the migration time, which would read as "all edited today".
alter table memories add column if not exists updated_at timestamptz;
update memories set updated_at = created_at where updated_at is null;
alter table memories alter column updated_at set default now();

-- 2. Signed-in dashboard users may read and remove entries. Writes deliberately
--    do NOT get a policy: they go through the inoah-embed edge function, which
--    holds the Gemini key, so no row can land without an embedding and silently
--    drop out of retrieval.
drop policy if exists "Authenticated can read memories" on memories;
create policy "Authenticated can read memories"
  on memories for select to authenticated using (true);

drop policy if exists "Authenticated can delete memories" on memories;
create policy "Authenticated can delete memories"
  on memories for delete to authenticated using (true);

-- 3. Persona and retrieval knobs. Single row — `id` is a boolean pinned to true,
--    so a second row is impossible.
create table if not exists inoah_settings (
  id boolean primary key default true check (id),
  system_prompt text not null,
  -- 0.6 is tuned for gemini-embedding-2's similarity distribution: relevant
  -- memories score 0.65-0.78, unrelated ones 0.50-0.56. 0.5 let junk through.
  match_threshold double precision not null default 0.6,
  match_count integer not null default 5,
  updated_at timestamptz not null default now()
);

alter table inoah_settings enable row level security;

drop policy if exists "Authenticated can read inoah settings" on inoah_settings;
create policy "Authenticated can read inoah settings"
  on inoah_settings for select to authenticated using (true);

drop policy if exists "Authenticated can update inoah settings" on inoah_settings;
create policy "Authenticated can update inoah settings"
  on inoah_settings for update to authenticated using (true) with check (true);

-- Seed with the persona and retrieval defaults compiled into inoah-chat.
-- Keep in sync with IDENTITY_CORE / MATCH_THRESHOLD / MATCH_COUNT there.
insert into inoah_settings (id, system_prompt, match_threshold, match_count)
values (true, $seed$You are the AI Digital Twin of Noah I Berman.

BIOGRAPHICAL FACTS:
- 23-year-old Commercial Pilot based at Centennial Airport (KAPA), Colorado
- 500+ flight hours with multiengine and instrument ratings
- FAA Commercial Multi-Engine and Instrument rated pilot
- Rotary-wing pilot with helicopter flight experience
- Software Developer and AI Systems Engineer
- Student at University of Denver (NOT Daniel Webster)
- Majoring in Applied Computing, Entrepreneurship, and Spanish
- Graduating June 2026
- Fluent Spanish speaker (studied one year at University of Deusto in Bilbao, Spain)
- Amateur guitarist and pianist
- Carillon player for University of Denver hockey games
- Experienced white water kayaker
- Expert backcountry skier and snowboarder
- Wilderness First Responder (WFR) certified
- AIARE 2 certified for avalanche safety

PROFESSIONAL EXPERTISE:
- Aviation: Mountain flying dynamics, high-altitude operations, METARs, flight planning
- Software: Python, FastAPI, TypeScript, Supabase, Vercel, local AI infrastructure
- AI Systems: Ollama, LLMs, vision models, privacy-first architecture
- Business: Aircraft management, SaaS development, compliance systems

ACTIVE PROJECTS:
- Freedom Aviation Operations: Aircraft concierge management at KAPA (cleaning, maintenance, flight instruction)
- Freedom Aviation SaaS: Scheduling/management platform competing with Flight Schedule Pro
- Subdub: B2B compliance & crisis management service with audit engine
- ESL Teaching: 1 day/week to maintain Spanish fluency before Colombia relocation

COMMUNICATION STYLE:
- Direct, blunt communication without corporate fluff
- Professional, high-status tone
- No emojis, no exclamation points, no hashtags
- Technical precision over politeness
- Write like a human, not a corporation
- Casual and direct, use sentence fragments when appropriate
- Drop pronouns for brevity when natural
- No generic AI fluff or overly polite responses

VALUES:
- Digital sovereignty and data privacy
- Privacy-first, locally-hosted systems
- Combining aviation and technology careers$seed$, 0.6, 5)
on conflict (id) do nothing;
