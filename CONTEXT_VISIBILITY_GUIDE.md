# iNoah Context Visibility Guide

This guide explains the 4 ways you can inspect what context the AI is pulling from during RAG (Retrieval Augmented Generation) operations.

## Overview

The iNoah chatbot uses RAG to retrieve relevant memories/context from a vector database before generating responses. This ensures responses are grounded in your actual knowledge base rather than just the model's training data.

## Option 1: Frontend Debug Mode (Easiest)

**How to use:**
1. Open the iNoah chat widget on your website
2. Toggle the "Debug Mode" switch in the chat header
3. Send a message
4. Click on "Context Sources" below the AI's response to see what memories were retrieved

**What you'll see:**
- Number of context sources used
- Content of each memory chunk
- Similarity score (0-100%) for each match
- Metadata associated with each memory

**Best for:** Quick debugging during conversations, seeing exactly what influenced a specific response

---

## Option 2: Server-Side Logging (Development)

**How to use:**
1. Open your Supabase project dashboard
2. Navigate to: **Functions** → **inoah-chat** → **Logs**
3. Send messages through the chat
4. View real-time logs showing retrieved context

**What you'll see in logs:**
```json
{
  "prompt": "tell me about aviation",
  "matchCount": 3,
  "memories": [
    {
      "id": "uuid-here",
      "content": "First 100 chars of memory...",
      "similarity": 0.87,
      "metadata": { "source": "flight_logs" }
    }
  ]
}
```

**Best for:** Development debugging, monitoring RAG performance, troubleshooting context retrieval issues

---

## Option 3: Direct Database Queries (Advanced)

**How to use:**
1. Open Supabase SQL Editor
2. Run queries from `supabase/debug-context-queries.sql`

**Example queries:**

### View all memories
```sql
SELECT id, content, metadata, created_at
FROM memories
ORDER BY created_at DESC
LIMIT 20;
```

### Search for specific content
```sql
SELECT id, content, similarity
FROM memories
WHERE content ILIKE '%aviation%'
LIMIT 10;
```

### Memory statistics
```sql
SELECT 
  COUNT(*) as total,
  AVG(LENGTH(content)) as avg_content_length,
  MIN(created_at) as oldest_memory,
  MAX(created_at) as newest_memory
FROM memories;
```

**Best for:** Auditing your knowledge base, understanding what data is stored, bulk analysis

---

## Option 4: API Response (Programmatic)

**How to use:**
Send requests to the iNoah edge function with `debug_mode: true`:

```typescript
const response = await fetch('https://your-project.supabase.co/functions/v1/inoah-chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'your-anon-key',
  },
  body: JSON.stringify({
    prompt: 'tell me about aviation',
    include_context: true,
    debug_mode: true,
  }),
});

const data = await response.json();
console.log(data.debug.context_sources);
```

**Response format with debug_mode:**
```json
{
  "status": "success",
  "response": "AI response here...",
  "context_included": true,
  "debug": {
    "context_sources": [
      {
        "id": "memory-uuid",
        "content": "Full memory content...",
        "similarity": 0.87,
        "metadata": { "source": "..." },
        "created_at": "2026-01-29T..."
      }
    ],
    "context_count": 5,
    "raw_context": "Combined context string sent to AI..."
  }
}
```

**Best for:** Integration testing, automated monitoring, custom analytics

---

## How Context Retrieval Works

### Parameters
- **Embedding Model:** `text-embedding-004` (Google, 768 dimensions)
- **Match Threshold:** `0.5` (50% similarity minimum)
- **Match Count:** `5` (top 5 most relevant memories)

### Process
1. User sends a prompt
2. Prompt is converted to a 768-dimensional vector embedding
3. Vector similarity search finds the top 5 closest memories in the database
4. Only memories above 50% similarity threshold are included
5. Memories are joined with `---` separators and injected into system prompt
6. AI generates response using both system identity + retrieved context

### Database Function
The `match_memories` RPC function performs the vector similarity search:

```sql
SELECT id, content, similarity, metadata, created_at
FROM match_memories(
  query_embedding := <768-dim vector>,
  match_threshold := 0.5,
  match_count := 5
);
```

---

## Troubleshooting

### No context retrieved
- Check if memories exist in database: `SELECT COUNT(*) FROM memories;`
- Verify embedding dimensions match (768)
- Lower match_threshold if needed (edit in `index.ts`)

### Wrong context retrieved
- Review similarity scores in debug mode
- Check memory content quality in database
- Consider updating/refining memory chunks

### Debug mode not working
- Ensure frontend deployed with latest changes
- Check browser console for errors
- Verify edge function deployed: `npx supabase functions deploy inoah-chat`

---

## Configuration

To adjust RAG behavior, edit `/supabase/functions/inoah-chat/index.ts`:

```typescript
// Line ~316-320
const { data: memories, error: matchError } = await supabase.rpc("match_memories", {
  query_embedding: embedding,
  match_threshold: 0.5,  // Adjust: 0.0 (loose) to 1.0 (strict)
  match_count: 5,        // Adjust: number of memories to retrieve
});
```

---

## Best Practices

1. **Use debug mode** during development to understand what context influences responses
2. **Monitor server logs** to catch RAG errors or performance issues
3. **Audit your database** regularly to ensure high-quality memory content
4. **Start strict** (high threshold) and lower if needed
5. **Keep memories atomic** - each should be a self-contained piece of knowledge

---

## Next Steps

- **Improve memory quality:** Clean up or refine existing memories
- **Add metadata tags:** Use metadata to categorize and filter memories
- **Adjust thresholds:** Fine-tune based on observed similarity scores
- **Expand knowledge base:** Add more memories for better coverage
