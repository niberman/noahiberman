// A Drive file declares its own corpus tier in its frontmatter. Reading that,
// rather than applying one tier to a whole folder, is what lets a single doc be
// public while its neighbours stay private — and what keeps a credentials file
// out of the corpus entirely.

/** Leading `---` block only, so prose mentioning "visibility:" cannot vote. */
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

/** The tier a file declares for itself, lowercased, or null if it declares none. */
export function declaredVisibility(text: string): string | null {
  const block = text.match(FRONTMATTER_RE);
  if (!block) return null;
  // Anchored to a whole line: public-answers.md's `status:` field discusses
  // visibility in prose, and that must not be read as a declaration.
  const line = block[1].match(/^visibility:[ \t]*([A-Za-z]+)[ \t]*$/m);
  return line ? line[1].toLowerCase() : null;
}

/** Tiers a file may claim. Anything else falls back to the source default. */
export const DECLARABLE_TIERS = new Set(["public", "private", "never"]);

/** Declarations that mean "do not put this in the corpus at all". */
export const NOT_CORPUS = new Set(["secret", "config"]);

/**
 * The document without its frontmatter block.
 *
 * Frontmatter is metadata about the file — who governs it, what consumes it,
 * its status — never knowledge about Noah. Embedding it dilutes every chunk 0
 * with boilerplate, and on a file declared public it would serve internal
 * notes to strangers. A file whose body is empty yields no chunks at all,
 * which is the honest representation of a file that has nothing to say yet.
 */
export function stripFrontmatter(text: string): string {
  return text.replace(FRONTMATTER_RE, "").trim();
}

/**
 * A heading may re-declare the tier of its own section:
 * `## Internal figures <!-- private -->`. Same vocabulary as the frontmatter,
 * so one document can be public without publishing the parts of itself it
 * says are internal — `public-profile.md` is public knowledge and a
 * never-publish list living in one file, and the file is the wrong unit.
 *
 * An HTML comment because it stays invisible wherever the document is read,
 * and because prose can mention a tier without voting: the marker only counts
 * on a heading line, at its end.
 */
const SECTION_TIER_RE = /^#{1,6}[ \t].*?<!--[ \t]*([A-Za-z]+)[ \t]*-->[ \t]*$/;

/** The tier a heading declares for its section, or null if it declares none. */
export function sectionVisibility(heading: string): string | null {
  const line = heading.split("\n", 1)[0];
  const match = line.match(SECTION_TIER_RE);
  return match ? match[1].toLowerCase() : null;
}

/** The heading without its marker, so the marker is never embedded. */
export function stripSectionMarker(heading: string): string {
  return heading.replace(/[ \t]*<!--[ \t]*[A-Za-z]+[ \t]*-->[ \t]*$/m, "");
}
