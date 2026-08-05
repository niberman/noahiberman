-- Two-tier iNoah corpus. The public twin must only ever see rows a human
-- promoted; the boundary lives here in SQL, not in an edge function or a
-- system prompt, so no caller-supplied flag and no future function edit can
-- widen it.

-- Ownership. RLS on memories currently grants every authenticated user full
-- read and delete. Signup is public, so that is equivalent to no protection.
create table if not exists app_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table app_owners enable row level security;
-- No policy: only the service role and security-definer functions read it.

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$ select exists (select 1 from app_owners where user_id = auth.uid()) $$;

-- Tiering. Default private so a failed or missing classification hides the row
-- instead of publishing it. 'never' is for material that must not be promotable
-- by any UI action: medical, financial, legal, and the customer who asked for
-- anonymity.
alter table memories
  add column if not exists visibility text not null default 'private';
alter table memories
  drop constraint if exists memories_visibility_check;
alter table memories
  add constraint memories_visibility_check
  check (visibility in ('public', 'private', 'never'));

-- Existing rows are the stale seed corpus. They go private pending review,
-- which leaves the public twin on its system prompt alone until the reviewed
-- corpus lands. That is the intended safe state, not a regression.
update memories set visibility = 'private' where visibility is null;

create index if not exists memories_visibility_idx on memories (visibility);

-- A one-way door. Nothing marked 'never' can be promoted, by the dashboard,
-- by a bad migration, or by a future agent.
create or replace function public.guard_visibility()
returns trigger
language plpgsql
as $$
begin
  if old.visibility = 'never' and new.visibility is distinct from 'never' then
    raise exception 'visibility never is terminal for memory %', old.id;
  end if;
  return new;
end;
$$;
drop trigger if exists memories_guard_visibility on memories;
create trigger memories_guard_visibility
  before update on memories
  for each row execute function public.guard_visibility();

-- Retrieval. Two functions, not one with a parameter. The public one has its
-- filter written into the body so no caller, and no future edit to an edge
-- function, can widen it.
create or replace function match_memories_public (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (id uuid, content text, metadata jsonb, similarity float)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.content, m.metadata,
         1 - (m.embedding <=> query_embedding) as similarity
  from memories m
  where m.visibility = 'public'
    and 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function match_memories_private (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (id uuid, content text, metadata jsonb, similarity float)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.content, m.metadata,
         1 - (m.embedding <=> query_embedding) as similarity
  from memories m
  where 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
$$;

revoke all on function match_memories(vector, float, int) from public, anon, authenticated;
revoke all on function match_memories_private(vector, float, int) from public, anon, authenticated;
revoke all on function match_memories_public(vector, float, int) from public;
grant execute on function match_memories_public(vector, float, int) to anon, authenticated;
-- Explicit rather than relying on default privileges: the edge functions call
-- these through the service role, and a revoke sweep must never strand them.
grant execute on function match_memories_private(vector, float, int) to service_role;
grant execute on function match_memories(vector, float, int) to service_role;

-- Replace the blanket authenticated policies from 20260803233218.
drop policy if exists "Authenticated can read memories" on memories;
drop policy if exists "Authenticated can delete memories" on memories;
create policy "Owner can read memories"
  on memories for select to authenticated using (public.is_owner());
create policy "Owner can delete memories"
  on memories for delete to authenticated using (public.is_owner());
create policy "Owner can update memory visibility"
  on memories for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists "Authenticated can read inoah settings" on inoah_settings;
drop policy if exists "Authenticated can update inoah settings" on inoah_settings;
create policy "Owner can read inoah settings"
  on inoah_settings for select to authenticated using (public.is_owner());
create policy "Owner can update inoah settings"
  on inoah_settings for update to authenticated
  using (public.is_owner()) with check (public.is_owner());
