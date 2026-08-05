# iNoah Context Visibility Guide

How to inspect what context iNoah retrieves during RAG. All of these channels
are owner-only. There is no way to see retrieved context anonymously: the
public function strips debug information for anyone who is not the verified
owner, on purpose.

## Overview

Both twins retrieve from the `memories` table before generating. The public
twin (`inoah-chat`) can only see rows with `visibility = 'public'`, enforced
inside the `match_memories_public` SQL function. The private twin
(`inoah-chat-private`) sees everything, and only answers the owner. The full
tier model is documented in `docs/inoah-data-tiers.md`.

## Option 1: Private dashboard chat (easiest)

1. Sign in and open `/dashboard`.
2. Use the iNoah Private panel. Sources are shown under every reply by
   default: each retrieved chunk with its similarity score.

This is the fastest way to see exactly what influenced a specific answer,
including private rows.

## Option 2: debug_mode on the public twin (owner JWT required)

The public function honors `debug_mode: true` only when the request carries a
bearer token that resolves to a user in `app_owners`. Any other caller gets a
normal 200 with no `debug` key and no error, so the flag leaks nothing.

```typescript
const response = await fetch("https://<project>.supabase.co/functions/v1/inoah-chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: ANON_KEY,
    Authorization: `Bearer ${ownerSessionAccessToken}`,
  },
  body: JSON.stringify({ prompt: "...", debug_mode: true }),
});
```

Use this to check what the public tier specifically retrieves, since it runs
the same `match_memories_public` path a visitor gets.

## Option 3: Server-side logs

Supabase dashboard, Functions, pick the function, Logs. The chat functions log
retrieved chunk heads and similarity scores; the sync function logs a per-run
report with upserted, skipped, excluded and deleted counts.

## Option 4: SQL

The `memories` table is readable only by the owner (RLS) and the service role.
Useful queries from the SQL editor:

```sql
-- corpus by tier and origin
select visibility, coalesce(metadata->>'sync_origin', 'dashboard') as origin, count(*)
from memories group by 1, 2 order by 1, 2;

-- what the public twin can possibly retrieve
select id, left(content, 120), collection from memories where visibility = 'public';

-- recent ingests awaiting review
select id, left(content, 120), ingested_at from memories
where visibility = 'private' and ingested_at > now() - interval '24 hours';
```

## Retrieval parameters

- Embedding: `gemini-embedding-2`, native endpoint, `output_dimensionality: 768`.
- Threshold and count: `inoah_settings.match_threshold` and `match_count`
  (currently 0.6 and 5), editable on the dashboard. 0.6 is tuned for this
  model: relevant chunks score roughly 0.65 to 0.78, unrelated ones 0.50 to
  0.56.
- Retrieval functions: `match_memories_public` (anon and authenticated may
  execute; filter hardcoded) and `match_memories_private` (service role only).
  The legacy `match_memories` is revoked from every client role.

## Troubleshooting

- No context retrieved on the public twin: check there are public rows at all.
  Everything new lands private until promoted on the dashboard.
- A chunk you expect is missing everywhere: it may have been excluded by the
  content policy (see `docs/inoah-data-tiers.md`) or embedded with the wrong
  model. Re-save it through the dashboard to re-embed.
- debug present for anon: that is a security bug, not a feature. The function
  must force it off for anyone not in `app_owners`.
