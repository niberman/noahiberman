// iNoah: the one assistant, public-facing. It answers anonymous visitors and
// retrieves only rows marked public, via match_memories_public. The tier
// boundary is enforced in that RPC's SQL body, not here.
//
// Two response shapes: the original JSON body, and an SSE stream when the
// request carries `stream: true`. The stream opens with a `meta` event
// (answer or decline, retrieval confidence), carries `data: {"t": ...}`
// text deltas, and closes with a `done` event holding the cleaned full text.
//
// Decline is decided here, not by the model: when retrieval clears nothing
// above the match threshold, iNoah says it does not have that on file and
// offers the two nearest questions the public corpus can answer. The model
// is never asked to answer a question the corpus does not cover.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { PUBLIC_CORS_HEADERS, errorMessage, errorResponse, jsonResponse, preflightResponse } from "../_shared/http.ts";
import { callerClient, isCallerOwner, serviceClient } from "../_shared/supabase.ts";
import { embedText } from "../_shared/embeddings.ts";
import { createRateLimiter, getClientIp, rateLimitHeaders } from "../_shared/rate_limit.ts";
import { CALENDAR_INTENT, fetchCalendarContext } from "../_shared/calendar.ts";
import {
  buildSystemPrompt,
  ChatResponsePayload,
  createChatCompletion,
  loadRetrievalSettings,
  MAX_PROMPT_LENGTH,
  MatchedMemory,
  parseChatRequest,
  retrieveContext,
  streamChatCompletion,
} from "../_shared/inoah_chat.ts";

const corsHeaders = PUBLIC_CORS_HEADERS;

const RATE_LIMIT_MAX = 30;
const checkRateLimit = createRateLimiter(RATE_LIMIT_MAX);
// No prompt blocklist: the tier boundary is enforced in SQL by match_memories_public.

// The real public persona lives in inoah_settings.system_prompt, built from
// the AI Context files and editable from the dashboard. This fallback only
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

const CONTEXT_PREAMBLE = `The notes below were retrieved from Noah's personal knowledge base for this specific question. Treat them as the source of truth about Noah. Prefer them over anything you would otherwise guess, and if they conflict with the biography above, the notes win. Do not invent specifics (numbers, dates, names) that appear in neither the notes nor the biography. Some notes end with an HTML comment naming their source file, that comment is provenance metadata, never quote or mention it. Do not mention the notes, the knowledge base, or retrieval; just answer as Noah.`;

// Deterministic reply for a question the public corpus does not cover. The
// model is not called, so nothing can be invented. The client renders the
// accompanying suggestions as chips.
const DECLINE_TEXT = `I do not have that on file. I answer from Noah's public notes and I will not guess. Here are two things I can answer, or you can email me at noah@noahiberman.com.`;

// Bare greetings would otherwise fall through to the decline path, and
// answering "hi" with "I do not have that on file" reads as broken. The list
// is deliberately tiny; anything more than a greeting goes through retrieval.
const GREETING_RE = /^(hi|hey|hello|hola|yo|good (morning|afternoon|evening)|thanks|thank you|gracias)[\s.,?]*$/i;
const GREETING_TEXT = `Hey. Ask me about the flying, the ventures, the education, or how to reach Noah. If I do not have something on file I will say so.`;

// --- Helper Functions ---

function cleanResponse(text: string): string {
  // Aggressive stripping of reasoning blocks if they leak through
  let cleaned = text;

  // Strip XML-style thinking tags
  cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");
  cleaned = cleaned.replace(/\[reasoning\][\s\S]*?\[\/reasoning\]/gi, "");

  // Strip common reasoning prefixes and meta-commentary.
  // NOTE (2026-07-14): "Let's", "I should", and bare "We" removed from the
  // strip lists, since they open legitimate in-character replies, and the stop
  // sequences that motivated them were already dropped on 2026-06-09. Only
  // unambiguous meta phrases remain.
  cleaned = cleaned.replace(/^(We are given|The user|Response structure|Example response)[^]*?(?=\n\n|\n[A-Z])/gim, "");

  // Strip "Answer:" prefix
  cleaned = cleaned.replace(/^\*\*Answer:\*\*\s*/i, "");
  cleaned = cleaned.replace(/^Answer:\s*/i, "");

  // If response starts with quoted analysis, try to extract the actual response
  const lines = cleaned.split('\n');
  let foundContentStart = false;
  let contentStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.match(/^(We are given|The user|Response structure|Example response|My identity)/i)) {
      continue;
    }
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

/**
 * The two public corpus questions nearest to the visitor's prompt, for the
 * decline reply. Reuses the prompt embedding with the threshold floored, so
 * "nearest" is real similarity rather than a random draw, and a stranger's
 * next click lands on something the corpus actually holds.
 */
async function nearestAnswerableQuestions(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  embedding: number[],
): Promise<string[]> {
  const { data } = await supabase.rpc("match_memories_public", {
    query_embedding: embedding,
    match_threshold: -1,
    match_count: 12,
  });
  const questions: string[] = [];
  for (const m of (data ?? []) as MatchedMemory[]) {
    const first = (m.content ?? "").split("\n", 1)[0];
    const q = first.match(/^#{1,6}[ \t]+(.+\?)[ \t]*$/)?.[1];
    if (q && !questions.includes(q)) questions.push(q);
    if (questions.length === 2) break;
  }
  return questions;
}

interface SseSender {
  meta: (data: Record<string, unknown>) => void;
  delta: (text: string) => void;
  done: (data: Record<string, unknown>) => void;
  error: (message: string) => void;
  close: () => void;
}

/** SSE response wired to a callback; the callback writes, the stream flushes. */
function sseResponse(
  extraHeaders: Record<string, string>,
  run: (send: SseSender) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let open = true;
      const write = (event: string | null, data: unknown) => {
        if (!open) return;
        const payload = `${event ? `event: ${event}\n` : ""}data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };
      const send: SseSender = {
        meta: (data) => write("meta", data),
        delta: (text) => write(null, { t: text }),
        done: (data) => write("done", data),
        error: (message) => write("error", { error: message }),
        close: () => {
          if (!open) return;
          open = false;
          controller.close();
        },
      };
      run(send)
        .catch((err) => {
          console.error("inoah-chat stream error:", err);
          send.error(errorMessage(err));
        })
        .finally(() => send.close());
    },
  });
  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      ...extraHeaders,
    },
  });
}

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
    return preflightResponse(corsHeaders);
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // 2. Rate Limiting
  const ip = getClientIp(req);
  const rateStatus = checkRateLimit(ip);

  if (!rateStatus.allowed) {
    return errorResponse(
      "Too many requests. Please try again shortly.",
      429,
      corsHeaders,
      rateLimitHeaders(rateStatus),
    );
  }

  try {
    // 3. Parse Request
    const { prompt, include_context, max_tokens, debug_mode, stream, turnstileToken } =
      parseChatRequest(await req.json());

    if (!prompt) {
      return errorResponse("Prompt is required.", 400, corsHeaders);
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return errorResponse("Prompt is too long.", 400, corsHeaders);
    }

    // 4. Verify Turnstile
    if (turnstileToken && !(await verifyTurnstile(turnstileToken, ip))) {
      return errorResponse("Turnstile verification failed.", 401, corsHeaders);
    }

    // 5. Initialize Clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // Use service role for vector search
    // Chat is OpenRouter-only, so its key is required. EMBEDDING_API_KEY is
    // separate and optional: OpenRouter has no embeddings endpoint, and every
    // vector in `memories` came from gemini-embedding-2, so retrieval still
    // calls Google directly. Without it the twins answer without context
    // rather than retrieving vectors that are incomparable to the stored ones.
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const embeddingKey = Deno.env.get("EMBEDDING_API_KEY") ?? Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseKey || !openrouterKey) {
      console.error("Missing environment variables");
      return errorResponse("Server configuration error.", 500, corsHeaders);
    }

    const supabase = serviceClient(supabaseUrl, supabaseKey);

    // debug_mode is owner-only. Everyone else gets the same 200 with no debug
    // key, never a 401, so the flag is not an oracle for what the corpus holds.
    let debugAllowed = false;
    if (debug_mode) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      const authHeader = req.headers.get("Authorization");
      if (anonKey && authHeader && authHeader !== `Bearer ${anonKey}`) {
        debugAllowed = await isCallerOwner(callerClient(supabaseUrl, anonKey, authHeader));
      }
    }

    const rateHeaders = rateLimitHeaders(rateStatus);

    // 5a. Bare greeting: canned, instant, never the decline text.
    if (GREETING_RE.test(prompt)) {
      if (stream) {
        return sseResponse(rateHeaders, async (send) => {
          send.meta({ type: "answer", confidence: 1, context_included: false });
          send.delta(GREETING_TEXT);
          send.done({ response: GREETING_TEXT, provider: "canned" });
        });
      }
      return jsonResponse(
        {
          status: "success",
          response: GREETING_TEXT,
          styled: true,
          context_included: false,
          calendar_included: false,
          provider: "canned",
        } satisfies ChatResponsePayload,
        200,
        corsHeaders,
        rateHeaders,
      );
    }

    // 5b. Dashboard-editable persona and retrieval knobs.
    const { identity, matchThreshold, matchCount } = await loadRetrievalSettings(
      supabase,
      FALLBACK_PROMPT,
    );
    // The strict directive is machine behaviour, not persona, so it is always
    // appended and stays out of the editable prompt.
    const SYSTEM_PROMPT = identity + STRICT_INSTRUCTION;

    // 6. RAG: Retrieve Context (if requested)
    let contextString = "";
    let retrievedMemories: MatchedMemory[] = [];
    let promptEmbedding: number[] | null = null;
    let retrievalRan = false;
    if (include_context && !embeddingKey) {
      console.warn("EMBEDDING_API_KEY not set - answering without retrieved context");
    }
    if (include_context && embeddingKey) {
      try {
        promptEmbedding = await embedText(prompt, embeddingKey);
        const retrieved = await retrieveContext(
          supabase,
          "match_memories_public",
          promptEmbedding,
          matchThreshold,
          matchCount,
          prompt,
        );
        contextString = retrieved.contextString;
        retrievedMemories = retrieved.memories;
        retrievalRan = true;
      } catch (e) {
        console.error("RAG Error:", e);
        // Continue without context if RAG fails
      }
    }

    const confidence = retrievedMemories[0]?.similarity ?? 0;

    // 6a. Decline: retrieval ran and cleared nothing. The corpus does not
    // cover this, so the model is not consulted and nothing can be invented.
    if (retrievalRan && retrievedMemories.length === 0 && promptEmbedding) {
      const suggestions = await nearestAnswerableQuestions(supabase, promptEmbedding);
      console.log("Declined (below threshold):", { prompt, suggestions });
      if (stream) {
        return sseResponse(rateHeaders, async (send) => {
          send.meta({ type: "decline", confidence, suggestions, context_included: false });
          send.delta(DECLINE_TEXT);
          send.done({ response: DECLINE_TEXT, provider: "canned", declined: true, suggestions });
        });
      }
      return jsonResponse(
        {
          status: "success",
          response: DECLINE_TEXT,
          styled: true,
          context_included: false,
          calendar_included: false,
          provider: "canned",
          declined: true,
          suggestions,
          confidence,
        },
        200,
        corsHeaders,
        rateHeaders,
      );
    }

    // 6b. Live calendar, only when the question is about meeting; otherwise
    // every unrelated question would pay two extra HTTP round-trips.
    let calendarContext = "";
    if (CALENDAR_INTENT.test(prompt)) {
      calendarContext = await fetchCalendarContext({
        calendarLabel: "Noah's calendar",
        includeUsageGuidance: true,
      });
    }

    const messages = [
      {
        role: "system",
        content: buildSystemPrompt({
          systemPrompt: SYSTEM_PROMPT,
          contextPreamble: CONTEXT_PREAMBLE,
          contextString,
          calendarContext,
        }),
      },
      { role: "user", content: prompt },
    ];

    // 7a. Streaming response: meta first so the client knows the mode before
    // the first token, then deltas, then the cleaned full text.
    if (stream) {
      return sseResponse(rateHeaders, async (send) => {
        send.meta({
          type: "answer",
          confidence,
          context_included: !!contextString,
          calendar_included: !!calendarContext,
        });
        let full = "";
        for await (const delta of streamChatCompletion({
          openrouterKey,
          appTitle: "iNoah",
          messages,
          maxTokens: max_tokens,
        })) {
          full += delta;
          send.delta(delta);
        }
        send.done({ response: cleanResponse(full), provider: "openrouter" });
      });
    }

    // 7b. Buffered response (original shape).
    const { text, provider } = await createChatCompletion({
      openrouterKey,
      appTitle: "iNoah",
      messages,
      maxTokens: max_tokens,
    });

    // Build response with optional debug info
    const responsePayload: ChatResponsePayload = {
      status: "success",
      response: cleanResponse(text),
      styled: true,
      context_included: !!contextString,
      calendar_included: !!calendarContext,
      provider,
    };

    // Include debug information only for the verified owner
    if (debugAllowed && retrievedMemories.length > 0) {
      responsePayload.debug = {
        context_sources: retrievedMemories.map((m) => ({
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

    return jsonResponse(responsePayload, 200, corsHeaders, rateHeaders);
  } catch (err) {
    console.error("Edge Function Error:", err);
    return errorResponse(errorMessage(err), 500, corsHeaders);
  }
});
