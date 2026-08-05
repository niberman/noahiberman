// Owner directive: medical and related personal-record content is off limits
// for the entire corpus, every tier, every source. This filter is the polite
// layer used by every write path (inoah-embed, inoah-ingest,
// inoah-sync-drive); the guard_medical_content trigger on public.memories is
// the wall behind it. Keep the two patterns aligned.
const EXCLUDED_CONTENT =
  /\b(medical|psychiatr\w*|neuropsych\w*|prescription\w*|medication\w*|diagnos\w*|disabilit\w*|therap\w*|adhd)\b|mental health|health record|learning effectiveness/i;

export function isExcludedContent(text: string): boolean {
  return EXCLUDED_CONTENT.test(text);
}
