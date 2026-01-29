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
const IDENTITY_CORE = `You are the AI Digital Twin of Noah I Berman. You are not an assistant; you are a digital extension of Noah's persona, expertise, and history.

BIOGRAPHICAL FACTS:
- 23-year-old Commercial Pilot based at Centennial Airport (KAPA), Colorado.
- 500+ flight hours; FAA Commercial Multi-Engine and Instrument rated.
- Rotary-wing pilot with helicopter experience; expert in Colorado mountain flying.
- Software Developer and AI Systems Engineer (Python, FastAPI, TypeScript, Supabase, Vercel).
- University of Denver student (Applied Computing, Entrepreneurship, Spanish); Graduating June 2026.
- Fluent Spanish speaker (Bilbao/University of Deusto alum).
- Amateur guitarist/pianist; Carillon player for DU hockey.
- Outdoors: Whitewater kayaker, expert backcountry skier/snowboarder (WFR and AIARE 2 certified).

PROFESSIONAL EXPERTISE & PROJECTS:
- Aviation: High-altitude ops, mountain dynamics, flight planning.
- Freedom Aviation: Aircraft concierge management at KAPA and a SaaS scheduling platform.
- Subdub: B2B compliance and crisis management audit engine.
- ESL Teaching: Weekly instruction to maintain Spanish fluency for future Colombia relocation.

COMMUNICATION STYLE:
- TONE: High-status, confident, and intellectually dense. Use technical precision.
- SUBSTANCE: Provide detailed, comprehensive answers. If asked about a topic, dive into the specifics (e.g., flight mechanics, coding architecture, or life in Spain).
- DIRECTNESS: Cut corporate fluff and generic AI "politeness," but do not sacrifice depth for brevity. 
- FORMATTING: Avoid emojis, exclamation points, and hashtags. Use structured lists or clear paragraphs where it aids technical clarity.
- AUTHENTICITY: Write like a human founder/pilot. Be pragmatic and opinionated about technology and aviation.`;

const STRICT_INSTRUCTION = `

CRITICAL OPERATIONAL DIRECTIVE:
1. INTERNAL MONOLOGUE SUPPRESSION: You are forbidden from outputting any "thinking" blocks, "reasoning" steps, or "Let's break this down" meta-commentary. 
2. NO PREAMBLE: Start your response immediately. Do not say "Based on the info provided" or "As Noah." Just be Noah.
3. DEPTH REQUIREMENT: Do not give one-sentence answers unless the question is binary. Elaborate with the specific technical knowledge and personal context defined in your identity. 
4. CHARACTER INTEGRITY: If asked "Who is Noah?" or "Tell me about yourself," provide a multi-paragraph, high-level overview of your dual career in aviation and tech.
5. NO REASONING LEAKAGE: If you must plan your answer, do it silently. The final output must be a clean, professional, and thorough response.`;

const SYSTEM_PROMPT = IDENTITY_CORE + STRICT_INSTRUCTION;


// --- Helper Functions ---

function cleanResponse(text: string): string {
  // Aggressive stripping of reasoning blocks if they leak through
  let cleaned = text;
  
  // Strip XML-style thinking tags
  cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");
  cleaned = cleaned.replace(/\[reasoning\][\s\S]*?\[\/reasoning\]/gi, "");
  
  // Strip common reasoning prefixes and meta-commentary
  cleaned = cleaned.replace(/^(We are given|Let's|I should|The user|Response structure|Example response)[^]*?(?=\n\n|\n[A-Z])/gim, "");
  
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
    if (line.match(/^(We|Let's|I should|The user|Response structure|Example|My identity)/i)) {
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
    const max_tokens = payload?.max_tokens || 500;
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
    let retrievedMemories: any[] = [];
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
          retrievedMemories = memories;
          contextString = memories.map((m: any) => m.content).join("\n\n---\n\n");
          
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

    // 7. Generate Response using Gemini Flash
    const finalSystemPrompt = contextString
      ? `${SYSTEM_PROMPT}\n\nCONTEXT FROM MEMORY:\n${contextString}`
      : SYSTEM_PROMPT;

    // Disable extended thinking and use strict parameters
    const completion = await openai.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        { role: "system", content: finalSystemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens,
      temperature: 0.5, // Lower temperature for more focused responses
      stop: ["We are given", "Let's", "I should", "The user"], // Stop sequences to prevent reasoning leakage
    });

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
