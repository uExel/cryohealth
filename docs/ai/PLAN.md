# PLAN

Goal: [#3 — CryoHealth admin portal — sidebar CRUD + platform monitoring](https://github.com/uExel/cryohealth/issues/3)
Task: [#10 — CRUD: Districts + Glaciers](https://github.com/uExel/cryohealth/issues/10)

Scope: add POST/PUT/DELETE to `districts` and `glaciers`, with create/edit `Dialog`+`Form`
modals on `admin.districts.tsx`/`admin.glaciers.index.tsx` and every write recorded in
`audit`. This is the **first CRUD task** in the admin-portal sequence — #6-#9 only shipped
read-only views. #10 sets the scaffold (auth pattern, zod usage, audit-write shape,
transaction pattern, delete-guard behavior) that every later CRUD task (#11-#16) copies,
so getting it right here matters more than the LOC count suggests.

Full exploration: [`docs/ai/planning/task-10-findings.md`](planning/task-10-findings.md)
(748 lines, written by the uexel-planner agent this session — read it for exact schemas,
live row counts, the HTTP-verb `tsc` blind spot, and the reasoning behind every decision
below).

**Process note:** Skipping the `/uexel:plan` step 3 chain to `gstack /autoplan`, for the
same reason tasks #6-#9's plans did — it would append an unrequested "Skill routing"
section to CLAUDE.md and auto-commit it. Reviewed inline instead, via the planner agent.

## Headline: four net-new capabilities in one task

#10 is this repo's first UPDATE, first DELETE, first zod validation, and first `audit`
write. Every write endpoint that exists today (`api/public/alerts.ts`,
`api/public/cases.ts`, `api/public/alert-acks.ts` — all POST-only) is unvalidated
(`as {...}` cast) and non-audited. Whatever pattern lands here is what #11-#16 inherit
verbatim, so the plan is written to be copy-pasted, not just to pass this task's DoD.

## Assumptions & blast radius

- **`tsc --noEmit` cannot verify HTTP verb dispatch.** A type probe against the installed
  `@tanstack/react-start` types compiled `PUT`/`DELETE`/**a garbage `BOGUS:` key** with
  zero errors — `server.handlers` is loosely typed. The DoD's verification command gives
  no signal that PUT/DELETE actually fire at runtime; only a live `curl -X PUT/-X DELETE`
  against the new route proves it (Step 3). Do not treat green `tsc` as proof of verb
  support.
- **Delete is unguarded at the DB level and this is forced, not a judgment call.** Every
  FK into `districts` (alerts, cases, chw_profiles, glaciers, lakes) is `ON DELETE SET
NULL`; the only FK into `glaciers` (`glacier_observations`) is `ON DELETE CASCADE`.
  Postgres will never refuse a delete. `docs/admin-portal-prd.md:128` classifies
  `glacier_observations` as "View + audit-only — CryoHealth-geo pipeline output" — an
  unguarded glacier delete silently destroys pipeline output the PRD forbids mutating.
  **DELETE must pre-check dependent-row counts inside the same transaction and return 409
  with counts when any exist.**
- **The DoD names the wrong file for the glacier modals.** `admin.glaciers.tsx` is a
  4-line `Outlet` parent (mirror image of #9's "don't turn a leaf route into an Outlet
  parent" — here, don't _use_ the Outlet parent as a page). The real table is
  `admin.glaciers.index.tsx`. Modals and the Actions column go there.
- **zod is not a new dependency to weigh — it's already staged.** `src/lib/admin-schemas.ts`
  (commit `b85dbd6`) already ships `districtSchema`/`glacierSchema` as `.strict()` stubs
  with a header comment reserving them for "#10-#19". `Dialog`/`AlertDialog`/`Form` all
  exist in `src/components/ui/`, fully exported, used by zero app code today. Nothing to
  install; #10 is the first task to actually use all of it.
- **This repo has never written an `audit` row.** `grep -n "audit" src/lib/queries.ts` →
  no matches; the one live row was written by CryoHealth-api. `audit.actorId` FKs to
  `users(id)` with no ON DELETE rule and `entityId` is `varchar`, not `uuid` — pass ids as
  strings. Audit-write must be atomic with the mutation (`sql.begin`, falling back to a
  writeable-CTE single statement per findings §3 if the transaction misbehaves — never
  "mutate, then audit separately").
- **Working tree clean, branch `main`.** Local commits since `60d8a7c` (task #9's full
  build + verify fix-loop + handoff, through `d8c8332`) are not yet pushed to
  `origin/main` — unrelated to this task, noted for whoever pushes next.

## GATE decision 1: what goes in `audit.reason`

The DoD says every write inserts `(actorId, action, entityType, entityId, reason)`, but
`audit.reason` is nullable, and CryoHealth-api only populates it where a human overrides
a machine decision (`alerts.service.ts`'s tier-override calls). A boilerplate
"Created via admin portal" on every create/update row adds noise, not signal.

**Recommendation:** `reason` **required** (free text, `z.string().min(1)`) on **DELETE**
only — destroying reference data five tables point at is exactly the "say why" case.
Create/update leave `reason` NULL and record the substance in `meta` as a field diff
(`meta: { changed: { name: { from, to } } }`), following the `{fromTier,toTree}` precedent
already in `alerts.service.ts`. Whatever's decided here, #11-#16 copy it — say so
explicitly at GATE rather than let it drift task-to-task.

## GATE decision 2: require `source` on hand-created glaciers

`glaciers.source` is nullable in the DB, but the glaciers page header advertises "sourced
from Randolph Glacier Inventory v7 (RGI Consortium, 2023) · GLIMS / NSIDC" — a glacier row
typed into a form with no cited provenance is exactly the failure mode the workspace's
no-fabricated-hazard-data rule exists to prevent, and it would render under a header
claiming RGI v7 provenance.

**Recommendation:** make `source` required in `glacierSchema` (`z.string().min(1)`) with
form helper text asking for the inventory/publication the entry comes from. If rejected,
fallback is a required free-text `notes` field on create instead.

## Settled, not GATE items (named so they don't get re-litigated mid-build)

- **Role gating: `["cryohealth_admin", "facility_admin"]`** for all new write endpoints.
  Four independent sources converge on this (PRD's CRUD matrix, the non-`adminOnly`
  "Hazard data" nav group, #9's identical precedent, PRD's explicit "ship full-dataset
  access for both admin roles first" open-question resolution). Narrowing to
  `cryohealth_admin`-only would make the nav lie to `facility_admin` (same class of
  problem #9 avoided).
- **Route layout:** `api/admin/districts.ts` (POST) + `api/admin/districts.$districtId.ts`
  (PUT/DELETE), mirrored for glaciers. The issue's DoD wording only names `$glacierId.ts`
  for glaciers; symmetry across both resources matters more than literal DoD wording
  since #11-#16 copy this layout.
- **No changes to the public GET endpoints** (`api/public/districts.ts`,
  `api/public/glaciers.ts`, `api/public/glaciers.$glacierId.ts`) or their query functions
  (`listDistricts`, `listGlaciers`, `getGlacier`) — they stay ungated and byte-identical,
  serving the public hazard map and `data.tsx`.
- **No migration, ever, in this repo** — `districts`/`glaciers` need no schema change;
  everything the forms need already exists as nullable columns.
- **Edit/delete affordances live on the list pages only** — `admin.glaciers.$glacierId.tsx`
  (the read-only detail page from #7) gets no Edit button in #10; that's a nice-to-have
  deferred, not invented mid-build.

## Sizing note

`size:m` may be optimistic: 6 new write functions + 1 audit helper, 2 zod schemas, 4 new
route files, 2 dialog components, 2 confirm-delete components, 2 page rewires — plus the
repo's first transaction, first modal, first zod usage, first PUT, first DELETE. **Cut
line, pre-authorized:** ship districts end-to-end first (Steps 1-4) as the proven
template; if the loop budget is under pressure after districts lands green, glaciers
(Steps 5-7) becomes a same-priority follow-up issue, not a failed task.

## Plan steps

### Step 0 — pre-flight (no commit)

`bunx tsc --noEmit && bun run lint` baseline green; confirm dev stack up
(`docker ps | grep cryohealth-api-db-1`); `psql` row-count snapshot (`districts` d=2,
`glaciers` g=6, `audit` a=1, `glacier_observations` go=0 expected); `bun dev`, log in as
`admin-001`/`1234` (`cryohealth_admin`), `facility-001`/`1234`, `chw-001`/`1234` for the
role-matrix checks in Step 3. Do **not** probe verb dispatch here — no route declares
PUT/DELETE yet, so any result would be a non-signal.
Verify: baseline `tsc`/`lint` pass; tokens obtained; row counts match expectation.

### Step 1 — fill `districtSchema` + `glacierSchema` in `src/lib/admin-schemas.ts`

Replace the `.strict()` stubs with real shapes (create + `.partial()` update variants).
`glacierSchema.status = z.enum(["stable","retreating","advancing","surging","unknown"])`
(matches `StatusPill`'s assumed five values exactly). `lat`/`lng` required, range-bounded.
`source` required per GATE decision 2. No `@/lib/db`/`@/lib/queries` import (client-bundle
poison risk).
Verify: `bunx tsc --noEmit && bun run lint`.

### Step 2 — `writeAudit(sql, {...})` helper + the three district write functions

One commit: `writeAudit` alone has no runnable verification (takes an existing `sql`
handle by design, not meant to be called standalone), so ship it with its first callers.
`createDistrict`/`updateDistrict`/`deleteDistrict` in `queries.ts`, each `sql.begin(...)`-
wrapped around the mutation + its `writeAudit` call, `RETURNING id` feeding `entityId`.
`deleteDistrict` runs the 5-table dependent-count query (alerts/cases/chw_profiles/
glaciers/lakes where `district_id = $1`) inside the same transaction before the DELETE,
throwing a typed `HasDependentsError` carrying counts on any nonzero result. Catch
Postgres `23505` (unique violation on `districts.name`) → human-readable 409, mirroring
CryoHealth-api's existing constant/pattern.
Verify: `bunx tsc --noEmit && bun run lint`. (Behavioral proof — rows landing correctly,
atomicity holding — lands in Step 3's live checks, not here.)

### Step 3 — `api/admin/districts.ts` (POST) + `api/admin/districts.$districtId.ts` (PUT/DELETE)

`requireAuth` → `requireRole(["cryohealth_admin","facility_admin"])` → `schema.safeParse`
→ 400 on failure → query fn → `Response.json`. This step discharges the verb-dispatch
risk named in Assumptions — it's the first route in the repo declaring `PUT:`/`DELETE:`.
Verify: `bunx tsc --noEmit && bun run lint && bun run build`, then live against `bun dev`
with Step-0 tokens — full role matrix (401 no token, 403 chw, 200 admin/facility_admin),
zod 400 on empty `name`, 409 on duplicate name, PUT actually updates (proves PUT
dispatch), DELETE on a throwaway no-dependents district succeeds (proves DELETE
dispatch), DELETE on a seeded district-with-dependents returns 409 with counts, plus
`psql` confirmation of the `audit` rows (present for the successful ops, **absent** for
the 409'd delete — proving the transaction actually rolled back cleanly).

### Step 4 — `admin.districts.tsx`: Actions column, create/edit Dialog+Form, delete AlertDialog

`colSpan` 2→3. Writes via `authFetch` (existing GET stays bare `fetch` — ungated, no
churn). `queryClient.invalidateQueries({queryKey:["admin-districts"]})` on every mutation
(shared key with the glaciers page's district dropdown). `toast.success`/`toast.error`
via the already-mounted `<Toaster>` — no new feedback mechanism. Error banner reuses the
existing `--color-watch` styling; never `--color-critical`/red.
Verify: `bun run build`; manual create/edit/delete round-trip in the browser, reload to
confirm persistence, `psql` to confirm the matching `audit` row.

### Steps 5-7 — the same three steps for glaciers

Query functions (`createGlacier`/`updateGlacier`/`deleteGlacier`, dependent-count check
against `glacier_observations`) → `api/admin/glaciers.ts` + `glaciers.$glacierId.ts` →
Actions column + modals on `admin.glaciers.index.tsx` (**not** `admin.glaciers.tsx`).
`colSpan` 8→9. Invalidate `["admin-glaciers"]`. Since `glacier_observations` has 0 live
rows today, insert one throwaway row via `psql` before testing the delete-guard branch,
or the 409 path ships unverified.
Verify: same three-tier pattern as Steps 1-4 (types → build → live role-matrix + CRUD
round-trip + audit-row confirmation), split across however many commits districts needed
(cut line per Sizing note if budget is tight).

### Step 8 — cleanup

`graphify update .`. Full DoD verification command:
`bunx tsc --noEmit && bun run lint && bun run build`, plus manual create/edit/delete on
both resources with reload persistence, plus a final `psql` audit-table dump confirming
`district.create`/`district.update`/`district.delete`/`glacier.create`/`glacier.update`/
`glacier.delete` all appear with correct `entityType`/`entityId`.

## Verification command (from the issue)

`bunx tsc --noEmit && bun run lint && bun run build` + manual: create/edit/delete a
district and a glacier, confirm persistence on reload and a corresponding `audit` row.

## Loop budget

3 (fix loop). Escalation: budget exhausted or two identical failure signatures → label
`agent:needs-human`, comment the trail, stop.

## Rollback

Every step is additive (new files, new functions, new schema fields) except Step 4/7's
page rewires, which touch shipped read-only tables in place. If a step's live
verification fails and can't be fixed within the loop budget, `git revert` that step's
commit — no migration, no data mutation outside `districts`/`glaciers`/`audit` rows
created by manual testing (delete the throwaway test rows via `psql` before closing out).
No schema changes anywhere, so there is nothing for CryoHealth-api to roll back in
tandem.
