-- The private twin could retrieve 'never' rows.
--
-- guard_visibility() makes 'never' terminal, so a row can never be *promoted*
-- out of it — but nothing stopped it being *retrieved*. match_memories_private
-- had no visibility predicate at all, so medical, legal, financial and
-- client-anonymity material would have been served to the owner-facing twin
-- and quoted back in answers. The standing directive is that this tier is
-- reachable by no twin, and that belongs in SQL next to the public filter
-- rather than in a prompt.
--
-- Allow-list rather than `<> 'never'`: a tier added later is excluded until
-- someone deliberately admits it, which is the right default for a boundary
-- whose whole job is containment.
create or replace function public.match_memories_private(
  query_embedding vector,
  match_threshold double precision,
  match_count integer
)
returns table(id uuid, content text, metadata jsonb, similarity double precision)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select m.id, m.content, m.metadata,
         1 - (m.embedding <=> query_embedding) as similarity
  from memories m
  where m.visibility in ('public', 'private')
    and 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
$function$;
