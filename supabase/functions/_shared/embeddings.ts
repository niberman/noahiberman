// The single embedding implementation for the whole corpus.
//
// Every read and write path (inoah-chat, inoah-embed, inoah-ingest,
// inoah-sync-drive) must embed with the same model and width: a
// chunk embedded any other way is stored fine but never retrieved, and the
// failure is silent. Keeping one copy is what makes that guarantee hold.
//
// text-embedding-004 was shut down by Google on 2026-01-14; gemini-embedding-2
// is the current model. The native endpoint is required because
// output_dimensionality is not exposed on the OpenAI-compat one, and
// gemini-embedding-2 re-normalizes truncated output so cosine similarity in
// match_memories stays valid.
export const EMBEDDING_MODEL = "gemini-embedding-2";
export const EMBEDDING_DIMS = 768; // must match public.memories.embedding vector(768)

export async function embedText(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
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
    throw new Error(
      `embedContent returned ${values?.length ?? 0} dims, expected ${EMBEDDING_DIMS}`,
    );
  }
  return values;
}

/** Content hash used to skip re-embedding unchanged chunks. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
