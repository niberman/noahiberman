-- The public chat's suggestion chips were three strings compiled into the React
-- bundle. Two of the three named things the public corpus no longer covers, so
-- the twin answered its own suggestions badly. Deriving them from the corpus
-- means a chip can only ever be a question the corpus holds an answer for, and
-- editing public-answers.md in Drive is the whole update path.
--
-- security definer, like match_memories_public, and safe for the same reason:
-- visibility = 'public' is written into the body, so the function cannot return
-- a heading off a private row no matter who calls it. It returns heading lines
-- only, never chunk bodies.
create or replace function public.inoah_public_questions()
returns table (question text)
language sql
stable
security definer
set search_path = public
as $$
  select regexp_replace(split_part(m.content, E'\n', 1), '^#+[ \t]*', '')
  from memories m
  where m.visibility = 'public'
    and split_part(m.content, E'\n', 1) ~ '^#+[ \t].*\?$'
  order by m.source_id, m.chunk_index
$$;

revoke all on function public.inoah_public_questions() from public;
grant execute on function public.inoah_public_questions() to anon, authenticated;
