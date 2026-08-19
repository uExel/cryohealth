# HANDOFF — cryohealth — 2026-08-18 PKT

Session: task12-build Model: claude-sonnet-5 Branch: <Shoaib> Goal: alert
lifecycle management Task: #12

## State

Task #12 (CRUD: Alerts — edit/clear/delete, alert-policy reason field) is **built and
manually verified by the user**, not run through `/uexel:verify`. All three route
handlers plus their query-layer functions and the admin UI actions landed in one pass
(no agent build loop — done via chat, not `/uexel:build`). `tsc --noEmit`, `eslint`,
and `vite build` (client bundle) all pass. The user manually tested edit/clear/delete
against a seeded alert in their own dev environment and confirmed it working; no
independent verifier agent has reviewed this yet.

## Done this session

- `src/lib/admin-schemas.ts`: added `alertUpdateSchema` (body/tier/estimated_window,
  `.strict()`), replacing the empty placeholder stub. Reused the existing
  `deleteReasonSchema` for both clear and delete — same `{ reason: string }` shape,
  so a second schema would've just duplicated it.
- `src/lib/queries.ts`: added `updateAlert()`, `clearAlert()`, `deleteAlert()` next to
  the existing `insertAlert()`. `ALERT_WRITABLE_COLUMNS` locks PUT to
  body/body_en/tier/estimated_window only (title/lakeId/districtId/
  affected_population are create-only; status/clearedAt are the clear action's job,
  not a field edit). `clearAlert()`'s UPDATE is scoped to `WHERE status = 'active'`,
  so clearing a missing or already-cleared alert both come back `null` → 404, rather
  than distinguishing the two (avoids leaking state via error text). Every write goes
  through the existing `writeAudit()` inside the same transaction. Also added `a.body`
  to `listAllAlerts`'s SELECT so the edit dialog has something to seed from.
- `src/routes/api/admin/alerts.$alertId.ts` (new): PUT (edit), PATCH (clear — a
  distinct status transition from PUT, not a field edit), DELETE. Mirrors
  `lakes.$lakeId.ts`'s structure exactly — same auth guard
  (`cryohealth_admin`/`facility_admin`), `.strict()` schema validation, `mapDbError`
  usage. 23505 on PUT (the partial unique index on `(lakeId, tier) WHERE status =
active`) maps to a 409 rather than a raw 500 — no pre-check, the DB is the source
  of truth here, same pattern as the lakes route's slug/icimodId 23505 handling.
- `src/routes/admin.alerts.tsx`: added Edit/Clear/Delete action buttons per row. Edit
  opens a form dialog (`AlertEditDialog`) seeded from the row, PUT on submit. Clear
  and Delete share a `AlertReasonDialog` component requiring a non-empty reason before
  the confirm button enables — mirrors `DeleteLakeDialog` in `admin.lakes.index.tsx`.
- Fixed a `listAllAlerts` regression during testing: a stray `e.` alias reference
  (not matching any table in the query's FROM/JOIN — only `a`/`l`/`d` exist) caused a
  live `42P01`/"missing FROM-clause entry" error. Replaced with the corrected
  all-`a.`-prefixed version.
- Fixed a router-scaffold overwrite: the new route file briefly reverted to
  TanStack Router's auto-generated placeholder component (`<div>Hello "..."!</div>`)
  instead of the real `server.handlers` code — happened once during setup, re-pasted
  the real content and it stuck.

## Not done / deferred

- **`/uexel:verify` has not run** — this was built and reviewed conversationally, not
  through the agent build/verify loop. Treat as unverified by an independent agent.
- **No live psql/curl verification was done by me directly** — I don't have DB or
  network access to this project's Postgres instance. `tsc`/`eslint`/`vite build`
  were run against the actual repo zip; the manual edit/clear/delete pass, audit-row
  confirmation, and unique-constraint-holds check were the user's own responsibility
  per the testing checklist provided — confirm these were actually completed, not
  just "it loaded without erroring."
- Constraint name for the `(lakeId, tier) WHERE status = active` unique index was
  never confirmed against the actual schema/migration (owned by CryoHealth-api, not
  this repo) — the 409 handler on PUT uses a generic message rather than branching on
  `constraint_name` the way the lakes route does for its two named constraints. Fine
  functionally, just less specific than it could be.
- Browser/Playwright QA not attempted (consistent with task #11's disclosed gap).
- Not committed/pushed by me — the user is committing manually. Actual commit
  hash(es) for this work: **TBD, fill in below once committed.**

## Next action

Confirm the commit is pushed and CI (`bunx tsc --noEmit && bun run lint && bun run
build` + the HANDOFF.md branch-protection check) is green on the PR. If a
`/uexel:verify` pass is required before merge per this repo's normal process, run it
against `git diff origin/main...HEAD -- src/` with issue #12's DoD.

## Open questions for a human

- Should the generic 409 message on PUT (tier collision) be split out with the real
  constraint name once it's confirmed, matching the lakes route's pattern? Not
  blocking, just a follow-up polish item.

## Failed approaches (do not retry)

- Referencing `e.<column>` (or any alias not declared in a query's own FROM/JOIN) in
  `listAllAlerts` — caused `42P01 missing FROM-clause entry for table "e"` at
  runtime, not at parse time in the editor, so it wasn't caught until the dev server
  actually ran the query. Only `a` (alerts), `l` (lakes), `d` (districts) are valid
  aliases in that function.
- Leaving a freshly-created route file (`alerts.$alertId.ts`) unsaved/half-pasted —
  TanStack Router's dev-mode file watcher scaffolds a placeholder `component:` export
  into new route files under `src/routes/`, which silently overwrote or coexisted
  with the intended `server.handlers` content until the real code was pasted in and
  saved cleanly. Always verify the file's actual on-disk content (not just what was
  intended) if odd `esbuild`/parse errors show up referencing that file after
  creating it.

## Loops run

- None — no `/uexel:build`/`/uexel:verify` loop was used for this task.

## Files touched

`src/lib/admin-schemas.ts`, `src/lib/queries.ts`,
`src/routes/api/admin/alerts.$alertId.ts` (new), `src/routes/admin.alerts.tsx`,
`src/routeTree.gen.ts` (auto-generated). This file.

## Verification status

tests: n/a (no test script in this repo) review: **not yet run** — no
`/uexel:verify` pass; built and checked conversationally instead qa: `tsc --noEmit`,
`eslint`, `vite build` (client bundle) all pass against the repo. Manual
edit/clear/delete pass against a seeded alert confirmed working by the user in their
own dev environment (see this session's testing checklist for what "confirmed" should
have covered — audit rows, unique-constraint check, 404/edge cases — verify these
were actually run, not assumed).

## Resume with

Confirm commit hash(es) above, push, and check CI. If this repo requires an
independent `/uexel:verify` pass before merge, run it against issue #12's DoD before
considering this closed.
