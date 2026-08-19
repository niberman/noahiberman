// Syncs registered Drive folders and site tables into the iNoah corpus.
//
// Trust model: SYNC_SECRET bearer gates the trigger (the hourly cron in
// Postgres holds it in Vault). The service account can only see folders Noah
// shared with it, and only folders registered in ingest_sources get read at
// all. A Drive file decides its own tier in its frontmatter: `visibility:
// public` is served to strangers, `private` (or no declaration) is owner-only,
// and `secret`/`config` are not ingested at all — a credentials file has no
// business in a retrieval corpus, and a persona spec is configuration rather
// than knowledge. Site tables have no frontmatter and keep the source row's
// default_visibility. Files that declare nothing still default to private, so
// a missing declaration hides a row rather than publishing it.
import { isExcludedContent } from "../_shared/content_policy.ts";
import {
  DECLARABLE_TIERS,
  declaredVisibility,
  NOT_CORPUS,
  stripFrontmatter,
} from "../_shared/frontmatter.ts";
import { embedText, sha256Hex } from "../_shared/embeddings.ts";
import {
  PUBLIC_CORS_HEADERS as corsHeaders,
  errorMessage,
  errorResponse,
  jsonResponse,
  preflightResponse,
} from "../_shared/http.ts";
import { serviceClient } from "../_shared/supabase.ts";

// Chunking mirrors projects/inoah-core/src/inoah_core/memory/ingest.py
// (chunk_size 1000, overlap 200, paragraph boundaries) so the two ingesters
// never disagree about chunk identity.
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const MAX_FILE_CHARS = 200_000;

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const DOC_MIME = "application/vnd.google-apps.document";
const TEXT_MIMES = new Set(["text/plain", "text/markdown", "text/x-markdown"]);

function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";
  for (let para of paragraphs) {
    para = para.trim();
    if (!para) continue;
    if (current.length + para.length > CHUNK_SIZE) {
      if (current) chunks.push(current.trim());
      if (chunks.length > 0 && CHUNK_OVERLAP > 0) {
        current = chunks[chunks.length - 1].slice(-CHUNK_OVERLAP) + "\n\n" + para;
      } else {
        current = para;
      }
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

// --- Service account auth ---

function b64url(input: string | ArrayBuffer): string {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function getAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );
  const jwt = `${header}.${claims}.${b64url(sig)}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`token exchange ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  if (!data.access_token) throw new Error("token exchange returned no access_token");
  return data.access_token;
}

// --- Drive listing and reading ---

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

async function driveGet(path: string, token: string): Promise<any> {
  const res = await fetch(`${DRIVE_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`drive ${path.split("?")[0]} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function listFolderRecursive(folderId: string, token: string): Promise<{ files: DriveFile[]; skippedBinaries: number }> {
  const files: DriveFile[] = [];
  let skippedBinaries = 0;
  const queue = [folderId];
  while (queue.length > 0) {
    const parent = queue.shift()!;
    let pageToken: string | undefined;
    do {
      const q = encodeURIComponent(`'${parent}' in parents and trashed = false`);
      const fields = encodeURIComponent("nextPageToken, files(id, name, mimeType, webViewLink)");
      const page = await driveGet(
        `/files?q=${q}&fields=${fields}&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ""}`,
        token,
      );
      for (const f of page.files ?? []) {
        if (f.mimeType === FOLDER_MIME) {
          queue.push(f.id);
        } else if (
          f.mimeType === DOC_MIME ||
          TEXT_MIMES.has(f.mimeType) ||
          f.name.endsWith(".md") ||
          f.name.endsWith(".txt")
        ) {
          files.push(f);
        } else {
          // Binaries, images and PDFs are skipped on this pass and counted.
          skippedBinaries += 1;
        }
      }
      pageToken = page.nextPageToken;
    } while (pageToken);
  }
  return { files, skippedBinaries };
}

async function readFileText(f: DriveFile, token: string): Promise<string> {
  const url = f.mimeType === DOC_MIME
    ? `${DRIVE_API}/files/${f.id}/export?mimeType=text/plain`
    : `${DRIVE_API}/files/${f.id}?alt=media`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`drive read ${f.name} ${res.status}`);
  const text = await res.text();
  return text.slice(0, MAX_FILE_CHARS);
}

// --- Upsert plumbing shared by both source kinds ---

interface Chunk {
  sourceId: string;
  chunkIndex: number;
  content: string;
  sourceUri: string | null;
  name: string;
  /** From the file's frontmatter; falls back to the source default when absent. */
  visibility?: string;
}

/**
 * Upserts chunks for one origin, skipping unchanged hashes, then deletes rows
 * this origin owns that are no longer present. Deletion is scoped by the
 * sync_origin marker in metadata so a sync can never touch dashboard entries
 * or another origin's rows.
 */
async function syncChunks(
  supabase: any,
  embeddingKey: string,
  origin: string,
  defaultVisibility: string,
  collection: string,
  chunks: Chunk[],
): Promise<
  { upserted: number; skipped: number; retiered: number; deleted: number; excluded: number }
> {
  const total = chunks.length;
  chunks = chunks.filter((c) => !isExcludedContent(c.content));
  const excluded = total - chunks.length;
  const sourceIds = [...new Set(chunks.map((c) => c.sourceId))];
  const { data: existing, error: existingError } = await supabase
    .from("memories")
    .select("id, source_id, chunk_index, content_hash, visibility")
    .eq("metadata->>sync_origin", origin);
  if (existingError) throw new Error(existingError.message);
  const byKey = new Map<string, any>(
    (existing ?? []).map((r: any) => [`${r.source_id} ${r.chunk_index}`, r]),
  );

  const now = new Date().toISOString();
  let upserted = 0;
  let skipped = 0;
  let retiered = 0;
  for (const c of chunks) {
    const hash = await sha256Hex(c.content);
    const prior = byKey.get(`${c.sourceId} ${c.chunkIndex}`);
    // 'never' is terminal: guard_visibility() raises on any move off it, and a
    // raise here would abort the whole run — this origin's stale deletes and
    // every later source included. That the tier cannot be walked back is the
    // point of it, so an existing 'never' row keeps its tier no matter what the
    // file now declares.
    const tier = prior?.visibility === "never"
      ? "never"
      : (c.visibility ?? defaultVisibility);
    if (prior?.content_hash === hash) {
      if (prior.visibility === tier) {
        skipped += 1;
        continue;
      }
      // Same text, different tier: the file re-declared itself, or the rule
      // that assigned the tier changed. Move the row without paying for an
      // embedding — the vector is a function of the content, which is identical.
      const { error } = await supabase
        .from("memories")
        .update({ visibility: tier, updated_at: now })
        .eq("id", prior.id);
      if (error) throw new Error(error.message);
      retiered += 1;
      continue;
    }
    const embedding = await embedText(c.content, embeddingKey);
    const { error } = await supabase.from("memories").upsert(
      {
        content: c.content,
        embedding,
        collection,
        metadata: { sync_origin: origin, name: c.name },
        source_id: c.sourceId,
        source_uri: c.sourceUri,
        chunk_index: c.chunkIndex,
        content_hash: hash,
        visibility: tier,
        ingested_at: now,
        updated_at: now,
      },
      { onConflict: "source_id,chunk_index" },
    );
    if (error) throw new Error(error.message);
    upserted += 1;
  }

  // Rows whose file disappeared, and trailing chunks of files that shrank.
  const liveKeys = new Set(chunks.map((c) => `${c.sourceId} ${c.chunkIndex}`));
  const staleIds = (existing ?? [])
    .filter((r: any) => !liveKeys.has(`${r.source_id} ${r.chunk_index}`))
    .map((r: any) => r.id);
  if (staleIds.length > 0) {
    const { error } = await supabase.from("memories").delete().in("id", staleIds);
    if (error) throw new Error(error.message);
  }
  return { upserted, skipped, retiered, deleted: staleIds.length, excluded };
}

// --- Site table renderers ---
// Each renders public site content into chunks. These tables are already
// public on noahiberman.com, which is why their sources are registered public.

async function siteTableChunks(supabase: any, table: string): Promise<Chunk[]> {
  if (table === "projects") {
    const { data, error } = await supabase
      .from("projects")
      .select("id, title, description, category, year, technologies, venture_name");
    if (error) throw new Error(error.message);
    return (data ?? []).map((p: any) => ({
      sourceId: `site:projects:${p.id}`,
      chunkIndex: 0,
      name: p.title,
      sourceUri: "https://www.noahiberman.com/projects",
      content: `Project: ${p.title} (${p.category ?? "project"}, ${p.year ?? ""}). ${p.description ?? ""}${p.technologies?.length ? ` Technologies: ${p.technologies.join(", ")}.` : ""}${p.venture_name ? ` Part of ${p.venture_name}.` : ""}`,
    }));
  }
  if (table === "ventures") {
    const { data, error } = await supabase
      .from("ventures")
      .select("id, title, description, role, year, status, tags");
    if (error) throw new Error(error.message);
    return (data ?? []).map((v: any) => ({
      sourceId: `site:ventures:${v.id}`,
      chunkIndex: 0,
      name: v.title,
      sourceUri: "https://www.noahiberman.com",
      content: `Venture: ${v.title} (${v.role ?? "founder"}, ${v.year ?? ""}, ${v.status ?? ""}). ${v.description ?? ""}${v.tags?.length ? ` Tags: ${v.tags.join(", ")}.` : ""}`,
    }));
  }
  if (table === "blog_posts") {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, title, slug, excerpt, content, published_at")
      .eq("is_published", true);
    if (error) throw new Error(error.message);
    const chunks: Chunk[] = [];
    for (const post of data ?? []) {
      const body = `Blog post: ${post.title}\n\n${post.excerpt ?? ""}\n\n${post.content ?? ""}`;
      chunkText(body).forEach((content, i) => {
        chunks.push({
          sourceId: `site:blog_posts:${post.id}`,
          chunkIndex: i,
          name: post.title,
          sourceUri: `https://www.noahiberman.com/blog/${post.slug}`,
          content,
        });
      });
    }
    return chunks;
  }
  if (table === "flights") {
    // One aggregate chunk. Embedding hundreds of individual flight rows buys
    // nothing for chat retrieval; per-flight chunks are the upgrade if a
    // question pattern ever needs them.
    const { data, error } = await supabase
      .from("flights")
      .select("date, aircraft")
      .order("date", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length === 0) return [];
    const aircraft = new Set(rows.map((r: any) => r.aircraft?.registration ?? r.aircraft?.type ?? "unknown"));
    const first = rows[0].date;
    const last = rows[rows.length - 1].date;
    return [{
      sourceId: "site:flights:aggregate",
      chunkIndex: 0,
      name: "Flight log summary",
      sourceUri: "https://www.noahiberman.com/flights",
      content: `The public flight log on noahiberman.com currently lists ${rows.length} flights between ${first} and ${last}, across ${aircraft.size} distinct aircraft. Exact hours and currency come from the ForeFlight logbook, not this table.`,
    }];
  }
  throw new Error(`No renderer for site table ${table}`);
}

// --- Main ---

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(corsHeaders);
  if (req.method !== "POST") return errorResponse("Method not allowed", 405, corsHeaders);

  const syncSecret = Deno.env.get("SYNC_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const embeddingKey = Deno.env.get("EMBEDDING_API_KEY") ?? Deno.env.get("GEMINI_API_KEY");
  const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!syncSecret || !supabaseUrl || !serviceKey || !embeddingKey || !saJson) {
    console.error("inoah-sync-drive: missing environment variables");
    return errorResponse("Server configuration error.", 500, corsHeaders);
  }

  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${syncSecret}`) {
    return errorResponse("Not authorized.", 401, corsHeaders);
  }

  const supabase = serviceClient(supabaseUrl, serviceKey);

  try {
    const { data: sources, error: sourcesError } = await supabase
      .from("ingest_sources")
      .select("kind, external_id, label, default_visibility")
      .eq("enabled", true)
      .in("kind", ["drive_folder", "site_table"]);
    if (sourcesError) throw new Error(sourcesError.message);

    const driveSources = (sources ?? []).filter((s: any) => s.kind === "drive_folder");
    const tableSources = (sources ?? []).filter((s: any) => s.kind === "site_table");
    const report: Record<string, unknown> = {};

    // Incremental gate: after a full pass we store the Drive changes token.
    // On later runs, an empty changes list means Drive is untouched and the
    // whole Drive section is skipped. Any relevant change triggers a full
    // re-list rather than per-file surgery, which is the right trade at this
    // corpus size; per-file incremental sync is the upgrade if listing cost
    // ever matters.
    let driveDirty = true;
    let token: string | null = null;
    if (driveSources.length > 0) {
      const sa = JSON.parse(saJson);
      token = await getAccessToken(sa);
      const { data: state } = await supabase
        .from("sync_state")
        .select("value")
        .eq("key", "drive_changes_token")
        .maybeSingle();
      const pageToken = state?.value?.token;
      if (pageToken) {
        let changes: any[] = [];
        let next: string | undefined = pageToken;
        let newStart: string | undefined;
        while (next) {
          const page = await driveGet(
            `/changes?pageToken=${encodeURIComponent(next)}&fields=changes(fileId,removed),nextPageToken,newStartPageToken`,
            token,
          );
          changes = changes.concat(page.changes ?? []);
          newStart = page.newStartPageToken ?? newStart;
          next = page.nextPageToken;
        }
        driveDirty = changes.length > 0;
        if (newStart) {
          await supabase.from("sync_state").upsert({
            key: "drive_changes_token",
            value: { token: newStart },
            updated_at: new Date().toISOString(),
          });
        }
        report.drive_changes_seen = changes.length;
      }
    }

    if (driveDirty && driveSources.length > 0 && token) {
      for (const src of driveSources) {
        const { files, skippedBinaries } = await listFolderRecursive(src.external_id, token);
        const chunks: Chunk[] = [];
        const notCorpus: string[] = [];
        for (const f of files) {
          const text = await readFileText(f, token);
          const declared = declaredVisibility(text);
          if (declared && NOT_CORPUS.has(declared)) {
            // Never embedded, and any rows a previous run created are deleted
            // below as stale — the file simply stops existing to the corpus.
            notCorpus.push(`${f.name} (${declared})`);
            continue;
          }
          const visibility = declared && DECLARABLE_TIERS.has(declared)
            ? declared
            : src.default_visibility;
          // The declaration is read from the frontmatter; the frontmatter itself
          // is metadata and never becomes corpus content.
          chunkText(stripFrontmatter(text)).forEach((content, i) => {
            chunks.push({
              sourceId: f.id,
              chunkIndex: i,
              name: f.name,
              sourceUri: f.webViewLink ?? null,
              content,
              visibility,
            });
          });
        }
        const result = await syncChunks(
          supabase,
          embeddingKey,
          `drive_folder:${src.external_id}`,
          src.default_visibility,
          "drive",
          chunks,
        );
        report[src.label] = {
          files: files.length,
          skipped_binaries: skippedBinaries,
          not_corpus: notCorpus,
          ...result,
        };
      }
      if (!report.drive_changes_seen) {
        const startPage = await driveGet("/changes/startPageToken", token);
        await supabase.from("sync_state").upsert({
          key: "drive_changes_token",
          value: { token: startPage.startPageToken },
          updated_at: new Date().toISOString(),
        });
      }
    } else if (!driveDirty) {
      report.drive = "unchanged, skipped";
    }

    for (const src of tableSources) {
      const chunks = await siteTableChunks(supabase, src.external_id);
      const result = await syncChunks(
        supabase,
        embeddingKey,
        `site_table:${src.external_id}`,
        src.default_visibility,
        "site",
        chunks,
      );
      report[src.label] = { rows: chunks.length, ...result };
    }

    console.log("inoah-sync-drive report:", JSON.stringify(report));
    return jsonResponse({ status: "success", report }, 200, corsHeaders);
  } catch (err) {
    console.error("inoah-sync-drive error:", err);
    return errorResponse(errorMessage(err), 500, corsHeaders);
  }
});
