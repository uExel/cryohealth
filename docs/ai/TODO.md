# TODO

Working checklist for the active plan. Kept current by /uexel:build.
Plan: docs/ai/PLAN.md · Task: #11 · Goal: #3

- [x] Step 0 — pre-flight: tsc+lint baseline green, dev stack up (port 8081 this
      session, not #10's 8080/3000), psql row counts matched (lakes=6, alerts=4 with
      3 carrying a lakeId, districts=2, audit=54), all 6 lake rows snapshotted to
      `docs/ai/planning/snapshots/task-11-lakes-preflight.txt` for the Step 6
      diff-back, tokens obtained for admin-001/facility-001/chw-001 (`accessToken`
      field, not `token` — corrected from the plan's assumption).
- [x] Step 1 — `lakeCreateSchema`/`lakeUpdateSchema` in `src/lib/admin-schemas.ts`
      (`0bfac9e`). `.strict()`, `.coerce` scoped to `area_km2` only,
      `district_id`/`slug`/`source` required on create,
      `lakeUpdateSchema = lakeCreateSchema.omit({slug:true}).partial()`. Scratch-script
      verified: currentTier/current_risk_score/slug all 400 `unrecognized_keys` on
      update; a full create payload parses; the exact edit-form submission shape
      (area_km2 as the numeric-as-string postgres.js returns) parses.
- [x] Step 2 — `createLake`/`updateLake`/`deleteLake` + `LAKE_WRITABLE_COLUMNS` in
      `src/lib/queries.ts` (`34bc579`). `InvalidDistrictError` added — a bad
      `district_id` is checked explicitly before the INSERT/UPDATE rather than left to
      surface as an unhandled NOT NULL violation on the derived `district` column.
      `updateLake` filters the parsed patch through the writable-column allowlist
      (GATE 1 layer 2) and derives `district` server-side from `district_id` (GATE 2).
      `geom` built via a conditional `ST_SetSRID(ST_MakePoint(...))` fragment with
      `updatedAt` injected so the scalar SET clause is never empty — Parse-verified
      _and_ execute-verified live against badswat inside rolled-back transactions (5
      shapes: scalar-only, scalar+coords, coords-only, empty-patch-would-fail,
      mixed-case column quoting). `deleteLake` guards all 5 dependent tables.
- [x] Step 3 — `api/admin/lakes.ts` (POST) + `api/admin/lakes.$lakeId.ts`
      (PUT/DELETE) (`0d2dbcc`). Net-new files per the plan's Headline (the DoD's named
      "sibling file" is `api/public/lakes-admin.ts`, the deliberately-unauthenticated
      namespace — left untouched). 23505 branches on `err.constraint_name` (`slug` vs
      `icimodId` — lakes' first two-unique-constraint resource). Full live matrix
      verified: field-lock 400s on currentTier/current_risk_score/combined-with-name
      (name left unapplied, audit unchanged — rollback proof), 401/403/400-empty/
      400-malformed-JSON/400-bad-UUID/404 matrix, 200 update as facility_admin
      (numeric-as-string area_km2 round trip) with correct audit diff, 400 on bad
      district_id, 409 delete on shishper (2 alerts, read-only check), 403/400-
      whitespace-reason/200-delete + audit row against a psql-inserted throwaway lake
      (POST not yet built). shishper's test-mutated area_km2 reverted to null before
      the commit.
- [x] Step 4 — edit Dialog on `admin.lakes.$lakeId.tsx` (`b6a8904`). New shared
      `src/components/cryohealth/LakeFormDialog.tsx` (reused by Step 5's create
      dialog). Locked fields (tier, risk score) render as plain JSX off the fetched
      lake, never through `useForm`/`FormField` — GATE 1 layer 0. `useForm` resolves
      against `lakeCreateSchema.partial({slug:true})` in both create/edit modes
      (a ternary between two structurally different zod schemas didn't reconcile into
      one stable react-hook-form generic without a large detour — documented in the
      component's comments). `slug` present in `defaultValues` only in create mode.
      Extended `LakeRow` type with fields the form needs (`getLakeDetail` already
      returns them via `l.*`, no query change). Browser QA gap: gstack `/browse`'s
      Playwright has no browser binaries installed in this sandbox (confirmed via
      `npx playwright --version` + missing `~/.cache/ms-playwright`), same disclosed
      gap as #6-#10. Substituted: SSR 200 check post-change, plus a live PUT of the
      exact 14-key field set the dialog's `defaultValues` would submit (unchanged
      values, against shishper) — 200, all fields round-tripped, locked
      fields/slug byte-identical, audit row present with the expected empty diff.
- [x] Step 5 — Actions column, create Dialog, delete AlertDialog on
      `admin.lakes.index.tsx` (`0e68841`). colSpan 6→7. Reuses `LakeFormDialog` in
      create mode. Live-verified: created a lake with all 5 NOT-NULL-no-default
      columns (name/valley/district_id/source/slug) + geom, confirmed `district` text
      correctly derived ("Ghizer"), deleted it (200, audit row), re-confirmed the 409
      guard still fires on shishper. Final audit dump: `lake.create`/`lake.update`/
      `lake.delete` all present, `reason` populated only on deletes.
- [x] Step 6 — cleanup: `graphify update .` done, full DoD verification command
      (`bunx tsc --noEmit && bun run lint && bun run build`) clean, all 6 seeded lake
      rows diffed byte-identical against the Step 0 snapshot (only `updatedAt`
      differs, from legitimate test writes to shishper — every other column matches
      exactly), row counts back to baseline (lakes=6, alerts-with-lakeId=3).

## Not yet run

- `/uexel:verify` — next action.
