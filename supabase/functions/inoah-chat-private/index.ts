// Private twin: answers only the verified owner, retrieves from the whole
// corpus via match_memories_private. The public twin lives in inoah-chat and
// can only ever see rows marked public; that boundary is enforced in SQL.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import OpenAI from "https://esm.sh/openai@4.24.1";

// Owner-only endpoint, so CORS is the site origin, not *.
const ALLOWED_ORIGINS = new Set([
  "https://www.noahiberman.com",
  "https://noahiberman.com",
]);
const corsHeadersFor = (origin: string | null) => ({
  "Access-Control-Allow-Origin":
    origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://www.noahiberman.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

// --- Configuration ---

// Model lineup (updated 2026-06-09):
// - text-embedding-004 was shut down by Google on 2026-01-14; every embedding
//   call has failed (silently) since. gemini-embedding-2 is the current model.
// - gemini-2.0-flash passed its earliest-shutdown date (2026-06-01);
//   gemini-3.5-flash is its documented replacement.
const CHAT_MODEL = "gemini-3.5-flash";
// Model spend routes through OpenRouter when OPENROUTER_API_KEY is set, falling
// back to Gemini direct so chat never hard-fails on a missing secret.
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_CHAT_MODEL = "google/gemini-3.5-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";

// Embeddings deliberately stay on Google's native endpoint even when chat is on
// OpenRouter. The stored vectors in public.memories were produced by
// gemini-embedding-2 truncated to 768 dims via output_dimensionality; embedding
// a query with any other model or width makes it incomparable to them and
// retrieval silently returns nothing. Chat is where the spend is anyway.
const EMBEDDING_MODEL = "gemini-embedding-2";
const EMBEDDING_DIMS = 768; // must match public.memories.embedding vector(768)
const MATCH_THRESHOLD = 0.6;
const MATCH_COUNT = 5;
const DEFAULT_MAX_TOKENS = 1024;
const MAX_TOKENS_CAP = 2048;

const RATE_LIMIT_WINDOW_MS = 60_000;
// Owner-only endpoint behind a JWT, so the limit is generous.
const RATE_LIMIT_MAX = 120;

const IDENTITY_CORE = `You are the AI Digital Twin of Noah I Berman, answering Noah himself in a private session.`;

const STRICT_INSTRUCTION = `

CRITICAL DIRECTIVE - ABSOLUTE REQUIREMENT:
You MUST NOT output ANY internal reasoning, thinking process, chain-of-thought, planning, deliberation, or meta-commentary.
OUTPUT THE FINAL ANSWER ONLY. NO PREAMBLE. NO PROCESS. NO ANALYSIS OF THE QUESTION.`;

// --- Embeddings ---

// Must stay identical to embedText in inoah-chat and inoah-embed: an entry
// embedded with a different model or width is stored fine but never retrieved.
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

// --- Calendar (same sources as the public twin) ---

const SCHEDULING_API = "https://www.noahiberman.com";
const SCHEDULING_TZ = "America/Denver";
const CALENDAR_DAYS = 10;
const CALENDAR_MAX_SLOTS = 8;
const CALENDAR_SLOTS_PER_DAY = 2;
const CALENDAR_TIMEOUT_MS = 6000;

const CALENDAR_INTENT =
  /\b(schedul\w*|meet\w*|book\w*|booking|appointment|avail\w*|calendar|free|busy|when can|what time|time slot|slot|call|coffee|chat with you|catch up)\b/i;

interface MeetingType {
  slug: string;
  name: string;
  duration_min: number;
  location_type: string;
  description?: string;
}

const fmtSlot = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    timeZone: SCHEDULING_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

async function getJson(path: string): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALENDAR_TIMEOUT_MS);
  try {
    const res = await fetch(`${SCHEDULING_API}${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.error(`Calendar fetch ${path} -> ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error(`Calendar fetch ${path} failed:`, e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCalendarContext(): Promise<string> {
  const typesPayload = await getJson("/scheduling/meeting-types");
  const types: MeetingType[] = typesPayload?.meeting_types ?? [];
  if (types.length === 0) return "";

  const today = new Date().toLocaleDateString("en-CA", { timeZone: SCHEDULING_TZ });
  const blocks = await Promise.all(
    types.map(async (t) => {
      const data = await getJson(
        `/scheduling/slots/${encodeURIComponent(t.slug)}?start_date=${today}&days=${CALENDAR_DAYS}`,
      );
      const slots: { start: string }[] = data?.slots ?? [];
      const perDay = new Map<string, string[]>();
      for (const s of slots) {
        const day = new Date(s.start).toLocaleDateString("en-CA", { timeZone: SCHEDULING_TZ });
        const bucket = perDay.get(day) ?? [];
        if (bucket.length < CALENDAR_SLOTS_PER_DAY) bucket.push(s.start);
        perDay.set(day, bucket);
      }
      const shown = [...perDay.values()]
        .flat()
        .slice(0, CALENDAR_MAX_SLOTS)
        .map(fmtSlot);
      const url = `${SCHEDULING_API}/book/${t.slug}`;
      if (shown.length === 0) {
        return `- ${t.name} (${t.duration_min} min, ${t.location_type}): nothing open in the next ${CALENDAR_DAYS} days. Book: ${url}`;
      }
      return `- ${t.name} (${t.duration_min} min, ${t.location_type}): next openings ${shown.join("; ")}. Book: ${url}`;
    }),
  );

  return `CURRENT AVAILABILITY (live from the calendar, times in Mountain Time, generated ${fmtSlot(new Date().toISOString())}):
${blocks.join("\n")}`;
}

// --- Rate Limiting ---

type RateBucket = {
  count: number;
  resetAt: number;
};

const rateBuckets = new Map<string, RateBucket>();

const getClientIp = (req: Request) =>
  req.headers.get("cf-connecting-ip") ||
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  "unknown";

const checkRateLimit = (ip: string) => {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);

  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  if (bucket.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  rateBuckets.set(ip, bucket);
  return { allowed: true, remaining: RATE_LIMIT_MAX - bucket.count, resetAt: bucket.resetAt };
};

// --- Main Handler ---

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const ip = getClientIp(req);
  const rateStatus = checkRateLimit(ip);

  if (!rateStatus.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again shortly." }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY")!;

    if (!supabaseUrl || !supabaseKey || !anonKey || !geminiKey) {
      console.error("Missing environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Owner gate. verify_jwt already rejected anonymous callers; this rejects
    // any signed-in user who is not in app_owners.
    const authHeader = req.headers.get("Authorization") ?? "";
    const asCaller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await asCaller.auth.getUser();
    let isOwner = false;
    if (user) {
      const { data: owner } = await asCaller.rpc("is_owner");
      isOwner = owner === true;
    }
    if (!isOwner) {
      return new Response(JSON.stringify({ error: "Not authorized." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const prompt = typeof payload?.prompt === "string" ? payload.prompt.trim() : "";
    const include_context = payload?.include_context ?? true;
    const max_tokens = Math.min(Number(payload?.max_tokens) || DEFAULT_MAX_TOKENS, MAX_TOKENS_CAP);
    const debug_mode = payload?.debug_mode ?? false;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (prompt.length > 2000) {
      return new Response(JSON.stringify({ error: "Prompt is too long." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const useOpenRouter = !!openrouterKey;
    const chatModel = useOpenRouter ? OPENROUTER_CHAT_MODEL : CHAT_MODEL;
    const openai = new OpenAI({
      apiKey: useOpenRouter ? openrouterKey : geminiKey,
      baseURL: useOpenRouter ? OPENROUTER_BASE_URL : GEMINI_BASE_URL,
      defaultHeaders: useOpenRouter
        ? { "HTTP-Referer": "https://noahiberman.com", "X-Title": "iNoah private" }
        : undefined,
    });

    // Same dashboard-editable persona and retrieval knobs as the public twin.
    const { data: settings } = await supabase
      .from("inoah_settings")
      .select("system_prompt, match_threshold, match_count")
      .maybeSingle();

    const identity = settings?.system_prompt?.trim() || IDENTITY_CORE;
    const matchThreshold = settings?.match_threshold ?? MATCH_THRESHOLD;
    const matchCount = settings?.match_count ?? MATCH_COUNT;
    const SYSTEM_PROMPT = identity + STRICT_INSTRUCTION;

    let contextString = "";
    let retrievedMemories: any[] = [];
    if (include_context) {
      try {
        const embedding = await embedText(prompt, geminiKey);

        const { data: memories, error: matchError } = await supabase.rpc("match_memories_private", {
          query_embedding: embedding,
          match_threshold: matchThreshold,
          match_count: matchCount,
        });

        if (!matchError && memories && memories.length > 0) {
          retrievedMemories = memories;
          contextString = memories
            .map((m: any, i: number) => `[${i + 1}] ${m.content}`)
            .join("\n\n");
        } else if (matchError) {
          console.error("RAG Match Error:", matchError);
        }
      } catch (e) {
        console.error("RAG Error:", e);
        // Continue without context if RAG fails
      }
    }

    let calendarContext = "";
    if (CALENDAR_INTENT.test(prompt)) {
      calendarContext = await fetchCalendarContext();
    }

    let finalSystemPrompt = contextString
      ? `${SYSTEM_PROMPT}

CONTEXT FROM MEMORY:
The notes below were retrieved from Noah's personal knowledge base for this specific question. Treat them as the source of truth and prefer them over anything you would otherwise guess. Do not invent specifics that appear in neither the notes nor the biography.

${contextString}`
      : SYSTEM_PROMPT;

    if (calendarContext) {
      finalSystemPrompt += `\n\n${calendarContext}`;
    }

    const messages = [
      { role: "system", content: finalSystemPrompt },
      { role: "user", content: prompt },
    ];
    const geminiReasoning = { reasoning_effort: "low" };
    const openrouterReasoning = { reasoning: { effort: "low" } };

    let provider = useOpenRouter ? "openrouter" : "gemini";
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: chatModel,
        messages,
        max_tokens,
        ...(useOpenRouter ? openrouterReasoning : geminiReasoning),
      } as any);
    } catch (err) {
      if (!useOpenRouter) throw err;
      console.error("OpenRouter chat failed, falling back to Gemini:", err);
      const fallback = new OpenAI({ apiKey: geminiKey, baseURL: GEMINI_BASE_URL });
      completion = await fallback.chat.completions.create({
        model: CHAT_MODEL,
        messages,
        max_tokens,
        ...geminiReasoning,
      } as any);
      provider = "gemini-fallback";
    }

    const responseText = completion.choices[0].message.content || "";

    const responsePayload: any = {
      status: "success",
      response: responseText,
      context_included: !!contextString,
      calendar_included: !!calendarContext,
      provider,
    };

    // The caller is the verified owner, so debug is available on request.
    if (debug_mode && retrievedMemories.length > 0) {
      responsePayload.debug = {
        context_sources: retrievedMemories.map((m: any) => ({
          id: m.id,
          content: m.content,
          similarity: m.similarity,
          metadata: m.metadata,
        })),
        context_count: retrievedMemories.length,
        raw_context: contextString,
      };
    }

    return new Response(
      JSON.stringify(responsePayload),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": rateStatus.remaining.toString(),
          "X-RateLimit-Reset": rateStatus.resetAt.toString(),
        },
      }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    console.error("Edge Function Error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
