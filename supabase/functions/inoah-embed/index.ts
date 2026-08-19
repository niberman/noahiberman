// Writes a knowledge-base entry with its embedding.
//
// Splitting this out of the dashboard (rather than letting it insert rows via
// RLS) keeps the Gemini key server-side and makes it impossible to save an
// entry without an embedding — such a row would sit in the table looking saved
// while never being retrieved.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { isExcludedContent } from "../_shared/content_policy.ts";
import { embedText } from "../_shared/embeddings.ts";
import {
  PUBLIC_CORS_HEADERS as corsHeaders,
  errorMessage,
  errorResponse,
  jsonResponse,
  preflightResponse,
} from "../_shared/http.ts";
import { callerClient, isCallerOwner, serviceClient } from "../_shared/supabase.ts";

const MAX_CONTENT_LENGTH = 8000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return preflightResponse(corsHeaders);
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const embeddingKey = Deno.env.get("EMBEDDING_API_KEY") ?? Deno.env.get("GEMINI_API_KEY");

  if (!supabaseUrl || !serviceKey || !anonKey || !embeddingKey) {
    console.error("inoah-embed: missing environment variables");
    return errorResponse("Server configuration error.", 500, corsHeaders);
  }

  // Only the owner may edit the corpus. Signup is public, so "any signed-in
  // user" would let a stranger write memories the twins retrieve.
  const asCaller = callerClient(supabaseUrl, anonKey, req.headers.get("Authorization"));
  if (!(await isCallerOwner(asCaller))) {
    return errorResponse("Not authorized.", 401, corsHeaders);
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
      return errorResponse("Content is required.", 400, corsHeaders);
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return errorResponse(
        `Content is too long (max ${MAX_CONTENT_LENGTH} characters).`,
        400,
        corsHeaders,
      );
    }
    if (isExcludedContent(content)) {
      return errorResponse("This entry cannot be saved.", 400, corsHeaders);
    }

    const embedding = await embedText(content, embeddingKey);

    const supabase = serviceClient(supabaseUrl, serviceKey);
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

    return jsonResponse({ status: "success", entry: data }, 200, corsHeaders);
  } catch (err) {
    console.error("inoah-embed error:", err);
    return errorResponse(errorMessage(err), 500, corsHeaders);
  }
});
