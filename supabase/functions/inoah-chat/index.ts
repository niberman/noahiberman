import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

const verifyTurnstile = async (token: string, ip: string) => {
  const secret = Deno.env.get("TURNSTILE_SECRET");
  if (!secret) {
    return true;
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

serve(async (req) => {
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
    const payload = await req.json();
    const prompt = typeof payload?.prompt === "string" ? payload.prompt.trim() : "";
    const include_context = payload?.include_context ?? true;
    const apply_style = payload?.apply_style ?? true;
    const max_tokens = payload?.max_tokens;
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

    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET");
    if (turnstileSecret) {
      if (!turnstileToken || !(await verifyTurnstile(turnstileToken, ip))) {
        return new Response(JSON.stringify({ error: "Turnstile verification failed." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const agentKey = Deno.env.get("INOAH_AGENT_KEY");
    if (!agentKey) {
      return new Response(JSON.stringify({ error: "INOAH agent key missing." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstreamResponse = await fetch("https://agent.noahiberman.com/generate/text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Key": agentKey,
      },
      body: JSON.stringify({
        prompt,
        include_context,
        apply_style,
        max_tokens,
      }),
    });

    const upstreamData = await upstreamResponse.json().catch(() => null);

    if (!upstreamResponse.ok) {
      const message =
        upstreamData?.error || upstreamData?.detail || "Upstream iNoah service failed.";
      return new Response(JSON.stringify({ error: message }), {
        status: upstreamResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        status: upstreamData?.status ?? "success",
        response: upstreamData?.response ?? "",
        styled: upstreamData?.styled,
        context_included: upstreamData?.context_included,
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
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
