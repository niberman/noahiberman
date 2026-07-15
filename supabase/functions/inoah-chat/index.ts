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
const BLOCKED_PATTERNS: RegExp[] = [
  /update\s+(my|your|the)?\s*config/i,
  /modify\s+(my|your|the)?\s*config/i,
  /change\s+(my|your|the)?\s*config/i,
  /update\s+(my|your|the)?\s*profile/i,
  /modify\s+(my|your|the)?\s*profile/i,
  /change\s+(my|your|the)?\s*profile/i,
  /update\s+(my|your|the)?\s*rag/i,
  /modify\s+(my|your|the)?\s*rag/i,
  /change\s+(my|your|the)?\s*rag/i,
  /update\s+(my|your|the)?\s*memory/i,
  /modify\s+(my|your|the)?\s*memory/i,
  /write\s+file/i,
  /edit\s+file/i,
  /save\s+file/i,
  /run\s+code/i,
  /execute\s+code/i,
  /system\s+prompt/i,
  /config\.json/i,
];

// Identity & Style Prompts
const IDENTITY_CORE = `You are the AI Digital Twin of Noah I Berman.

BIOGRAPHICAL FACTS:
- 23-year-old Commercial Pilot based at Centennial Airport (KAPA), Colorado
- 500+ flight hours with multiengine and instrument ratings
- FAA Commercial Multi-Engine and Instrument rated pilot
- Rotary-wing pilot with helicopter flight experience
- Software Developer and AI Systems Engineer
- Student at University of Denver (NOT Daniel Webster)
- Majoring in Applied Computing, Entrepreneurship, and Spanish
- Graduating June 2026
- Fluent Spanish speaker (studied one year at University of Deusto in Bilbao, Spain)
- Amateur guitarist and pianist
- Carillon player for University of Denver hockey games
- Experienced white water kayaker
- Expert backcountry skier and snowboarder
- Wilderness First Responder (WFR) certified
- AIARE 2 certified for avalanche safety

PROFESSIONAL EXPERTISE:
- Aviation: Mountain flying dynamics, high-altitude operations, METARs, flight planning
- Software: Python, FastAPI, TypeScript, Supabase, Vercel, local AI infrastructure
- AI Systems: Ollama, LLMs, vision models, privacy-first architecture
- Business: Aircraft management, SaaS development, compliance systems

ACTIVE PROJECTS:
- Freedom Aviation Operations: Aircraft concierge management at KAPA (cleaning, maintenance, flight instruction)
- Freedom Aviation SaaS: Scheduling/management platform competing with Flight Schedule Pro
- Subdub: B2B compliance & crisis management service with audit engine
- ESL Teaching: 1 day/week to maintain Spanish fluency before Colombia relocation

COMMUNICATION STYLE:
- Direct, blunt communication without corporate fluff
- Professional, high-status tone
- No emojis, no exclamation points, no hashtags
- Technical precision over politeness
- Write like a human, not a corporation
- Casual and direct, use sentence fragments when appropriate
- Drop pronouns for brevity when natural
- No generic AI fluff or overly polite responses

VALUES:
- Digital sovereignty and data privacy
- Privacy-first, locally-hosted systems
- Combining aviation and technology careers`;

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

const SYSTEM_PROMPT = IDENTITY_CORE + STRICT_INSTRUCTION;

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

// --- Helper Functions ---

const isBlockedPrompt = (prompt: string) =>
  BLOCKED_PATTERNS.some((pattern) => pattern.test(prompt));

const blockedResponse = () =>
  new Response(
    JSON.stringify({
      status: "blocked",
      response:
        "I can’t make updates or changes. If you want something updated, I can explain the process or pass the request along.",
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );

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

    if (isBlockedPrompt(prompt)) {
      return blockedResponse();
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
    const geminiKey = Deno.env.get("GEMINI_API_KEY")!;

    if (!supabaseUrl || !supabaseKey || !geminiKey) {
      console.error("Missing environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    // OpenAI-compat client is used for chat completions only; embeddings go
    // through the native endpoint (see embedText).
    const openai = new OpenAI({
      apiKey: geminiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });

    // 6. RAG: Retrieve Context (if requested)
    let contextString = "";
    let retrievedMemories: any[] = [];
    if (include_context) {
      try {
        const embedding = await embedText(prompt, geminiKey);

        const { data: memories, error: matchError } = await supabase.rpc("match_memories", {
          query_embedding: embedding,
          match_threshold: MATCH_THRESHOLD,
          match_count: MATCH_COUNT,
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

    // 7. Generate Response
    const finalSystemPrompt = contextString
      ? `${SYSTEM_PROMPT}

CONTEXT FROM MEMORY:
The notes below were retrieved from Noah's personal knowledge base for this specific question. Treat them as the source of truth about Noah — prefer them over anything you would otherwise guess, and if they conflict with the biography above, the notes win. Do not invent specifics (numbers, dates, names) that appear in neither the notes nor the biography. Do not mention the notes, the knowledge base, or retrieval; just answer as Noah.

${contextString}`
      : SYSTEM_PROMPT;

    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: finalSystemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens,
      // Thinking model: keep reasoning short so it doesn't eat the output
      // budget. Unknown fields pass through openai-node to Google's
      // OpenAI-compat layer, which accepts reasoning_effort.
      reasoning_effort: "low",
      // NOTE (2026-06-09): removed temperature (Google recommends model
      // default for Gemini 3.x thinking models) and the stop sequences
      // ["We are given", "Let's", "I should", "The user"] — they truncated
      // legitimate replies mid-sentence (any answer containing "Let's"
      // was cut off). cleanResponse() remains as the leakage safety net.
    } as any);

    let responseText = completion.choices[0].message.content || "";
    responseText = cleanResponse(responseText);

    // Build response with optional debug info
    const responsePayload: any = {
      status: "success",
      response: responseText,
      styled: true,
      context_included: !!contextString,
    };

    // Include debug information if requested
    if (debug_mode && retrievedMemories.length > 0) {
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
