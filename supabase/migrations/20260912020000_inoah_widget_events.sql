-- Write-only event log for the iNoah widget. The disclosure line must be
-- logged as shown, so the client appends events and nothing public reads back.
create table if not exists public.inoah_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null,
  session_id text,
  payload jsonb not null default '{}'::jsonb,
  constraint inoah_events_type_allowed check (type in ('disclosure_shown', 'widget_open', 'voice_mode')),
  constraint inoah_events_session_len check (session_id is null or char_length(session_id) <= 64),
  constraint inoah_events_payload_size check (pg_column_size(payload) <= 2048)
);

alter table public.inoah_events enable row level security;

-- Anyone may append. No public select, update, or delete policies exist, so
-- the log is invisible to the people writing it.
create policy "inoah events insert" on public.inoah_events
  for insert to anon, authenticated with check (true);
