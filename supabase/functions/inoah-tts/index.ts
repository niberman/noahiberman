// Text to speech for iNoah replies. ElevenLabs when a key is configured,
// otherwise the endpoint tells the client to use the browser's
// SpeechSynthesis API instead. The client probes once per session with
// `{probe: true}` and caches the engine choice.
//
// Sentence-sized requests, not whole answers: the widget sends each sentence
// as it streams in, so audio starts while the reply is still being written.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  PUBLIC_CORS_HEADERS as corsHeaders,
  errorMessage,
  errorResponse,
  jsonResponse,
  preflightResponse,
} from "../_shared/http.ts";
import { createRateLimiter, getClientIp, rateLimitHeaders } from "../_shared/rate_limit.ts";

// Sentence-level calls mean several requests per reply, so this sits higher
// than the chat limit but still stops a script from draining the TTS quota.
const checkRateLimit = createRateLimiter(60);

const MAX_TTS_CHARS = 900;

// "George", a warm stock narration voice. Override with ELEVENLABS_VOICE_ID
// once Noah clones his own voice.
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
// Flash keeps time-to-first-byte low enough to meet the 700ms audio budget.
const TTS_MODEL = "eleven_flash_v2_5";

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(corsHeaders);
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, corsHeaders);
  }

  const ip = getClientIp(req);
  const rateStatus = checkRateLimit(ip);
  if (!rateStatus.allowed) {
    return errorResponse("Too many requests.", 429, corsHeaders, rateLimitHeaders(rateStatus));
  }

  try {
    const body = await req.json().catch(() => ({}));
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    const engine = apiKey ? "elevenlabs" : "browser";

    if (body?.probe === true || typeof body?.text !== "string") {
      return jsonResponse({ engine }, 200, corsHeaders, rateLimitHeaders(rateStatus));
    }

    const text = body.text.trim().slice(0, MAX_TTS_CHARS);
    if (!text) return errorResponse("Text is required.", 400, corsHeaders);
    if (!apiKey) {
      // 409 rather than 501: the request was fine, the engine is just not
      // here. The client switches to SpeechSynthesis and stops asking.
      return jsonResponse({ engine: "browser" }, 409, corsHeaders, rateLimitHeaders(rateStatus));
    }

    const voiceId = Deno.env.get("ELEVENLABS_VOICE_ID") || DEFAULT_VOICE_ID;
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_22050_32`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: TTS_MODEL,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      console.error(`elevenlabs ${res.status}: ${detail.slice(0, 300)}`);
      // Voice is a layer on top of the text, so a TTS outage degrades to the
      // browser engine instead of failing the reply.
      return jsonResponse({ engine: "browser" }, 409, corsHeaders, rateLimitHeaders(rateStatus));
    }

    return new Response(res.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        ...rateLimitHeaders(rateStatus),
      },
    });
  } catch (err) {
    console.error("inoah-tts error:", err);
    return errorResponse(errorMessage(err), 500, corsHeaders);
  }
});
