// Private twin: answers only the verified owner, retrieves from the whole
// corpus via match_memories_private. The public twin lives in inoah-chat and
// can only ever see rows marked public; that boundary is enforced in SQL.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { errorMessage, errorResponse, jsonResponse, preflightResponse, siteCorsHeaders } from "../_shared/http.ts";
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

// Owner-only endpoint behind a JWT, so the limit is generous.
const RATE_LIMIT_MAX = 120;
const checkRateLimit = createRateLimiter(RATE_LIMIT_MAX);

const IDENTITY_CORE = `You are the AI Digital Twin of Noah I Berman, answering Noah himself in a private session.`;

const STRICT_INSTRUCTION = `

CRITICAL DIRECTIVE - ABSOLUTE REQUIREMENT:
You MUST NOT output ANY internal reasoning, thinking process, chain-of-thought, planning, deliberation, or meta-commentary.
OUTPUT THE FINAL ANSWER ONLY. NO PREAMBLE. NO PROCESS. NO ANALYSIS OF THE QUESTION.`;

const CONTEXT_PREAMBLE = `The notes below were retrieved from Noah's personal knowledge base for this specific question. Treat them as the source of truth and prefer them over anything you would otherwise guess. Do not invent specifics that appear in neither the notes nor the biography.`;

serve(async (req) => {
  // Owner-only endpoint, so CORS is the site origin, not *.
  const corsHeaders = siteCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return preflightResponse(corsHeaders);
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const ip = getClientIp(req);
  const rateStatus = checkRateLimit(ip);

  if (!rateStatus.allowed) {
    return errorResponse("Too many requests. Please try again shortly.", 429, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    // Chat completions bill to OpenRouter; Gemini direct is the fallback and
    // still owns embeddings. Requiring GEMINI_API_KEY unconditionally used to
    // 500 the whole function on an OpenRouter-only deployment, so the guard now
    // only insists that at least one model key is present.
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseKey || !anonKey || (!openrouterKey && !geminiKey)) {
      console.error("Missing environment variables");
      return errorResponse("Server configuration error.", 500, corsHeaders);
    }

    // Owner gate. verify_jwt already rejected anonymous callers; this rejects
    // any signed-in user who is not in app_owners.
    const asCaller = callerClient(supabaseUrl, anonKey, req.headers.get("Authorization"));
    if (!(await isCallerOwner(asCaller))) {
      return errorResponse("Not authorized.", 401, corsHeaders);
    }

    const { prompt, include_context, max_tokens, debug_mode } = parseChatRequest(await req.json());

    if (!prompt) {
      return errorResponse("Prompt is required.", 400, corsHeaders);
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return errorResponse("Prompt is too long.", 400, corsHeaders);
    }

    const supabase = serviceClient(supabaseUrl, supabaseKey);

    // Same dashboard-editable persona and retrieval knobs as the public twin.
    const { identity, matchThreshold, matchCount } = await loadRetrievalSettings(
      supabase,
      IDENTITY_CORE,
    );
    const SYSTEM_PROMPT = identity + STRICT_INSTRUCTION;

    let contextString = "";
    let retrievedMemories: MatchedMemory[] = [];
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
        const retrieved = await retrieveContext(
          supabase,
          "match_memories_private",
          embedding,
          matchThreshold,
          matchCount,
        );
        contextString = retrieved.contextString;
        retrievedMemories = retrieved.memories;
      } catch (e) {
        console.error("RAG Error:", e);
        // Continue without context if RAG fails
      }
    }

    let calendarContext = "";
    if (CALENDAR_INTENT.test(prompt)) {
      calendarContext = await fetchCalendarContext({
        calendarLabel: "the calendar",
        includeUsageGuidance: false,
      });
    }

    const { text, provider } = await createChatCompletion({
      geminiKey,
      appTitle: "iNoah private",
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

    const responsePayload: ChatResponsePayload = {
      status: "success",
      response: text,
      context_included: !!contextString,
      calendar_included: !!calendarContext,
      provider,
    };

    // The caller is the verified owner, so debug is available on request.
    if (debug_mode && retrievedMemories.length > 0) {
      responsePayload.debug = {
        context_sources: retrievedMemories.map((m) => ({
          id: m.id,
          content: m.content,
          similarity: m.similarity,
          metadata: m.metadata,
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
