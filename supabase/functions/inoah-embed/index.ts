// Writes a knowledge-base entry with its embedding.
//
// Splitting this out of the dashboard (rather than letting it insert rows via
// RLS) keeps the Gemini key server-side and makes it impossible to save an
// entry without an embedding — such a row would sit in the table looking saved
// while never being retrieved.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { isExcludedContent } from "../_shared/content_policy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_CONTENT_LENGTH = 8000;

// Must stay identical to inoah-chat's embedText: an entry embedded with a
// different model is stored fine but never retrieved. text-embedding-004 was
// shut down by Google on 2026-01-14 — gemini-embedding-2 is the current model,
// and the native endpoint is required for output_dimensionality.
const EMBEDDING_MODEL = "gemini-embedding-2";
const EMBEDDING_DIMS = 768; // must match public.memories.embedding vector(768)

async function embedText(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
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
    throw new Error(`embedContent returned ${values?.length ?? 0} dims, expected ${EMBEDDING_DIMS}`);
  }
  return values;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");

  if (!supabaseUrl || !serviceKey || !anonKey || !geminiKey) {
    console.error("inoah-embed: missing environment variables");
    return json({ error: "Server configuration error." }, 500);
  }

  // Only the owner may edit the corpus. Signup is public, so "any signed-in
  // user" would let a stranger write memories the twins retrieve.
  const authHeader = req.headers.get("Authorization") ?? "";
  const asCaller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await asCaller.auth.getUser();
  const { data: isOwner } = user ? await asCaller.rpc("is_owner") : { data: false };
  if (isOwner !== true) {
    return json({ error: "Not authorized." }, 401);
  }

  try {
    const payload = await req.json();
    const id: string | undefined = payload?.id || undefined;
    const content = typeof payload?.content === "string" ? payload.content.trim() : "";
    const collection =
      typeof payload?.collection === "string" && payload.collection.trim()
        ? payload.collection.trim()
        : "knowledge";

    if (!content) {
      return json({ error: "Content is required." }, 400);
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return json(
        { error: `Content is too long (max ${MAX_CONTENT_LENGTH} characters).` },
        400
      );
    }
    if (isExcludedContent(content)) {
      return json({ error: "This entry cannot be saved." }, 400);
    }

    const embedding = await embedText(content, geminiKey);

    const supabase = createClient(supabaseUrl, serviceKey);
    const row = { content, collection, embedding, updated_at: new Date().toISOString() };

    // New entries land private; edits never touch visibility. Promotion is a
    // dedicated dashboard action, not a side effect of saving.
    const query = id
      ? supabase.from("memories").update(row).eq("id", id)
      : supabase.from("memories").insert({ ...row, visibility: "private" });

    const { data, error } = await query
      .select("id, content, collection, created_at, updated_at")
      .single();

    if (error) throw error;

    return json({ status: "success", entry: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    console.error("inoah-embed error:", err);
    return json({ error: message }, 500);
  }
});
