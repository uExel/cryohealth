# HANDOFF — cryohealth — 2026-09-22 PKT

Session: harness-handoff-hygiene Model: claude-sonnet-5 Branch: main Goal: #3 Task: none (docs hygiene)

## State

Task #11 (Lakes CRUD admin UI) is merged and closed. **Note for the record**: it shipped
without `/uexel:verify` ever completing — the verifier launch was interrupted before
running and never relaunched; treat anything from that diff as builder-verified only, not
independently verified. Working tree has minor uncommitted tooling artifacts
(`graphify-out/cache/last_query_stamp`, untracked `.agents/`, `.codex/`, `AGENTS.md`) —
not reviewed or committed by this pass, left for a human to decide on.

## Done this session

- Archived the previous HANDOFF.md (142 lines) to
  `docs/ai/sessions/2026-08-17-task11-build-handoff.md` and replaced it with this
  template-sized version, per `skills/handoff/SKILL.md` step 1 (`1c47f71`).
- Reset `docs/ai/PLAN.md` (297 lines) and `docs/ai/TODO.md` (74 lines) to a no-active-task
  state now that #11 is closed — both were still "current" and fully re-read by
  `/uexel:orient` every session. Full history preserved in git log (`683ea49` and earlier
  plan commits) and `docs/ai/planning/task-11-findings.md`, nothing lost (`5ad6da4`).

## Not done / deferred

- `/uexel:verify` was never completed for task #11 — carried over, not re-attempted here
- Two open p1 bugs, safety-relevant: **#30** cleared HIGH/CRITICAL alerts still render as
  active to CHWs and on two public pages; **#20** `/lakes/$lakeId` renders the list, not
  the detail page

## Next action

Issue **#30** (p1, safety-relevant): fix cleared HIGH/CRITICAL alerts rendering as active.

## Open questions for a human

- What to do with the uncommitted `.agents/`, `.codex/`, `AGENTS.md` in the working tree —
  commit, gitignore, or discard? Not touched by this pass.
- Push build commits for #11-adjacent work now, or bundle with the next fix? — not
  blocking

## Failed approaches (do not retry)

- `useForm<T>({ resolver: zodResolver(schemaA_or_B) })` with a ternary between two
  differently-shaped zod schemas does not type-check even with casts on the resolver
  alone — react-hook-form's generics propagate the ternary's inferred type through every
  downstream `<FormField>`. Fix: one stable schema for both modes, cast only at the
  `handleSubmit` callback boundary.
- `admin-001`/`facility-001`/`chw-001` login response field is `accessToken`, not `token`
- Connecting to dev Postgres via `@/lib/db` inside a plain `tsx` scratch script crashes
  the process (`ERR_UNSUPPORTED_ESM_URL_SCHEME`) — use a raw `postgres()` client with the
  same env values instead, bypassing `db.ts`
- gstack `/browse`'s Playwright has no browser binaries installed in this sandbox
- `pkill -f "vite dev"` kills any matching dev server, not just one you started

## Loops run

- none (docs hygiene, not a build/verify loop)

## Files touched

docs/ai/HANDOFF.md, docs/ai/PLAN.md, docs/ai/TODO.md,
docs/ai/sessions/2026-08-17-task11-build-handoff.md (new)

## Verification status

Not re-run this pass. Task #11: builder-verified only (curl/psql checks by the building
session), never independently verified — see State.

## Resume with

/uexel:orient (then: issue #30)
