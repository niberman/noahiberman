// Public twin: answers anonymous visitors and retrieves only rows marked
// public, via match_memories_public. The private twin lives in
// inoah-chat-private; the tier boundary is enforced in SQL, not here.
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
} from "../_shared/inoah_chat.ts";

const corsHeaders = PUBLIC_CORS_HEADERS;

const RATE_LIMIT_MAX = 30; // Increased for development testing
const checkRateLimit = createRateLimiter(RATE_LIMIT_MAX);
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

const CONTEXT_PREAMBLE = `The notes below were retrieved from Noah's personal knowledge base for this specific question. Treat them as the source of truth about Noah — prefer them over anything you would otherwise guess, and if they conflict with the biography above, the notes win. Do not invent specifics (numbers, dates, names) that appear in neither the notes nor the biography. Do not mention the notes, the knowledge base, or retrieval; just answer as Noah.`;

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
    const { prompt, include_context, max_tokens, debug_mode, turnstileToken } =
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
    const geminiKey = Deno.env.get("GEMINI_API_KEY")!;

    if (!supabaseUrl || !supabaseKey || !geminiKey) {
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
    if (include_context) {
      try {
        const embedding = await embedText(prompt, geminiKey);
        const retrieved = await retrieveContext(
          supabase,
          "match_memories_public",
          embedding,
          matchThreshold,
          matchCount,
          prompt,
        );
        contextString = retrieved.contextString;
        retrievedMemories = retrieved.memories;
      } catch (e) {
        console.error("RAG Error:", e);
        // Continue without context if RAG fails
      }
    }

    // 6b. Live calendar, only when the question is about meeting — otherwise
    // every unrelated question would pay two extra HTTP round-trips.
    let calendarContext = "";
    if (CALENDAR_INTENT.test(prompt)) {
      calendarContext = await fetchCalendarContext({
        calendarLabel: "Noah's calendar",
        includeUsageGuidance: true,
      });
    }

    // 7. Generate Response
    const { text, provider } = await createChatCompletion({
      geminiKey,
      appTitle: "iNoah",
      messages: [
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
      ],
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

    return jsonResponse(responsePayload, 200, corsHeaders, rateLimitHeaders(rateStatus));
  } catch (err) {
    console.error("Edge Function Error:", err);
    return errorResponse(errorMessage(err), 500, corsHeaders);
  }
});
