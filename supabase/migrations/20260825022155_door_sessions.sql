-- Recovered from supabase_migrations.schema_migrations (version 20260825022155,
-- name "door_sessions"): this was applied via the Supabase MCP tool without a
-- matching repo file, which failed the Supabase Preview check on main with
-- "Remote migration versions not found in local migrations directory".
-- Statements reproduced verbatim from the recorded migration.

create table door_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  slug text,
  ip_hash text not null,
  language text not null default 'en',
  label text,
  card jsonb,
  messages jsonb not null default '[]',
  email text,
  email_sent_at timestamptz,
  flagged boolean not null default false
);

alter table door_sessions enable row level security;

create index door_sessions_ip_idx on door_sessions (ip_hash, created_at);
