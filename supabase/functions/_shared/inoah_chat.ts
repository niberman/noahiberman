// Everything the two iNoah twins do identically: model routing, request
// parsing, the dashboard-editable retrieval knobs, and RAG retrieval. Only the
// tier boundary differs, and that lives in SQL (match_memories_public vs
// match_memories_private), never in a parameter here.
import OpenAI from "https://esm.sh/openai@4.24.1";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Model lineup (updated 2026-06-09):
// - gemini-2.0-flash passed its earliest-shutdown date (2026-06-01);
//   gemini-3.5-flash is its documented replacement.
export const CHAT_MODEL = "gemini-3.5-flash";
// Model spend routes through OpenRouter when OPENROUTER_API_KEY is set, falling
// back to Gemini direct so chat never hard-fails on a missing secret.
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_CHAT_MODEL = "google/gemini-3.5-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";

// Tuned for gemini-embedding-2's cosine-similarity distribution (measured
// 2026-06-09): relevant memories score 0.65-0.78, unrelated ones 0.50-0.56.
// 0.60 sits in the separation band; 0.5 let junk context through. These are
// fallbacks only — the live values come from the inoah_settings row so they can
// be edited from the dashboard without a redeploy.
export const MATCH_THRESHOLD = 0.6;
export const MATCH_COUNT = 5;

// gemini-3.5-flash is a thinking model: reasoning tokens draw from the same
// output budget, so give answers more headroom than the old 500 default.
export const DEFAULT_MAX_TOKENS = 1024;
export const MAX_TOKENS_CAP = 2048;
export const MAX_PROMPT_LENGTH = 2000;

export interface ChatRequest {
  prompt: string;
  include_context: boolean;
  max_tokens: number;
  debug_mode: boolean;
  turnstileToken?: string;
}

export interface ChatRequestPayload {
  prompt?: unknown;
  include_context?: boolean;
  max_tokens?: unknown;
  debug_mode?: boolean;
  turnstileToken?: string;
}

export function parseChatRequest(payload: ChatRequestPayload | null): ChatRequest {
  return {
    prompt: typeof payload?.prompt === "string" ? payload.prompt.trim() : "",
    include_context: payload?.include_context ?? true,
    max_tokens: Math.min(Number(payload?.max_tokens) || DEFAULT_MAX_TOKENS, MAX_TOKENS_CAP),
    debug_mode: payload?.debug_mode ?? false,
    turnstileToken: payload?.turnstileToken,
  };
}

export interface RetrievalSettings {
  identity: string;
  matchThreshold: number;
  matchCount: number;
}

/**
 * Dashboard-editable persona and retrieval knobs. Falls back to the caller's
 * compiled-in prompt if the row is missing so chat never hard-fails.
 */
export async function loadRetrievalSettings(
  supabase: SupabaseClient,
  fallbackPrompt: string,
): Promise<RetrievalSettings> {
  const { data: settings } = await supabase
    .from("inoah_settings")
    .select("system_prompt, match_threshold, match_count")
    .maybeSingle();

  return {
    identity: settings?.system_prompt?.trim() || fallbackPrompt,
    matchThreshold: settings?.match_threshold ?? MATCH_THRESHOLD,
    matchCount: settings?.match_count ?? MATCH_COUNT,
  };
}

export interface MatchedMemory {
  id: string;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}

/** Chat reply shape shared by both twins; `debug` is owner-only. */
export interface ChatResponsePayload {
  status: string;
  response: string;
  styled?: boolean;
  context_included: boolean;
  calendar_included: boolean;
  provider: string;
  debug?: {
    context_sources: Partial<MatchedMemory>[];
    context_count: number;
    raw_context: string;
  };
}

export interface RetrievedContext {
  contextString: string;
  memories: MatchedMemory[];
}

/**
 * Vector search against the given match RPC. The RPC name is the tier: the
 * public one has visibility = 'public' hardcoded in its SQL body, so no caller
 * can widen what the public twin sees.
 */
export async function retrieveContext(
  supabase: SupabaseClient,
  matchRpc: "match_memories_public" | "match_memories_private",
  embedding: number[],
  matchThreshold: number,
  matchCount: number,
  /** Public twin logs what it retrieved for each prompt; the private one does not. */
  logFor?: string,
): Promise<RetrievedContext> {
  const { data, error } = await supabase.rpc(matchRpc, {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });
  const memories = (data ?? []) as MatchedMemory[];

  if (error) {
    console.error("RAG Match Error:", error);
    return { contextString: "", memories: [] };
  }
  if (memories.length === 0) {
    if (logFor) console.log("No memories matched for prompt:", logFor);
    return { contextString: "", memories: [] };
  }

  if (logFor) {
    console.log("RAG Context Retrieved:", {
      prompt: logFor,
      matchCount: memories.length,
      memories: memories.map((m) => ({
        id: m.id,
        content: m.content?.substring(0, 100) + "...",
        similarity: m.similarity,
        metadata: m.metadata,
      })),
    });
  }

  return {
    contextString: memories.map((m, i) => `[${i + 1}] ${m.content}`).join("\n\n"),
    memories,
  };
}

export interface ChatCompletionResult {
  text: string;
  provider: string;
}

type ChatCompletionParams = OpenAI.Chat.ChatCompletionCreateParamsNonStreaming;

/** The two providers spell low reasoning effort differently. */
interface ReasoningParams {
  reasoning_effort?: "low";
  reasoning?: { effort: "low" };
}

/**
 * One chat completion, on OpenRouter when its key is configured and on Gemini
 * direct otherwise. A failing OpenRouter call (bad key, unavailable model,
 * rejected parameter) falls back to Gemini rather than taking chat down.
 *
 * Thinking model: reasoning effort is kept low so it doesn't eat the output
 * budget. The two providers spell that differently — Google's OpenAI-compat
 * layer takes OpenAI's `reasoning_effort`, OpenRouter takes a `reasoning`
 * object — and sending the wrong one is a 400.
 */
export async function createChatCompletion(opts: {
  geminiKey: string;
  appTitle: string;
  messages: { role: string; content: string }[];
  maxTokens: number;
}): Promise<ChatCompletionResult> {
  const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
  const useOpenRouter = !!openrouterKey;
  const geminiReasoning: ReasoningParams = { reasoning_effort: "low" };
  const openrouterReasoning: ReasoningParams = { reasoning: { effort: "low" } };

  const client = new OpenAI({
    apiKey: useOpenRouter ? openrouterKey : opts.geminiKey,
    baseURL: useOpenRouter ? OPENROUTER_BASE_URL : GEMINI_BASE_URL,
    // OpenRouter attributes usage to the app in its dashboard.
    defaultHeaders: useOpenRouter
      ? { "HTTP-Referer": "https://noahiberman.com", "X-Title": opts.appTitle }
      : undefined,
  });

  try {
    const completion = await client.chat.completions.create({
      model: useOpenRouter ? OPENROUTER_CHAT_MODEL : CHAT_MODEL,
      messages: opts.messages,
      max_tokens: opts.maxTokens,
      ...(useOpenRouter ? openrouterReasoning : geminiReasoning),
    } as ChatCompletionParams);
    return {
      text: completion.choices[0].message.content || "",
      provider: useOpenRouter ? "openrouter" : "gemini",
    };
  } catch (err) {
    if (!useOpenRouter) throw err;
    console.error("OpenRouter chat failed, falling back to Gemini:", err);
    const fallback = new OpenAI({ apiKey: opts.geminiKey, baseURL: GEMINI_BASE_URL });
    const completion = await fallback.chat.completions.create({
      model: CHAT_MODEL,
      messages: opts.messages,
      max_tokens: opts.maxTokens,
      ...geminiReasoning,
    } as ChatCompletionParams);
    return {
      text: completion.choices[0].message.content || "",
      provider: "gemini-fallback",
    };
  }
}

/** System prompt with the retrieved notes and any live calendar block appended. */
export function buildSystemPrompt(opts: {
  systemPrompt: string;
  contextPreamble: string;
  contextString: string;
  calendarContext: string;
}): string {
  let prompt = opts.contextString
    ? `${opts.systemPrompt}

CONTEXT FROM MEMORY:
${opts.contextPreamble}

${opts.contextString}`
    : opts.systemPrompt;

  if (opts.calendarContext) {
    prompt += `\n\n${opts.calendarContext}`;
  }
  return prompt;
}
