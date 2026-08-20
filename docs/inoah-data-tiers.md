# iNoah data tiers

One corpus, one public-facing assistant, and a boundary that lives in Postgres. This file is the
reference for what each tier means, what can never enter the corpus, and how
sources are added and revoked.

## The tiers

Every row in `memories` carries a `visibility`:

| Tier | Who can retrieve it | How rows get here |
| --- | --- | --- |
| `public` | Anyone, through iNoah | Only by a human promoting one row at a time on the dashboard, or a source registered `public` because its content is already on the public site |
| `private` | No assistant. Visible to the owner in the dashboard only | The default for every write path. A failed or missing classification hides data, never exposes it |
| `never` | No assistant, and terminal — excluded from both match RPCs | Manual assignment for material that must not be promotable |

Rules that hold everywhere:

- Visibility is never a caller-supplied parameter. `match_memories_public` has
  its filter written into the SQL body; no request and no future edge function
  edit can widen it.
- `never` is a one-way door. The `guard_visibility` trigger raises on any
  attempt to change it, from the dashboard, a migration, or an agent.
- Promotion is a human action on one row, behind a dialog that requires typing
  the word publish. No LLM decides visibility.
- Only users in `app_owners` can read, update, or delete rows at all. RLS
  treats every other authenticated user as a stranger.

## The medical cutoff

By owner directive, content touching medical or related personal records is
off limits for the entire corpus, every tier, every source. Enforcement is
layered:

1. `supabase/functions/_shared/content_policy.ts` filters it out of every
   ingestion path (`inoah-embed`, `inoah-ingest`, `inoah-sync-drive`).
2. The `guard_medical_content` trigger on `memories` silently drops any row
   that slips past a filter, including direct service-role writes from code
   that does not exist yet.
3. The public persona declines health-adjacent questions in one sentence
   without acknowledging whether any such information exists.

Keep the trigger pattern and the shared filter aligned when either changes.

## Sources

`ingest_sources` is an allowlist. Anything not registered there is not synced,
and the registered row's `default_visibility` is forced onto every chunk it
produces; request bodies that try to set visibility are rejected.

| Kind | What it is | Tier |
| --- | --- | --- |
| `drive_folder` | A Google Drive folder shared read-only with the sync service account | `private`, always |
| `site_table` | A public table already rendered on noahiberman.com | `public` |
| `repo_file` | `docs/public-profile.md`, ingested by script with its Never publish section stripped | `public` |

### Tiering a section rather than a whole file

A file is often the wrong unit: `public-profile.md` is public knowledge and a
never-publish list in one document. A heading may therefore re-declare the tier
of its own section, using the frontmatter vocabulary in an HTML comment:

```markdown
## Certificates and ratings
## Hours snapshot <!-- private -->
## Credentials dump <!-- secret -->
```

The marker counts only at the end of a heading line, so prose cannot vote, and
it is stripped before the text is embedded. A section that declares nothing
inherits the file's tier. `secret`/`config` drop the section the way they drop
a file. Because chunk overlap is never applied across a heading, a private
section cannot bleed its tail into the public chunk that follows it
(`_shared/chunking_test.ts` holds that property).

Mixed sections need a subheading, not a marker on the parent: marking
`## Aviation` private would hide the certificate list along with the hours.

### Adding a Drive source

1. Share the folder, read-only, with the sync service account
   (`inoah-drive-sync@...iam.gserviceaccount.com`). Share specific folders,
   never the whole Drive.
2. Insert the row:
   `insert into ingest_sources (kind, external_id, label) values ('drive_folder', '<folderId>', '<label>');`
   The private default is deliberate; do not override it for Drive content.
3. The next hourly sync picks it up. Chunks land private, appear in the
   dashboard review queue, and get promoted individually if ever.

### Revoking a source

Set `enabled = false` on its row (or delete the row), then delete its chunks:
`delete from memories where metadata->>'sync_origin' = 'drive_folder:<folderId>';`
Unsharing the folder in Drive also works as a hard stop for future syncs, but
does not remove already-ingested chunks by itself.

## Sync mechanics

`inoah-sync-drive` runs hourly from pg_cron, gated by a bearer read from
Vault. It is idempotent: unchanged content hashes skip both the embedding call
and the write, and the Drive changes token skips the whole Drive pass when
nothing changed. Deletion is scoped by the `sync_origin` marker each sync
writes into `metadata`, so a sync can only ever delete rows it owns.

## The persona

iNoah's system prompt lives in `inoah_settings.system_prompt`,
built from `docs/public-profile.md`. That file stays out of version control
(gitignored; the repo is public) and is the single source of truth for what
iNoah may claim. The three standing rules from it: unresolved facts
get a plain not settled answer, the do-not-claim list is refused outright, and
customers are never identified beyond what the public site already names.
