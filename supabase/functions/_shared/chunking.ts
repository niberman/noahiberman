// Splitting a document into corpus chunks, and deciding which tier each chunk
// lands in. Lives here rather than in the sync function because the tier
// boundary is the security property of the whole corpus and index.ts calls
// Deno.serve at module load, so nothing in it can be unit tested.
//
// Mirrors projects/inoah-core/src/inoah_core/memory/ingest.py (chunk_size
// 1000, overlap 200, paragraph boundaries) so the two ingesters never disagree
// about chunk identity.
import { sectionVisibility, stripSectionMarker } from "./frontmatter.ts";

export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 200;

/** A chunk plus the tier its section declared, if any. */
export interface TextChunk {
  content: string;
  tier: string | null;
}

export function chunkText(text: string): TextChunk[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: TextChunk[] = [];
  let current = "";
  // The tier of the section `current` sits in. Reset at every heading, so a
  // marked section cannot leak its tier onto the sections that follow it.
  let tier: string | null = null;
  const push = () => {
    const content = current.trim();
    if (content) chunks.push({ content, tier });
  };

  for (let para of paragraphs) {
    para = para.trim();
    if (!para) continue;
    // A heading starts a new topic, so never pack across one. Without this a
    // Q&A document packs several unrelated answers into one chunk, and the
    // blended embedding fails to clear the match threshold for any single
    // question — the corpus holds the answer and retrieval never surfaces it.
    // The same boundary is where a tier may change, which is why a section
    // marker is only ever read off a heading.
    if (para.startsWith("#")) {
      push();
      tier = sectionVisibility(para);
      current = stripSectionMarker(para);
      continue;
    }
    if (current.length + para.length > CHUNK_SIZE) {
      push();
      // The overlap can only come from the same section: a heading always
      // pushes and restarts `current`, so the previous chunk is a sibling.
      current = chunks.length > 0 && CHUNK_OVERLAP > 0
        ? chunks[chunks.length - 1].content.slice(-CHUNK_OVERLAP) + "\n\n" + para
        : para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  push();
  return chunks;
}
