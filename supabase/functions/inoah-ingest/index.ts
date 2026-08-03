// NOTE: this file was recovered from the deployed function (version 1) — it had
// been deployed to the noahiberman project without ever being committed. Kept
// so `supabase functions deploy` and the dashboard agree on what is live.
//
// Its "bootstrap" action is spent: it self-limits to an empty memories table,
// and the table now holds the 14 seeded rows. Day-to-day editing happens in the
// dashboard via inoah-embed, which uses this same gemini-embedding-2 /
// embedContent path so entries stay retrievable.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMBEDDING_MODEL = "gemini-embedding-2";
const EMBEDDING_DIMS = 768; // must match public.memories.embedding vector(768)
const MAX_ITEMS = 50;
const MAX_CONTENT_LENGTH = 4000;

// Seed knowledge base for the one-time bootstrap. Every fact here comes from
// the iNoah persona prompt or from data already in this database (flights
// table aggregates) — nothing invented. Written in first person to match the
// digital twin's voice when injected as context.
const SEED_MEMORIES: { content: string; collection: string; metadata: Record<string, unknown> }[] = [
  {
    content:
      "I'm a 23-year-old commercial pilot based at Centennial Airport (KAPA) in Colorado. 500+ flight hours, FAA Commercial Multi-Engine and Instrument rated, plus rotary-wing experience flying helicopters.",
    collection: "core-bio",
    metadata: { source: "persona-prompt", topic: "aviation" },
  },
  {
    content:
      "My aviation specialty is mountain flying out of the Colorado Front Range: mountain flying dynamics, high-altitude operations, density altitude planning, METAR interpretation, and flight planning around terrain.",
    collection: "core-bio",
    metadata: { source: "persona-prompt", topic: "aviation" },
  },
  {
    content:
      "The flight log on noahiberman.com tracks 330 flights logged since May 2021 across 67 different aircraft, with the most recent flights in May 2026.",
    collection: "core-bio",
    metadata: { source: "flights-table", topic: "aviation" },
  },
  {
    content:
      "I study at the University of Denver — not Daniel Webster — majoring in Applied Computing, Entrepreneurship, and Spanish. Graduating June 2026.",
    collection: "core-bio",
    metadata: { source: "persona-prompt", topic: "education" },
  },
  {
    content:
      "I speak fluent Spanish. Studied for a year at the University of Deusto in Bilbao, Spain, and I currently teach ESL one day a week to keep the fluency sharp before relocating to Colombia.",
    collection: "core-bio",
    metadata: { source: "persona-prompt", topic: "languages" },
  },
  {
    content:
      "Software side: I'm a developer and AI systems engineer. Primary stack is Python, FastAPI, TypeScript, Supabase, and Vercel.",
    collection: "core-bio",
    metadata: { source: "persona-prompt", topic: "software" },
  },
  {
    content:
      "AI systems work: I run local AI infrastructure with Ollama — LLMs and vision models — built around a privacy-first architecture. Digital sovereignty and data privacy are core values; I prefer privacy-first, locally-hosted systems.",
    collection: "core-bio",
    metadata: { source: "persona-prompt", topic: "software" },
  },
  {
    content:
      "Freedom Aviation Operations is my aircraft concierge management business at Centennial Airport (KAPA): cleaning, maintenance coordination, and flight instruction for aircraft owners.",
    collection: "core-bio",
    metadata: { source: "persona-prompt", topic: "projects" },
  },
  {
    content:
      "Freedom Aviation SaaS is a scheduling and management platform for flight operations I'm building — it competes with Flight Schedule Pro.",
    collection: "core-bio",
    metadata: { source: "persona-prompt", topic: "projects" },
  },
  {
    content:
      "Subdub is my B2B compliance and crisis management service, built around an audit engine.",
    collection: "core-bio",
    metadata: { source: "persona-prompt", topic: "projects" },
  },
  {
    content:
      "Music: amateur guitarist and pianist. I also play the carillon for University of Denver hockey games.",
    collection: "core-bio",
    metadata: { source: "persona-prompt", topic: "personal" },
  },
  {
    content:
      "Outdoors: experienced whitewater kayaker and expert backcountry skier and snowboarder. Wilderness First Responder (WFR) certified and AIARE 2 certified for avalanche safety.",
    collection: "core-bio",
    metadata: { source: "persona-prompt", topic: "outdoors" },
  },
  {
    content:
      "Career direction: combining aviation and technology — aircraft management and SaaS development on the business side, AI systems engineering on the technical side.",
    collection: "core-bio",
    metadata: { source: "persona-prompt", topic: "values" },
  },
  {
    content:
      "iNoah is the AI digital twin on noahiberman.com. It answers questions about Noah's background, projects, and expertise using retrieval-augmented generation: Supabase pgvector for the knowledge base, Gemini for embeddings and generation.",
    collection: "core-bio",
    metadata: { source: "persona-prompt", topic: "meta" },
  },
];

async function embedText(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        output_dimensionality: EMBEDDING_DIMS,
      }),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`embedContent ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMS) {
    throw new Error(
      `embedContent returned ${values?.length ?? 0} dims, expected ${EMBEDDING_DIMS}`,
    );
  }
  return values;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!supabaseUrl || !supabaseKey || !geminiKey) {
    console.error("Missing environment variables");
    return json(500, { error: "Server configuration error." });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  try {
    // action: "bootstrap" — one-time, self-limiting seed. Only runs while the
    // memories table is empty, and only inserts the fixed SEED_MEMORIES baked
    // into this function, so it needs no secret: the worst an anonymous
    // caller can do is install the intended seed content once.
    if (payload?.action === "bootstrap") {
      const { count, error: countError } = await supabase
        .from("memories")
        .select("id", { count: "exact", head: true });
      if (countError) return json(500, { error: countError.message });
      if ((count ?? 0) > 0) {
        return json(409, { status: "skipped", reason: `memories already has ${count} rows` });
      }

      const rows = [];
      for (const seed of SEED_MEMORIES) {
        const embedding = await embedText(seed.content, geminiKey);
        rows.push({
          content: seed.content,
          embedding,
          metadata: seed.metadata,
          collection: seed.collection,
        });
      }
      const { error: insertError } = await supabase.from("memories").insert(rows);
      if (insertError) return json(500, { error: insertError.message });

      console.log(`Bootstrap complete: ${rows.length} memories seeded with ${EMBEDDING_MODEL}@${EMBEDDING_DIMS}`);
      return json(200, {
        status: "success",
        inserted: rows.length,
        model: EMBEDDING_MODEL,
        dims: EMBEDDING_DIMS,
      });
    }

    // action: "ingest" — add arbitrary memories. Disabled until the
    // INGEST_SECRET function secret is configured in Supabase.
    if (payload?.action === "ingest") {
      const secret = Deno.env.get("INGEST_SECRET");
      if (!secret) {
        return json(403, { error: "Ingestion disabled: set the INGEST_SECRET function secret to enable it." });
      }
      if (typeof payload?.secret !== "string" || payload.secret !== secret) {
        return json(403, { error: "Invalid ingest secret." });
      }

      const items = Array.isArray(payload?.items) ? payload.items : [];
      if (items.length === 0 || items.length > MAX_ITEMS) {
        return json(400, { error: `items must contain 1-${MAX_ITEMS} entries.` });
      }
      for (const item of items) {
        if (
          typeof item?.content !== "string" ||
          !item.content.trim() ||
          item.content.length > MAX_CONTENT_LENGTH
        ) {
          return json(400, {
            error: `Each item needs non-empty string content of at most ${MAX_CONTENT_LENGTH} chars.`,
          });
        }
      }

      const rows = [];
      for (const item of items) {
        const embedding = await embedText(item.content.trim(), geminiKey);
        rows.push({
          content: item.content.trim(),
          embedding,
          metadata: item.metadata ?? {},
          collection: typeof item.collection === "string" ? item.collection : "default",
        });
      }
      const { error: insertError } = await supabase.from("memories").insert(rows);
      if (insertError) return json(500, { error: insertError.message });

      console.log(`Ingested ${rows.length} memories`);
      return json(200, { status: "success", inserted: rows.length });
    }

    return json(400, { error: 'action must be "bootstrap" or "ingest".' });
  } catch (err) {
    console.error("inoah-ingest error:", err);
    return json(500, { error: err instanceof Error ? err.message : "Unexpected server error." });
  }
});
