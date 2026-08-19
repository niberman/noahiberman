-- Park the features nothing calls. Each table below has zero rows and no
-- reachable caller: LinkedIn posting, AI post generation and the CRM were
-- deployed but never wired to a UI, and the rest are leftovers from earlier
-- generations of the schema (memories/conversations predate `memories`,
-- `bookings` was never written to because /scheduling/book only creates a
-- Google Calendar event).
--
-- They move to a non-exposed schema rather than being dropped: PostgREST only
-- serves the exposed schemas, so this takes them off the API surface while
-- keeping the structure, policies and any future data. Reversal is one
-- statement per table (`alter table archive.x set schema public`).
create schema if not exists archive;

-- The corpus sync reads site tables listed in ingest_sources; disable the two
-- that are moving so the hourly run stops querying them. This is the same kill
-- switch the sync already honours, so no function redeploy is needed.
update public.ingest_sources
   set enabled = false
 where kind = 'site_table'
   and external_id in ('ventures', 'projects');

-- LinkedIn posting / AI post generation / CRM: functions deleted, tables parked.
alter table public.uploads             set schema archive;
alter table public.generated_posts     set schema archive;
alter table public.crm_contacts        set schema archive;

-- Superseded by `memories` + `inoah_settings`.
alter table public.inoah_memory        set schema archive;
alter table public.inoah_conversations set schema archive;

-- Never wired up.
alter table public.scheduled_posts     set schema archive;
alter table public.agent_logs          set schema archive;
alter table public.bookings            set schema archive;
alter table public.ventures            set schema archive;
alter table public.projects            set schema archive;
