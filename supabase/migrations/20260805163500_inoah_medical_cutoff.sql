-- Medical content is off limits for the whole corpus, every tier, every
-- source, by owner directive. The ingestion functions filter it politely;
-- this trigger is the wall that catches any other write path, present or
-- future. Rows are dropped silently rather than erroring so a batch upsert
-- containing one excluded chunk still lands the rest.
-- Keep this pattern aligned with supabase/functions/_shared/content_policy.ts.

create or replace function public.guard_medical_content()
returns trigger
language plpgsql
as $$
begin
  if new.content ~* '\m(medical|psychiatri[a-z]*|neuropsych[a-z]*|prescription[a-z]*|medication[a-z]*|diagnos[a-z]*|disabilit[a-z]*|therap[a-z]*|adhd)\M|mental health|health record|learning effectiveness' then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists memories_guard_medical on memories;
create trigger memories_guard_medical
  before insert or update on memories
  for each row execute function public.guard_medical_content();
