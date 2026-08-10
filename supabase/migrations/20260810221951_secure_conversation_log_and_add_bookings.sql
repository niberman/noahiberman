-- 1. inoah_conversations: close the anon-key hole before it holds visitor content.
alter table public.inoah_conversations enable row level security;

create policy "Service role manages conversations"
  on public.inoah_conversations for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Owner can read conversations"
  on public.inoah_conversations for select to authenticated
  using (is_owner());

create policy "Owner can delete conversations"
  on public.inoah_conversations for delete to authenticated
  using (is_owner());

-- Rehydrating a session by session_id is the hot path once the agent is multi-turn.
create index if not exists inoah_conversations_session_created_idx
  on public.inoah_conversations (session_id, created_at);

-- 2. agent_logs: same hole, same fix.
alter table public.agent_logs enable row level security;

create policy "Service role manages agent logs"
  on public.agent_logs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Owner can read agent logs"
  on public.agent_logs for select to authenticated
  using (is_owner());

-- 3. bookings: the missing record. source distinguishes the existing direct
-- /book flow from anything the agent books, so the direct path stays intact
-- and stays visible.
create table if not exists public.bookings (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid,
  source            text not null default 'direct' check (source in ('direct', 'agent')),
  meeting_type_slug text not null,
  slot_start        timestamptz not null,
  slot_end          timestamptz,
  guest_name        text not null,
  guest_email       text not null,
  google_event_id   text,
  brief             jsonb not null default '{}'::jsonb,
  status            text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'failed')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Idempotency. One confirmed booking per chat session, so a retrying or
-- confused agent cannot book the same visitor twice.
create unique index if not exists bookings_one_confirmed_per_session
  on public.bookings (session_id)
  where session_id is not null and status = 'confirmed';

-- Never record the same calendar event twice.
create unique index if not exists bookings_google_event_id_key
  on public.bookings (google_event_id)
  where google_event_id is not null;

create index if not exists bookings_slot_start_idx
  on public.bookings (slot_start desc);

alter table public.bookings enable row level security;

create policy "Service role manages bookings"
  on public.bookings for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Owner can read bookings"
  on public.bookings for select to authenticated
  using (is_owner());

create policy "Owner can update bookings"
  on public.bookings for update to authenticated
  using (is_owner())
  with check (is_owner());

-- Reuse the existing set_updated_at() rather than defining another one.
drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();
