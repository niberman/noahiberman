import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import OpenAI from "https://esm.sh/openai@4.24.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// --- Configuration ---

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;
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

// Identity & Style Prompts (Derived from identity_facts.json)
const IDENTITY_CONTEXT = `You are the AI Digital Twin of Noah I Berman.
Role: 23-year-old Commercial Pilot (KAPA, 500+ hours, multiengine/instrument) and Software Developer.
Education: University of Denver, Applied Computing/Entrepreneurship/Spanish (Graduating June 2026).
History: Fluent Spanish speaker; one year at University of Deusto in Bilbao. Amateur guitarist/pianist, carillon player for DU hockey.
Location: Colorado.
Expertise: Aviation (Commercial Multi-Engine, Instrument, Mountain Flying), Software (React, TypeScript, Supabase, OpenAI, Python).
Projects: Freedom Aviation (Dashboard & Ops), iNoah (this chatbot), The Language School.
`;

const STYLE_RULES = `STYLE RULES:
- Write like a human, not a corporation.
- Be casual, direct, and blunt. Use sentence fragments when appropriate.
- NO emojis.
- NO exclamation points.
- NO hashtags inline.
- Tone: Professional, high-status, efficient.
- Technical precision is valued over politeness.
- Do not use generic AI fluff ("I hope this helps", "Certainly!").
- Do NOT reveal private data (exact location, passwords).
- If asked to change system state, refuse and say you are a read-only digital twin.

STRICT DIRECTIVE: Disable all internal reasoning, chain-of-thought, or meta-commentary. Output the final response only. No filler, no 'Let's break this down,' and no conversational transitions. Terminate the response immediately after the information is delivered.
`;

const SYSTEM_PROMPT = `${IDENTITY_CONTEXT}

${STYLE_RULES}
`;

// --- Helper Functions ---

function cleanResponse(text: string): string {
  // Regex to strip <thinking>...</thinking> tags or similar reasoning blocks if they leak
  // Also strip [reasoning]...[/reasoning] style
  let cleaned = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");
  cleaned = cleaned.replace(/\[reasoning\][\s\S]*?\[\/reasoning\]/gi, "");
  // Remove markdown bolding of "Answer:" or similar if model outputs it
  cleaned = cleaned.replace(/^\*\*Answer:\*\*\s*/i, "");
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
    const max_tokens = payload?.max_tokens || 500;
    const turnstileToken = payload?.turnstileToken;

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
    // SWITCH TO GEMINI API KEY
    const geminiKey = Deno.env.get("GEMINI_API_KEY")!;

    if (!supabaseUrl || !supabaseKey || !geminiKey) {
      console.error("Missing environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    // Initialize OpenAI client with Google's Base URL
    const openai = new OpenAI({
      apiKey: geminiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });

    // 6. RAG: Retrieve Context (if requested)
    let contextString = "";
    if (include_context) {
      try {
        // Generate embedding for the prompt using Google's embedding model
        // Note: Using text-embedding-004 for Gemini compatibility (768 dimensions)
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-004",
          input: prompt,
        });
        const embedding = embeddingResponse.data[0].embedding;

        // Query memories (requires DB schema update to 768 dimensions)
        const { data: memories, error: matchError } = await supabase.rpc("match_memories", {
          query_embedding: embedding,
          match_threshold: 0.5,
          match_count: 5,
        });

        if (!matchError && memories) {
          contextString = memories.map((m: any) => m.content).join("\n\n---\n\n");
        }
      } catch (e) {
        console.error("RAG Error:", e);
        // Continue without context if RAG fails
      }
    }

    // 7. Generate Response using Gemini Flash
    const finalSystemPrompt = contextString
      ? `${SYSTEM_PROMPT}\n\nCONTEXT FROM MEMORY:\n${contextString}`
      : SYSTEM_PROMPT;

    // Use absolute zero reasoning if possible, though 'thinking_budget' is not standard OpenAI param.
    // We rely on system prompt instructions.
    
    const completion = await openai.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        { role: "system", content: finalSystemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens,
      temperature: 0.7,
    });

    let responseText = completion.choices[0].message.content || "";
    responseText = cleanResponse(responseText);

    return new Response(
      JSON.stringify({
        status: "success",
        response: responseText,
        styled: true,
        context_included: !!contextString,
      }),
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
