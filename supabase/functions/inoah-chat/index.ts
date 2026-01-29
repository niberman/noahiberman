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
Roles: Commercial Pilot, Software Engineer, University of Denver Student.
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
`;

const SYSTEM_PROMPT = `${IDENTITY_CONTEXT}

${STYLE_RULES}
`;

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
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      console.error("Missing environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // 6. RAG: Retrieve Context (if requested)
    let contextString = "";
    if (include_context) {
      try {
        // Generate embedding for the prompt
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: prompt,
        });
        const embedding = embeddingResponse.data[0].embedding;

        // Query memories
        // Note: Using match_memories RPC if defined, or direct select if logic permits.
        // Since we didn't define a specific RPC in the migration (just table), we can use the library if enabled,
        // or we need to add a match function.
        // Direct query on table with pgvector usually requires an RPC for similarity search in Supabase JS client.
        // Let's assume we need to use a raw query or add the RPC.
        // Actually, for simplicity without adding more RPCs to migration right now, 
        // I will add the RPC to the migration in a follow-up if needed, 
        // OR I can use the standard `rpc` call if I defined it. 
        // Wait, I didn't define a `match_memories` function in step 1. I only created the table and index.
        // Supabase JS client needs an RPC to sort by similarity.
        
        // I should have added the RPC in Step 1. I will handle this by defining the RPC in a new migration file quickly, 
        // or just add it here if I can run SQL. But I can't run SQL from here easily.
        // I'll proceed with writing this code assuming `match_memories` exists, 
        // and I will add a step to create that RPC in the migration plan or just append it to the previous migration file 
        // (since I haven't "committed" it to a repo yet effectively).
        // Actually, I can just append the RPC creation to the file `20260129000000_create_memory_tables.sql` I just wrote.
        
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

    // 7. Generate Response
    const finalSystemPrompt = contextString
      ? `${SYSTEM_PROMPT}\n\nCONTEXT FROM MEMORY:\n${contextString}`
      : SYSTEM_PROMPT;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: finalSystemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens,
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content || "";

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
