-- Provenance and idempotency for the corpus. Synced content must be
-- re-runnable for free and traceable back to where it came from, and only
-- sources on an explicit allowlist may feed the corpus at all.

alter table memories add column if not exists source_id text;
alter table memories add column if not exists source_uri text;
alter table memories add column if not exists chunk_index integer;
alter table memories add column if not exists content_hash text;
alter table memories add column if not exists ingested_at timestamptz;

-- Full rather than partial unique index: rows without a source_id (dashboard
-- entries) never collide because nulls are distinct, and PostgREST cannot
-- infer a partial index for its on conflict clause, which would break the
-- upsert path in inoah-ingest.
create unique index if not exists memories_source_chunk_key
  on memories (source_id, chunk_index);

-- Which folders and tables are allowed to feed the corpus, and at what tier.
-- An allowlist, not a denylist. Anything not listed is not synced.
create table if not exists ingest_sources (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('drive_folder', 'site_table', 'repo_file')),
  external_id text not null,
  label text not null,
  default_visibility text not null default 'private'
    check (default_visibility in ('public', 'private', 'never')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (kind, external_id)
);
alter table ingest_sources enable row level security;
create policy "Owner manages ingest sources"
  on ingest_sources for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

create table if not exists sync_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table sync_state enable row level security;
