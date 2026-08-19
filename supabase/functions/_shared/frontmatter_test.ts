// deno test supabase/functions/_shared/frontmatter_test.ts
import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { declaredVisibility, stripFrontmatter } from "./frontmatter.ts";

Deno.test("reads a declaration from the frontmatter block", () => {
  assertEquals(
    declaredVisibility("---\nfile: x.md\nvisibility: public\n---\n\nbody"),
    "public",
  );
});

Deno.test("prose about visibility is not a declaration", () => {
  // Verbatim shape of public-answers.md: the real declaration is on its own
  // line, and the status field then discusses visibility in a sentence.
  const doc = [
    "---",
    "file: public-answers.md",
    "visibility: public",
    "status: A chunk's visibility is inherited from the default_visibility of",
    "  its ingest_sources row, and the folder is registered private.",
    "---",
    "",
    "body",
  ].join("\n");
  assertEquals(declaredVisibility(doc), "public");
});

Deno.test("a body mention alone declares nothing", () => {
  assertEquals(declaredVisibility("no frontmatter\nvisibility: public\n"), null);
});

Deno.test("undeclared and unfenced files fall through to the source default", () => {
  assertEquals(declaredVisibility("---\nfile: x.md\n---\nbody"), null);
  assertEquals(declaredVisibility("plain text"), null);
});

Deno.test("declaration is case-insensitive and trimmed", () => {
  assertEquals(declaredVisibility("---\nvisibility:  Secret  \n---\n"), "secret");
});

Deno.test("strips the frontmatter block, keeps the body", () => {
  assertEquals(
    stripFrontmatter("---\nfile: x.md\nvisibility: public\n---\n\nThe body.\n"),
    "The body.",
  );
});

Deno.test("a file that is only frontmatter has no body", () => {
  // public-answers.md's real shape: declared public, nothing below the line.
  // It must yield zero chunks rather than publishing its own status notes.
  assertEquals(stripFrontmatter("---\nfile: a.md\nvisibility: public\nstatus: empty\n---\n"), "");
});

Deno.test("a file with no frontmatter is untouched", () => {
  assertEquals(stripFrontmatter("Just prose.\n"), "Just prose.");
});

Deno.test("a --- rule inside the body is not mistaken for frontmatter", () => {
  assertEquals(stripFrontmatter("Intro.\n\n---\n\nMore."), "Intro.\n\n---\n\nMore.");
});
