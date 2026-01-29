-- Debug queries for iNoah RAG context visibility
-- Run these queries in Supabase SQL Editor to inspect what context is available

-- 1. View all memories in the database
SELECT 
  id,
  content,
  metadata,
  created_at,
  updated_at
FROM memories
ORDER BY created_at DESC
LIMIT 20;

-- 2. Count total memories
SELECT COUNT(*) as total_memories
FROM memories;

-- 3. View memories by metadata tags (if you use tags)
SELECT 
  metadata->>'tag' as tag,
  COUNT(*) as count
FROM memories
WHERE metadata IS NOT NULL
GROUP BY metadata->>'tag'
ORDER BY count DESC;

-- 4. Search for specific content in memories
SELECT 
  id,
  content,
  similarity
FROM memories
WHERE content ILIKE '%aviation%'  -- Change search term here
ORDER BY created_at DESC
LIMIT 10;

-- 5. View the match_memories function definition
-- This shows the exact SQL used for RAG retrieval
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'match_memories'
  AND routine_schema = 'public';

-- 6. Test the match_memories function with a sample embedding
-- Note: You'll need to replace the embedding array with actual values
-- This is just a template
SELECT 
  id,
  content,
  similarity,
  metadata
FROM match_memories(
  query_embedding := ARRAY[0.1, 0.2, ...]::vector,  -- Replace with actual embedding
  match_threshold := 0.5,
  match_count := 5
);

-- 7. Check memory table schema
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'memories'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. View recent memories added (last 24 hours)
SELECT 
  id,
  content,
  created_at,
  metadata
FROM memories
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 9. Find memories with highest similarity to a search term
-- Note: This requires the pg_trgm extension for text similarity
SELECT 
  id,
  content,
  similarity(content, 'your search term here') as text_similarity
FROM memories
WHERE similarity(content, 'your search term here') > 0.3
ORDER BY text_similarity DESC
LIMIT 10;

-- 10. Memory statistics
SELECT 
  COUNT(*) as total,
  AVG(LENGTH(content)) as avg_content_length,
  MAX(LENGTH(content)) as max_content_length,
  MIN(LENGTH(content)) as min_content_length,
  MIN(created_at) as oldest_memory,
  MAX(created_at) as newest_memory
FROM memories;
