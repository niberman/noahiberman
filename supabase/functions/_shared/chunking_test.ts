// deno test supabase/functions/_shared/chunking_test.ts
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { chunkText, CHUNK_SIZE } from "./chunking.ts";

Deno.test("a heading starts a new chunk", () => {
  const chunks = chunkText("## One\n\nFirst.\n\n## Two\n\nSecond.");
  assertEquals(chunks.length, 2);
  assertStringIncludes(chunks[0].content, "First.");
  assertStringIncludes(chunks[1].content, "Second.");
});

Deno.test("a marked section tiers its own chunks, and only its own", () => {
  const chunks = chunkText(
    [
      "## Education",
      "",
      "BA Applied Computing.",
      "",
      "### Hours snapshot <!-- private -->",
      "",
      "1234.5 total, 999.9 PIC.",
      "",
      "### Certificates",
      "",
      "Commercial Pilot, ASEL.",
    ].join("\n"),
  );
  assertEquals(chunks.map((c) => c.tier), [null, "private", null]);
});

Deno.test("the marker is stripped before the text is embedded", () => {
  const [chunk] = chunkText("## Internal figures <!-- private -->\n\n42 runs.");
  assertEquals(chunk.content, "## Internal figures\n\n42 runs.");
});

Deno.test("overlap never carries text across a tier boundary", () => {
  // The property the whole tiering rests on. A private section long enough to
  // overflow is followed by a public one; the public chunk must not open with
  // the tail of the private text the way a mid-section chunk does.
  const secret = "SNAPSHOT-SENTINEL ".repeat(Math.ceil(CHUNK_SIZE / 15) + 20);
  const chunks = chunkText(
    `## Hours <!-- private -->\n\n${secret}\n\n## Certificates\n\nCommercial Pilot, ASEL.`,
  );
  for (const chunk of chunks) {
    if (chunk.tier === "private") continue;
    assertEquals(
      chunk.content.includes("SNAPSHOT-SENTINEL"),
      false,
      `public chunk leaked private text: ${chunk.content.slice(0, 120)}`,
    );
  }
  // And the private section really did overflow, so the case was exercised.
  assertEquals(chunks.filter((c) => c.tier === "private").length > 1, true);
});

Deno.test("overlap still applies within one section", () => {
  const body = "word ".repeat(Math.ceil(CHUNK_SIZE / 5) + 20);
  const chunks = chunkText(`## One\n\n${body}\n\n${body}`);
  assertEquals(chunks.length > 1, true);
  assertEquals(chunks.every((c) => c.tier === null), true);
});
