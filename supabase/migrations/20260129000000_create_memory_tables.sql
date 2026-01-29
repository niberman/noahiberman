-- Create memories table for RAG
create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  embedding vector(768),
  collection text not null,
  created_at timestamp with time zone default now()
);

-- Create HNSW index for faster similarity search
create index on memories using hnsw (embedding vector_cosine_ops);

-- Create index on collection for filtering
create index on memories (collection);

-- Enable RLS
alter table memories enable row level security;

-- Create policy to allow read access to service role (and potentially authenticated users if needed)
create policy "Allow service role to manage memories"
  on memories
  using ( auth.role() = 'service_role' )
  with check ( auth.role() = 'service_role' );

-- Create similarity search function
create or replace function match_memories (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    memories.id,
    memories.content,
    memories.metadata,
    1 - (memories.embedding <=> query_embedding) as similarity
  from memories
  where 1 - (memories.embedding <=> query_embedding) > match_threshold
  order by memories.embedding <=> query_embedding
  limit match_count;
end;
$$;
