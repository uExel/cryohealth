# HANDOFF — cryohealth — 2026-08-11 20:30 PKT

Session: doctor-sweep-token-audit Model: claude-sonnet-5 Branch: main Goal: none Task: none

## State

Not task work — a `/doctor` maintenance sweep plus a token-exhaustion investigation the
user asked for mid-run. Both are done and committed (this repo's piece of it; three
sibling repos also got commits, see below).

Token investigation: pulled real `usage` data (not byte proxies) from the 18 most recent
transcripts across all projects. Verdict: the uexel-harness pipeline (graphify CLI,
`uexel:*` skills, hooks) is cheap — ~6.5k tokens/session of real hook text, ~3k tokens of
CLAUDE.md, graphify queries avg 1.4KB. The actual driver is `cache_read_input_tokens`
(hundreds of millions in the heaviest sessions) from long sessions re-billing their
accumulated context every turn — concretely, screenshots taken for visual QA (Playwright/
browser automation) get `Read` into context early in a session and then ride along,
re-billed, for every remaining turn. One session's `cache_read` grew 14x (30,908 →
420,000+ tokens/turn) over ~560 turns after ~13 QA screenshots were read in, then hit a
forced-compaction event costing ~405k fresh tokens to rebuild. Also checked whether the
graphify `PreToolUse` hook was over-firing (it appeared to fire on every Bash call this
session) — verified against source (`graphify/cli.py:_run_hook_guard`) and this session's
own transcript that it correctly filters on search-token content
(`grep`/`find`/`rg`/`fd`/`ack`/`ag`) and only looked unconditional because my own
diagnostic commands kept including `grep`/`find`. No hook fix was needed or applied.

Doctor sweep, applied after user confirmation (two separate AskUserQuestion gates — one
for the checked-in-file/plugin cleanup, one for the permission-mode change):

- Disabled 2 unused plugins (0 lifetime invocations, no transcript corroboration):
  `typescript-lsp@claude-plugins-official` → `false` in this repo's
  `.claude/settings.local.json`; `frontend-design@claude-plugins-official` → `false` in
  `~/.claude/settings.json` (user scope, where it was enabled).
- Cut a duplicate section from `cryohealth/CLAUDE.md` ("Working here" restated the
  workspace-root file's "Cross-repo conventions", both load together every session here).
- Migrated per-repo dev/test/lint commands out of the workspace-root `cryo/CLAUDE.md`
  (loads in all 4 repos regardless of which is active) into each repo's own `CLAUDE.md`
  as a new `## Commands` section — done in all 4 repos: `cryohealth`, `CryoHealth-api`,
  `CryoHealth-geo`, `CryoHealth-app`. The root file now just points to them.
- Set `permissions.defaultMode: "auto"` in `~/.claude/settings.json` (was unset at every
  scope; nothing overrides it).
- Check 9 (pre-approving frequently-denied commands): scanned 19 denials, found nothing
  eligible — every read-only-looking one was either a one-off with no reuse value or
  touched `.env`. No rules added.

A per-repo prettier/markdown formatter hook ran after each `CLAUDE.md` edit and
normalized style (blank lines after headers, `*em*` → `_em_`) — cosmetic only.

The `cryo/CLAUDE.md` (workspace-root) edit is **not under version control** — no
top-level `.git` in this multi-repo workspace, so it can't be committed; it's just sitting
on disk as intended.

## Done this session

- `cryohealth` repo: commit `d19225c` — CLAUDE.md: moved `## Commands` section in,
  dropped duplicate "Working here" block
- `CryoHealth-api` repo: commit `8f456bb` — CLAUDE.md: added `## Commands` section
- `CryoHealth-geo` repo: commit `4b02837` — CLAUDE.md: added `## Commands` section
- `CryoHealth-app` repo: commit `cb9f22d` — CLAUDE.md: added `## Commands` section
- Disabled `typescript-lsp` (local scope) and `frontend-design` (user scope) plugins
- Set `permissions.defaultMode: "auto"` in `~/.claude/settings.json`

## Not done / deferred

- None of the 4 commits were pushed — no push requested
- `CryoHealth-api` has pre-existing unrelated pending changes (`package.json`,
  `cases.controller.ts`, `configuration.ts`, a migration file, untracked
  `scripts/seed-dev-data.ts`) — left untouched, not part of this session's work, not
  mine to commit
- `cryohealth`'s own pending `.gitignore` change and untracked `graphify-out/` cache
  files — pre-existing, left untouched

## Next action

Resume actual product work: `/uexel:orient` then `gh issue list` to pick the next task
under goal #3 (tasks #7–#19 were still open as of the last task-work session).

## Open questions for a human

- Push the 4 CLAUDE.md commits (this repo + 3 siblings) now, or hold? Not blocking.

## Failed approaches (do not retry)

- None this session. (Note for future token-cost sessions: don't infer image/context
  cost from base64 byte length — convert via the resolution-based formula or read actual
  `usage.cache_read_input_tokens` from the transcript; byte-length overstates hook-text
  cost and can't be trusted for image cost either way.)

## Loops run

- None (no build/verify loop this session — maintenance/doctor work only)

## Files touched

`cryohealth/CLAUDE.md`, `CryoHealth-api/CLAUDE.md`, `CryoHealth-geo/CLAUDE.md`,
`CryoHealth-app/CLAUDE.md` (all committed in their own repos). `cryo/CLAUDE.md`
(workspace root, uncommitted — no git repo there). `~/.claude/settings.json`,
`cryohealth/.claude/settings.local.json` (plugin/permission config, not part of any git
repo diff relevant here).

## Verification status

tests: n/a (docs/config only, no code changed) review: n/a qa: n/a — diffs were shown to
the user directly (`git diff` per repo) before commit, not run through `/uexel:verify`

## Resume with

/uexel:orient (then: `gh issue list` and `/uexel:plan <issue-number>` for the next
task under goal #3)
