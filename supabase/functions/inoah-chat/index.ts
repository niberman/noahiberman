import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import OpenAI from "https://esm.sh/openai@4.24.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// --- Configuration ---

// Model lineup (updated 2026-06-09):
// - text-embedding-004 was shut down by Google on 2026-01-14; every embedding
//   call has failed (silently) since. gemini-embedding-2 is the current model.
// - gemini-2.0-flash passed its earliest-shutdown date (2026-06-01);
//   gemini-3.5-flash is its documented replacement.
const CHAT_MODEL = "gemini-3.5-flash";
// OpenRouter is the chat provider: OPENROUTER_API_KEY is what iNoah bills model
// spend to. GEMINI_API_KEY is only a fallback for chat (and stays mandatory for
// embeddings, below), so either key on its own is enough to answer a question.
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
// Tuned for gemini-embedding-2's cosine-similarity distribution (measured
// 2026-06-09): relevant memories score 0.65-0.78, unrelated ones 0.50-0.56.
// 0.60 sits in the separation band; 0.5 let junk context through.
const MATCH_THRESHOLD = 0.6;
const MATCH_COUNT = 5;
// gemini-3.5-flash is a thinking model: reasoning tokens draw from the same
// output budget, so give answers more headroom than the old 500 default.
const DEFAULT_MAX_TOKENS = 1024;
const MAX_TOKENS_CAP = 2048;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30; // Increased for development testing
// No prompt blocklist: the tier boundary is enforced in SQL by match_memories_public.

// The real public persona lives in inoah_settings.system_prompt, built from
// docs/public-profile.md and editable from the dashboard. This fallback only
// exists so a missing settings row degrades to caution instead of a crash.
const FALLBACK_PROMPT = `You are iNoah, the AI twin of Noah Berman on noahiberman.com. The live persona could not be loaded. Answer only from retrieved context, say plainly when you do not know something, and never guess about Noah's ventures, credentials, numbers, or personal records.`;

const STRICT_INSTRUCTION = `

CRITICAL DIRECTIVE - ABSOLUTE REQUIREMENT:
You MUST NOT output ANY internal reasoning, thinking process, chain-of-thought, planning, deliberation, or meta-commentary.
You MUST NOT show how you arrived at your answer.
You MUST NOT explain your thought process.
You MUST NOT include phrases like "We are given", "Let's", "I should", "The user", "Response structure", "Example response".
You MUST NOT analyze the question before answering.
OUTPUT THE FINAL ANSWER ONLY. NO PREAMBLE. NO PROCESS. NO ANALYSIS OF THE QUESTION.
Respond as Noah directly and immediately. Do not think out loud. Do not plan. Do not deliberate in your output.
VIOLATION OF THIS DIRECTIVE IS COMPLETELY UNACCEPTABLE AND WILL BE REJECTED.`;

// MATCH_* above are fallbacks only. The live values come from the
// `inoah_settings` row so they can be edited from the dashboard without a
// redeploy.

// --- Embeddings ---

// Native Gemini endpoint rather than the OpenAI-compat one: output_dimensionality
// is needed to fit the 768-dim column, and gemini-embedding-2 auto-normalizes
// truncated outputs so cosine similarity in match_memories stays valid.
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

// --- Calendar ---

// Reuses the same FastAPI endpoints the booking page calls, so availability
// comes from the one place that already merges the availability profile with
// Google Calendar busy time. Note the apex domain 308-redirects to www.
const SCHEDULING_API = "https://www.noahiberman.com";
const SCHEDULING_TZ = "America/Denver";
const CALENDAR_DAYS = 10;
const CALENDAR_MAX_SLOTS = 8;
const CALENDAR_SLOTS_PER_DAY = 2; // spread across days, not 8 in one morning
const CALENDAR_TIMEOUT_MS = 6000;

/** Only spend the round-trip when the question is actually about meeting. */
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

/**
 * Real bookable availability, rendered for the model. Returns "" on any
 * failure so a scheduling outage degrades to iNoah simply not quoting times,
 * rather than breaking the whole answer.
 */
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
      // Sample across days rather than taking the first N: a full open day
      // yields 8 consecutive morning slots, so "are you free next week?"
      // would only ever surface today.
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
        return `- ${t.name} (${t.duration_min} min, ${t.location_type}) — nothing open in the next ${CALENDAR_DAYS} days. Book: ${url}`;
      }
      return `- ${t.name} (${t.duration_min} min, ${t.location_type}) — next openings: ${shown.join("; ")}. Book: ${url}`;
    }),
  );

  return `CURRENT AVAILABILITY (live from Noah's calendar, times in Mountain Time, generated ${fmtSlot(new Date().toISOString())}):
${blocks.join("\n")}

Use these when asked about meeting, scheduling or availability: quote only times listed above, say they are Mountain Time, and point to the booking link so the guest confirms it themselves. Never invent times, and never claim to have booked anything — you cannot book on someone's behalf.`;
}

// --- Helper Functions ---

function cleanResponse(text: string): string {
  // Aggressive stripping of reasoning blocks if they leak through
  let cleaned = text;

  // Strip XML-style thinking tags
  cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");
  cleaned = cleaned.replace(/\[reasoning\][\s\S]*?\[\/reasoning\]/gi, "");

  // Strip common reasoning prefixes and meta-commentary.
  // NOTE (2026-07-14): "Let's", "I should", and bare "We" removed from the
  // strip lists — they open legitimate in-character replies, and the stop
  // sequences that motivated them were already dropped on 2026-06-09. Only
  // unambiguous meta phrases remain.
  cleaned = cleaned.replace(/^(We are given|The user|Response structure|Example response)[^]*?(?=\n\n|\n[A-Z])/gim, "");

  // Strip "Answer:" prefix
  cleaned = cleaned.replace(/^\*\*Answer:\*\*\s*/i, "");
  cleaned = cleaned.replace(/^Answer:\s*/i, "");

  // If response starts with quoted analysis, try to extract the actual response
  // Look for patterns like multiple paragraphs of analysis followed by actual content
  const lines = cleaned.split('\n');
  let foundContentStart = false;
  let contentStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip lines that look like meta-commentary
    if (line.match(/^(We are given|The user|Response structure|Example response|My identity)/i)) {
      continue;
    }
    // If we find a line that doesn't look like analysis, that's probably the real content
    if (line.length > 0 && !foundContentStart) {
      contentStartIndex = i;
      foundContentStart = true;
      break;
    }
  }

  if (foundContentStart && contentStartIndex > 0) {
    cleaned = lines.slice(contentStartIndex).join('\n');
  }

  return cleaned.trim();
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

// --- Turnstile Verification ---

const verifyTurnstile = async (token: string, ip: string) => {
  const secret = Deno.env.get("TURNSTILE_SECRET");
  if (!secret) {
    return true; // If no secret set, skip verification (dev mode)
  }

  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip,
  });

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await response.json().catch(() => null);
  return data?.success === true;
};

// --- Main Handler ---

serve(async (req) => {
  // 1. Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // 2. Rate Limiting
  const ip = getClientIp(req);
  const rateStatus = checkRateLimit(ip);

  if (!rateStatus.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again shortly." }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": rateStatus.remaining.toString(),
          "X-RateLimit-Reset": rateStatus.resetAt.toString(),
        },
      }
    );
  }

  try {
    // 3. Parse Request
    const payload = await req.json();
    const prompt = typeof payload?.prompt === "string" ? payload.prompt.trim() : "";
    const include_context = payload?.include_context ?? true;
    const apply_style = payload?.apply_style ?? true; // ignored, always applied now
    const max_tokens = Math.min(Number(payload?.max_tokens) || DEFAULT_MAX_TOKENS, MAX_TOKENS_CAP);
    const turnstileToken = payload?.turnstileToken;
    const debug_mode = payload?.debug_mode ?? false; // Enable debug info in response

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

    // 4. Verify Turnstile
    if (turnstileToken && !(await verifyTurnstile(turnstileToken, ip))) {
      return new Response(JSON.stringify({ error: "Turnstile verification failed." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Initialize Clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // Use service role for vector search
    // Chat completions bill to OpenRouter; Gemini direct is the fallback and
    // still owns embeddings. Requiring GEMINI_API_KEY unconditionally used to
    // 500 the whole function on an OpenRouter-only deployment, so the guard now
    // only insists that at least one model key is present.
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseKey || (!openrouterKey && !geminiKey)) {
      console.error("Missing environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // debug_mode is owner-only. Everyone else gets the same 200 with no debug
    // key, never a 401, so the flag is not an oracle for what the corpus holds.
    let debugAllowed = false;
    if (debug_mode) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      const authHeader = req.headers.get("Authorization");
      if (anonKey && authHeader && authHeader !== `Bearer ${anonKey}`) {
        const asCaller = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await asCaller.auth.getUser();
        if (user) {
          const { data: owner } = await asCaller.rpc("is_owner");
          debugAllowed = owner === true;
        }
      }
    }

    // Chat completions go through OpenRouter so model spend lands on one bill;
    // embeddings always stay on Google (see EMBEDDING_MODEL). Falls back to
    // Gemini direct only if OPENROUTER_API_KEY is absent.
    const useOpenRouter = !!openrouterKey;
    let chatModel = useOpenRouter ? OPENROUTER_CHAT_MODEL : CHAT_MODEL;
    const openai = new OpenAI({
      apiKey: useOpenRouter ? openrouterKey : geminiKey,
      baseURL: useOpenRouter ? OPENROUTER_BASE_URL : GEMINI_BASE_URL,
      // OpenRouter attributes usage to the app in its dashboard.
      defaultHeaders: useOpenRouter
        ? { "HTTP-Referer": "https://noahiberman.com", "X-Title": "iNoah" }
        : undefined,
    });

    // 5b. Dashboard-editable persona and retrieval knobs. Falls back to the
    // compiled-in defaults if the row is missing so chat never hard-fails.
    const { data: settings } = await supabase
      .from("inoah_settings")
      .select("system_prompt, match_threshold, match_count")
      .maybeSingle();

    const identity = settings?.system_prompt?.trim() || FALLBACK_PROMPT;
    const matchThreshold = settings?.match_threshold ?? MATCH_THRESHOLD;
    const matchCount = settings?.match_count ?? MATCH_COUNT;
    // The strict directive is machine behaviour, not persona, so it is always
    // appended and stays out of the editable prompt.
    const SYSTEM_PROMPT = identity + STRICT_INSTRUCTION;

    // 6. RAG: Retrieve Context (if requested)
    let contextString = "";
    let retrievedMemories: any[] = [];
    if (include_context && !geminiKey) {
      // OpenRouter has no embeddings endpoint, and anything embedded with a
      // different model or width is incomparable to the stored vectors. Without
      // the Gemini key the honest degradation is answering with no retrieved
      // context, not retrieving garbage.
      console.warn("GEMINI_API_KEY not set - answering without retrieved context");
    }
    if (include_context && geminiKey) {
      try {
        const embedding = await embedText(prompt, geminiKey);

        const { data: memories, error: matchError } = await supabase.rpc("match_memories_public", {
          query_embedding: embedding,
          match_threshold: matchThreshold,
          match_count: matchCount,
        });

        if (!matchError && memories && memories.length > 0) {
          retrievedMemories = memories;
          contextString = memories
            .map((m: any, i: number) => `[${i + 1}] ${m.content}`)
            .join("\n\n");

          // Server-side logging for debugging
          console.log("RAG Context Retrieved:", {
            prompt,
            matchCount: memories.length,
            memories: memories.map((m: any) => ({
              id: m.id,
              content: m.content?.substring(0, 100) + "...",
              similarity: m.similarity,
              metadata: m.metadata,
            })),
          });
        } else if (matchError) {
          console.error("RAG Match Error:", matchError);
        } else {
          console.log("No memories matched for prompt:", prompt);
        }
      } catch (e) {
        console.error("RAG Error:", e);
        // Continue without context if RAG fails
      }
    }

    // 6b. Live calendar, only when the question is about meeting — otherwise
    // every unrelated question would pay two extra HTTP round-trips.
    let calendarContext = "";
    if (CALENDAR_INTENT.test(prompt)) {
      calendarContext = await fetchCalendarContext();
    }

    // 7. Generate Response
    let finalSystemPrompt = contextString
      ? `${SYSTEM_PROMPT}

CONTEXT FROM MEMORY:
The notes below were retrieved from Noah's personal knowledge base for this specific question. Treat them as the source of truth about Noah — prefer them over anything you would otherwise guess, and if they conflict with the biography above, the notes win. Do not invent specifics (numbers, dates, names) that appear in neither the notes nor the biography. Do not mention the notes, the knowledge base, or retrieval; just answer as Noah.

${contextString}`
      : SYSTEM_PROMPT;

    if (calendarContext) {
      finalSystemPrompt += `\n\n${calendarContext}`;
    }

    const messages = [
      { role: "system", content: finalSystemPrompt },
      { role: "user", content: prompt },
    ];
    // Thinking model: keep reasoning short so it doesn't eat the output budget.
    // The two providers spell this differently — Google's OpenAI-compat layer
    // takes OpenAI's `reasoning_effort`, OpenRouter takes a `reasoning` object.
    // Sending the wrong one is a 400.
    // NOTE (2026-06-09): removed temperature (Google recommends model default
    // for Gemini 3.x thinking models) and the stop sequences ["We are given",
    // "Let's", "I should", "The user"] — they truncated legitimate replies
    // mid-sentence. cleanResponse() remains as the leakage safety net.
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
      // Nothing to fall back to when OpenRouter is the only configured
      // provider: rethrow so the real OpenRouter error surfaces instead of a
      // second failure from a client built with an undefined key.
      if (!useOpenRouter || !geminiKey) throw err;
      // Don't let a bad key, an unavailable model or a rejected parameter on
      // OpenRouter take the public chat down — fall back to Gemini direct.
      console.error("OpenRouter chat failed, falling back to Gemini:", err);
      const fallback = new OpenAI({ apiKey: geminiKey, baseURL: GEMINI_BASE_URL });
      chatModel = CHAT_MODEL;
      completion = await fallback.chat.completions.create({
        model: CHAT_MODEL,
        messages,
        max_tokens,
        ...geminiReasoning,
      } as any);
      provider = "gemini-fallback";
    }

    // Logged so the configured route can be confirmed from the function logs
    // without having to read `provider` out of a live response body.
    console.log(`iNoah chat completed via ${provider} (${chatModel})`);

    let responseText = completion.choices[0].message.content || "";
    responseText = cleanResponse(responseText);

    // Build response with optional debug info
    const responsePayload: any = {
      status: "success",
      response: responseText,
      styled: true,
      context_included: !!contextString,
      calendar_included: !!calendarContext,
      provider,
    };

    // Include debug information only for the verified owner
    if (debugAllowed && retrievedMemories.length > 0) {
      responsePayload.debug = {
        context_sources: retrievedMemories.map((m: any) => ({
          id: m.id,
          content: m.content,
          similarity: m.similarity,
          metadata: m.metadata,
          created_at: m.created_at,
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
