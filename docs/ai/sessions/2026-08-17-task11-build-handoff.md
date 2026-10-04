# HANDOFF — cryohealth — 2026-08-17 PKT

Session: task11-build Model: claude-sonnet-5 Branch: main Goal: #3 Task: #11

## State

Task #11 (CRUD: Lakes, tier/risk-score columns locked) is **built, not yet verified**.
All 6 plan steps + cleanup landed, each with tsc/lint(/build) green and live
curl/psql verification against the running dev stack (port 8081 this session, not
#10's 8080/3000). `docs/ai/TODO.md` has the full per-step narrative.
`/uexel:verify` was launched (uexel-verifier agent, full prompt already composed
covering the DoD, both GATE decisions, and 12 specific spot-checks including the
geom argument-order risk and the LakeFormDialog type-safety trade-off) but the
launch was interrupted by the user before the agent ran — **no verifier output
exists yet**. This is the very next action.

## Done this session

- `/uexel:build`: 6 steps, commits `0bfac9e`→`0e68841`, cleanup `666ac2a`.
  - Step 1 (`0bfac9e`): `lakeCreateSchema`/`lakeUpdateSchema` in `admin-schemas.ts`.
    `.strict()`, `.coerce` scoped to `area_km2` only, `district_id`/`slug`/`source`
    required on create. Scratch-script verified the field lock (400
    `unrecognized_keys` on `currentTier`/`current_risk_score`/`slug`) and the
    edit-form submission shape parses.
  - Step 2 (`34bc579`): `createLake`/`updateLake`/`deleteLake` +
    `LAKE_WRITABLE_COLUMNS` in `queries.ts`. New `InvalidDistrictError` (400 instead
    of an unhandled NOT NULL violation on the derived `district` column when
    `district_id` is bad). `geom` built via a conditional
    `ST_SetSRID(ST_MakePoint(lng,lat),4326)` fragment — Parse- _and_
    execute-verified live in rolled-back transactions against badswat (5 shapes).
  - Step 3 (`0d2dbcc`): `api/admin/lakes.ts` (POST) + `lakes.$lakeId.ts`
    (PUT/DELETE), net-new (the DoD's named "sibling file",
    `api/public/lakes-admin.ts`, stays untouched — it's the deliberately-ungated
    namespace). 23505 branches on `err.constraint_name` (lakes has two unique
    constraints: `slug`, `icimodId`). Full live matrix run: field-lock 400s
    (name-left-unapplied + audit-unchanged rollback proof), full role/error matrix,
    200 update as facility_admin, 400 on bad `district_id`, 409 delete on shishper
    (2 alerts, read-only check), 200 delete against a psql-inserted throwaway row.
  - Step 4 (`b6a8904`): edit Dialog on `admin.lakes.$lakeId.tsx`. New shared
    `src/components/cryohealth/LakeFormDialog.tsx`. Locked fields render as plain
    JSX off the fetched lake, never through `useForm` (GATE 1 layer 0 — the exact
    failure shape as #10's finding F1, from a different cause). Notable deviation:
    `useForm` resolves against `lakeCreateSchema.partial({slug:true})` in **both**
    modes rather than branching the resolver on `initial` — a ternary between two
    structurally different zod schemas didn't reconcile into one stable
    react-hook-form generic; documented inline, and `onSubmit` casts to
    `LakeCreate` at the one call site. Browser QA gap: Playwright has no browser
    binaries installed in this sandbox (confirmed, same as #6-#10's disclosed gap).
    Substituted an SSR-200 check plus a live PUT of the dialog's exact 14-key
    submission shape.
  - Step 5 (`0e68841`): Actions column, create Dialog, delete AlertDialog on
    `admin.lakes.index.tsx`, reusing `LakeFormDialog` in create mode. Live-verified
    full create→delete round trip (all 5 NOT-NULL-no-default columns, `district`
    text correctly derived from `district_id`), re-confirmed shishper's 409 guard.
  - Cleanup (`666ac2a`): `graphify update .`, `docs/ai/TODO.md` full narrative, DoD
    command clean, all 6 seeded lake rows diffed byte-identical against the Step 0
    snapshot (only `updatedAt` differs, from legitimate test writes to shishper).
- `/uexel:handoff` (this file): archived the prior planning-session handoff to
  `docs/ai/sessions/2026-08-16-task11-plan-handoff.md`.

## Not done / deferred

- **`/uexel:verify` has not run.** Launched once, interrupted before the agent
  executed — treat as not-started, not as a failed/incomplete run.
- Not pushed to `origin/main` this session — last push was the planning commits
  (`eb9df80`), confirmed via `git push origin main` earlier in the session; the 6
  build commits since then are local-only. No push requested for the build commits.
- Browser QA — not attempted beyond an SSR fetch, same disclosed/accepted gap as
  #6-#10 (Playwright has no browser binaries installed in this sandbox).

## Next action

`/uexel:verify` — relaunch the uexel-verifier agent against `git diff eb9df80..HEAD
-- src/`, issue #11's DoD and verification command, `code-review.md` +
`api-design.md` rubrics. See the interrupted launch's prompt in this session's
transcript for the full spot-check list (field-lock rejection with psql
before/after, LakeFormDialog's `defaultValues` never leaking locked keys,
`LAKE_WRITABLE_COLUMNS` actually being applied, geom argument order
`ST_MakePoint(lng,lat)`, all 5 delete-guard tables with correct column names,
`InvalidDistrictError` on bad FK, both unique-constraint 23505 branches, full role
matrix, audit trail including no-audit-row-on-rejection, and the LakeFormDialog
type-cast trade-off) — reconstruct it if the transcript isn't available; it's not
saved to a file anywhere else.

## Open questions for a human

- Push the build commits (`0bfac9e`..`666ac2a`) to `origin/main` now, or hold until
  verify passes? Not blocking `/uexel:verify` itself.

## Failed approaches (do not retry)

- **`useForm<LakeCreate>({ resolver: zodResolver(initial ? schemaA : schemaB) })`
  does not type-check**, even with `as Resolver<LakeCreate>` or
  `as unknown as Resolver<LakeCreate, unknown, LakeCreate>` casts on the resolver
  value alone — react-hook-form 7.73.1's `Control`/`FormField` generics propagate
  the _ternary's_ inferred type all the way through, not just the annotated
  `resolver` field, so the cast doesn't stop errors on every downstream
  `<FormField control={form.control}>`. Fix that worked: use ONE stable schema for
  both modes (`lakeCreateSchema.partial({slug:true})`), leave `useForm()`
  ungenericized so it infers cleanly, and cast only at the `handleSubmit` callback
  boundary (`(values) => onSubmit(values as LakeCreate)`). See
  `src/components/cryohealth/LakeFormDialog.tsx`'s comments.
- `admin-001`/`facility-001`/`chw-001` login response field is `accessToken`, not
  `token` — a first attempt at scripting token retrieval silently got empty tokens
  from `.token` before this was caught.
- Connecting to the dev Postgres via `import { getDb } from "@/lib/db"` inside a
  plain `tsx` scratch script crashes the whole Node process
  (`ERR_UNSUPPORTED_ESM_URL_SCHEME` on `cloudflare:workers`, uncatchable by a
  try/catch around the dynamic import) — `db.ts`'s Hyperdrive-vs-local-env fallback
  only works correctly under Vite's loader (`bun dev`), not under `tsx` directly.
  Fix: connect with a raw `postgres()` client constructed with the same
  `DB_HOST`/`DB_PORT`/etc. values, bypassing `db.ts`, for any scratch-script DB
  probing.
- Carried forward from #10: gstack `/browse`'s Playwright has no browser binaries
  installed in this sandbox; `pkill -f "vite dev"` as a cleanup step kills any
  matching dev server, not just one you started — just restart with `bun dev`.

## Loops run

- None yet — no verify pass has completed for task #11.

## Files touched

`src/lib/admin-schemas.ts`, `src/lib/queries.ts`,
`src/routes/api/admin/lakes.ts` (new), `src/routes/api/admin/lakes.$lakeId.ts` (new),
`src/components/cryohealth/LakeFormDialog.tsx` (new),
`src/routes/admin.lakes.$lakeId.tsx`, `src/routes/admin.lakes.index.tsx`,
`src/routeTree.gen.ts` (auto-generated). Docs: `docs/ai/PLAN.md`,
`docs/ai/TODO.md`, `docs/ai/planning/task-11-findings.md`,
`docs/ai/planning/snapshots/task-11-lakes-preflight.txt`, this file.

## Verification status

tests: n/a (no test script in this repo) review: **not yet run** — `/uexel:verify`
is the next action qa: browser QA skipped (Playwright has no browser binaries in
this sandbox); curl-level auth/CRUD/transaction/delete-guard checks pass live for
every build step, done by the building session itself (not yet independently
re-checked by a verifier)

## Resume with

/uexel:orient (then: `/uexel:verify` against `git diff eb9df80..HEAD -- src/`)
