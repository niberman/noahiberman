-- Scheduling system tables for private booking engine.

-- Availability profiles define recurring weekly windows.
-- rules JSONB shape: {"mon": ["09:00-12:00", "13:00-17:00"], "tue": ["10:00-16:00"], ...}
create table if not exists availability_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rules jsonb not null default '{}'::jsonb,
  timezone text not null default 'America/Denver',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Meeting types are the bookable link entities.
create table if not exists meeting_types (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  duration_min int not null default 30,
  buffer_min int not null default 0,
  profile_id uuid not null references availability_profiles(id) on delete cascade,
  location_type text not null default 'zoom',
  location_details text,
  is_active boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Single-row table holding the Google OAuth refresh token.
-- Only one row ever exists (the site owner's token).
create table if not exists scheduling_auth (
  id uuid primary key default gen_random_uuid(),
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

-- RLS: all three tables are admin-only (service_role or authenticated owner).
-- Public reads for meeting_types where is_active = true are handled via anon policy.

alter table availability_profiles enable row level security;
alter table meeting_types enable row level security;
alter table scheduling_auth enable row level security;

-- Authenticated users (dashboard admin) get full access.
create policy "admin_availability_profiles" on availability_profiles
  for all using (auth.role() = 'authenticated');

create policy "admin_meeting_types" on meeting_types
  for all using (auth.role() = 'authenticated');

create policy "admin_scheduling_auth" on scheduling_auth
  for all using (auth.role() = 'authenticated');

-- Anonymous users can read active meeting types (public booking page).
create policy "public_read_active_meeting_types" on meeting_types
  for select using (is_active = true);

-- Anonymous users can read availability profiles referenced by active meeting types.
create policy "public_read_availability_profiles" on availability_profiles
  for select using (
    exists (
      select 1 from meeting_types
      where meeting_types.profile_id = availability_profiles.id
        and meeting_types.is_active = true
    )
  );

-- updated_at trigger function (reusable).
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_availability_profiles_updated_at
  before update on availability_profiles
  for each row execute function set_updated_at();

create trigger trg_meeting_types_updated_at
  before update on meeting_types
  for each row execute function set_updated_at();

create trigger trg_scheduling_auth_updated_at
  before update on scheduling_auth
  for each row execute function set_updated_at();
