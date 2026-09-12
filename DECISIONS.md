# Decisions, iNoah upgrade, 2026-09-11

Every call that the brief left open, and why it went the way it did. The brief's preamble
exceptions apply throughout: this edits the live noahiberman.com and Supabase project
`yvblwphbfekmmpoxowjr`, there is no hourly reset, and the data is Noah's real public context.

## Scope and template conflicts

- **No demo banner.** The template banner reads "Demo. Fictional data. Resets hourly." Under the
  preamble exceptions two of its three claims are false here, so shipping it would lie to
  visitors. The disclosure line ("You are talking to iNoah, an AI built by Noah. It answers from
  his public notes.") carries the transparency duty instead, permanently pinned above the
  transcript, spoken aloud, and logged.
- **No new Vercel project and no reset job.** Deployed to the existing noahiberman.com project on
  the named team. The recurring job in this system is the corpus sync, `inoah-drive-sync-hourly`
  at `17 * * * *`, which refreshes `public.memories` from Drive.
- **`public-answers.md` re-created despite CONTEXT.md's retired list.** CONTEXT.md itself rules
  that Noah's session instruction outranks the file, and this brief orders the file rebuilt.
  CONTEXT.md was updated through its own replace procedure: the file table now lists
  `public-answers.md` and the retired list records the un-retirement with the date.
- **Production database on purpose.** The fail-the-build-on-production-connection rule from the
  template is inverted by the exceptions: the corpus, events log, and chat all live in the real
  project, because iNoah answering with Noah's real public context is the product.

## Corpus

- **Shape.** Forty sections, one `###` heading per question ending in `?`, answer paragraphs
  under it, then the source as an HTML comment. The chunker never packs across headings, so each
  Q&A lands as exactly one public chunk, the chips RPC reads the headings, and the comment
  travels inside the chunk as the hidden source field. Every section stays under the 1000
  character chunk size.
- **Order is curation.** The first eighteen questions are the chip pool, so the file's opening
  order is the visitor-facing menu.
- **Answers teach the refusals.** The corpus includes "How many flight hours do you have?" and
  "Do you have revenue or customers?" so retrieval itself reinforces the no-hours and no-figures
  behavior instead of relying on the system prompt alone.
- **Contact answers give email, LinkedIn, GitHub, not the phone number.** The number sits in a
  public source file, but a chat widget repeating it aloud amplifies scraping for no benefit;
  email is the ask-Noah channel everywhere in the UI.
- **Two answers trace to the system itself.** "What is iNoah?" and "What should I ask iNoah?"
  describe the assistant per the site disclosure; contact facts in them trace to noah.md. Every
  other answer traces to a line in noah.md or aviari.md, named in its hidden comment.
- **One copy.** The corpus lives in Drive only, per CONTEXT.md's filing rules. The repo holds the
  pipeline, not the content.

## Backend

- **Decline is deterministic.** When retrieval clears nothing above the match threshold (0.6,
  editable in `inoah_settings`), the model is never called, so it cannot invent. The reply is a
  fixed on-voice line plus the two nearest answerable questions, found by re-using the prompt
  embedding with the threshold floored, so the suggestions are semantically close rather than
  random.
- **Greeting shortcut.** A tiny regex answers bare greetings ("hi", "hola", "thanks") with a
  canned line, because "I do not have that on file" in reply to "hi" reads as broken. Anything
  beyond a greeting goes through retrieval.
- **Streaming protocol.** SSE with a `meta` event before the first token (answer or decline,
  retrieval confidence), `{"t": ...}` deltas, and a `done` event with the cleaned full text. The
  non-streaming JSON shape survives unchanged for the eval and any old callers.
- **System prompt updated in place.** Rule 3 now permits Smoothie King by name as shipped work
  (built alone, in use, no usage figures), matching aviari.md's 2026-08-19 client-naming rule;
  every other hard rule kept. Added: never quote the provenance comments, keep replies speakable
  for text to speech. `updated_at` confirmed moved, no second copy anywhere, per CONTEXT.md.
- **Events table is write-only.** `inoah_events` accepts inserts from anyone (type-constrained,
  size-capped) and is readable by nobody public. The disclosure logger needs nothing more.

## Voice

- **Engine choice at runtime.** `inoah-tts` streams ElevenLabs (`eleven_flash_v2_5`, stock
  narration voice "George", overridable via `ELEVENLABS_VOICE_ID`) when the key exists, and
  reports `browser` otherwise. No ElevenLabs key is configured today, so the live engine is
  SpeechSynthesis; adding the secret in Supabase upgrades every visitor on their next page load.
- **700ms budget by segmentation.** Replies are cut at the first sentence break past 20
  characters (or a comma past 90, since Noah chains clauses with commas) and each segment is
  spoken while later text still streams. With the browser engine the first segment speaks the
  moment it is cut; with ElevenLabs the flash model's latency fits the same budget.
- **Waveform honesty.** ElevenLabs playback drives the bars with real analyser levels. The
  SpeechSynthesis API exposes no audio data, so those bars move on a smoothed pseudo-random walk
  while speech is active, a visualization of voice state rather than a fake spectrogram. Reduced
  motion gets static bars.
- **Stuck-speech guard.** A synthesis engine with voices missing never fires utterance events;
  a four second no-start timeout settles the counter so the speaking indicator cannot wedge on.

## Widget and design

- **Spec visual system, scoped.** The brief's palette, type, radius, grid, and motion timings are
  applied inside `.inoah-surface` (and the launcher) only: #0B0F14 ground, #131A22 surface,
  #4FB3FF accent, Inter UI, JetBrains Mono data, 12px radius, 180ms state and 400ms panel motion,
  reduced-motion variants throughout. The rest of the site keeps its editorial design; a chat
  panel restyling the whole site was neither asked nor wise. `--in-surface-2` (#1B2531) is a
  derived elevation tone the spec did not enumerate.
- **Radix Dialog under the panel.** Focus trap, escape, scroll lock, and aria wiring come from
  the primitive already in the bundle. Mobile gets a full-screen sheet sliding from the bottom,
  desktop a 420px side panel from the right, both above the site nav's z-index.
- **Chips rotate by offset.** Pool of eighteen, six shown, the offset advances on every open and
  persists per visitor, plus a "More questions" control. Skeleton chips reserve the exact grid
  space so the pool arriving shifts nothing.
- **Disclosure pinned, not gating.** It renders before the first turn, always stays visible, and
  cannot be dismissed; the composer unlocks 700ms after mount so the line lands first. A blocking
  modal would have punished every return visitor for a rule the pinned ribbon satisfies better.
- **Old chat component deleted.** `InoahChat.tsx` and `inoahClient.ts` were replaced wholesale by
  the surface, the streaming client, and the voice hook.

## Performance

- **/inoah restructured for paint.** The page shell is eager (fixed-size card, zero layout
  shift), the conversation surface lazy-loads inside it, and the markdown renderer lazy-loads
  inside the surface since streaming text renders as plain prose. Lighthouse mobile on
  production: /inoah performance 95, accessibility 100, CLS 0, TBT 30ms. The launcher adds one
  small chunk to every page; the heavy code loads on first open only.
- **Home performance is the Mapbox globe, not the widget.** Production home scores in the 50s
  with multi-second blocking time from the flight-map hero, and scored lower still on the
  previous deployment, so this project did not regress it. Local preview (no Mapbox token)
  scores 91, which is the page without the globe. Fixing home means rethinking the map hero, a
  separate decision outside this brief; the iNoah surface, the screen this project owns, meets
  the 90 and 95 targets on production.

## Evaluation

- **Banned claims fail the build; style warns.** The banned list is compiled from the "Do not
  claim" sections plus the brief's rules (hours, figures, clients, stack names, time-to-ship,
  aviation-SaaS framing, non-ventures, personal records). It gates the Vercel build via
  `buildCommand`. Em dashes, exclamation points, and emojis in model output print as warnings
  only: they are voice rules, not claims, and failing deploys on model punctuation would make the
  pipeline flaky for no safety gain.
- **Negation-aware checks.** "Aviari is actually not an aviation software startup" refutes the
  premise; the first eval run flagged it and the category-level medical refusal as violations, so
  those checks now tolerate explicit denial and prescribed refusal vocabulary. Final run: 30 of
  30 pass, zero style warnings.

## Preview clip

- **Real capture, tightened edit.** Frames come from a CDP screencast of the production build
  (Playwright's recordVideo re-times frames too loosely for choreography). The model's think-time
  between click and first token is shortened in the edit; everything shown is the real widget
  doing the real thing. Headless Chrome ships speech synthesis with zero voices, so a shimmed
  synthesis timeline (about 180 words per minute) drives the same speaking UI a real listener
  gets; the clip carries no audio track, per the brief. Output: 6.0s, 1200x750, 30fps MP4 and
  WebM, poster from the settled-answer frame.
