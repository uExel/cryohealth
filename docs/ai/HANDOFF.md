# HANDOFF — cryohealth — 2026-08-24 PKT

Session: task-cases-crud Model: claude-opus-5 Branch: Shoaib
Goal: #15 — CRUD for Cases with a soft delete. Parent: #3 (admin portal). Depends on: #9.

## State

Implemented, **not yet build-verified**. The dev VM/toolchain reported "VM service not running"
again this session (fourth session in a row with the same signature), so
`bunx tsc --noEmit && bun run lint && bun run build` was NOT executed and `src/routeTree.gen.ts`
was NOT regenerated. All Definition-of-Done code is written and passed a static self-review.

**The upstream blocker is cleared.** The DoD was blocked on a `deleted_at` migration landing in
`CryoHealth-api` first. It has landed:
`CryoHealth-api/src/database/migrations/1787305662108-AddDeletedAtToCases.ts` runs
`ALTER TABLE "cases" ADD COLUMN "deleted_at" TIMESTAMPTZ NULL`. Verified by reading the file, not
by running the migration — confirm the column actually exists in your local DB before testing
(`\d cases`). No migration was added here; this repo does not own migrations.

Route-tree regen is now owed for **three** routes accumulated across sessions: `/admin/sync` and
`/api/admin/sync` (#19) plus `/api/admin/cases/$caseId` (this session). `tsc` fails on all three
until one build runs. Prior tasks #18 (audit log) and system-health are likewise code-complete and
await the same execution-gated verification.

## Decisions taken this session

- **Both admin roles** (`cryohealth_admin`, `facility_admin`) on every case handler. The existing
  GET from #9 already allowed both, and PRD §10 Q1 recommends shipping full-dataset access for
  both roles first. The PRD calling cases "clinical-adjacent" drives the **soft delete and the
  confirm dialog**, not a narrower role. Facility-scoping is PRD open question 1 and needs a
  schema change (`cases` has no facility column), so it is not half-implemented here.
- **`chw_id` is create-only.** `caseUpdateSchema` omits it. Re-pointing an existing case at a
  different CHW rewrites clinical provenance — who saw this patient. A correction means
  soft-deleting the case and logging a new one, which leaves both audit rows behind.
- **snake_case zod field names** (`chw_id`, `is_disaster_related`), unlike every camelCase schema
  above them in `admin-schemas.ts`. They mirror the `cases` columns exactly so
  `CASE_WRITABLE_COLUMNS` + `sql(writable)` keys straight off the patch and the edit dialog seeds
  `defaultValues` straight from the GET row. The **camelCase wire format of
  `POST /api/public/cases` is CryoHealth-app's contract and is deliberately untouched**; the admin
  POST maps snake_case → `insertCase()`'s camelCase params at the boundary.
- **Audit meta records field _names_, never clinical values.** `case.update` logs
  `{changed_fields: [...]}` — a deliberate divergence from `updateFacility`, which logs a from/to
  diff. `case.create` logs attribution and geography only (`chw_id`, `district_id`,
  `is_disaster_related`). Reason: `audit` is CSV-exportable by every `cryohealth_admin` (#18), so a
  from/to diff would copy symptoms, diagnosis, treatment and patient age into an exportable table.
  Same data-minimisation call as excluding `chw_cases.payload` from `listChwCases`.
- **`deleted_at` is absent from both schemas and must stay that way.** Both are `.strict()`, so a
  client trying to set *or clear* it gets a 400. Only `softDeleteCase()` writes that column.

## Done this session

- `src/lib/admin-schemas.ts` (modified): replaced the unused `caseSchema`/`Case` placeholder
  (verified imported nowhere) with `caseCreateSchema`/`CaseCreate` and
  `caseUpdateSchema`/`CaseUpdate`. `patient_age` uses plain `z.number()`, **not** `.coerce` —
  same rationale as `districtCreateSchema.population`: coercion turns an explicit-clear `""`/null
  into `0`, i.e. a fabricated patient age. `patient_sex` is free text, not an enum: the column is
  plain `text` and nothing in either repo constrains it, so a guessed closed list would reject
  legitimate values.
- `src/lib/queries.ts` (modified):
  - `insertCase()` extended — now takes `actorId`, runs inside `db.begin()`, and writes its audit
    row in the **same transaction** (never mutate-then-audit as two statements). Returns the
    created row.
  - `updateCase(id, patch, actorId)` (new) and `softDeleteCase(id, reason, actorId)` (new).
    `softDeleteCase` runs `UPDATE cases SET deleted_at = now()` — there is **no hard
    `DELETE FROM cases`** anywhere in this repo and there should not be one, unlike
    `deleteFacility`/`deleteProtocol` which do destroy the row.
  - Both guard `AND deleted_at IS NULL`. On update that makes editing a deleted case a 404 rather
    than a quiet mutation of a row nothing displays; on delete it makes a repeat delete a 404
    instead of silently bumping the timestamp and writing a second audit row for one removal.
  - **Three** read paths now filter `deleted_at IS NULL`, not just the admin list: `listCasesAdmin`
    (the table), `getKpis` cases7d (else a deleted case still inflates the dashboard), and
    `listDisasterCasesForDistrict` (else a case the admin believes they removed stays visible to
    every CHW reading a district). There is deliberately **no `includeDeleted` flag** — nothing in
    the portal can view or restore a soft-deleted case yet, and an unused escape hatch on the one
    query the admin table renders is how a "deleted" row quietly comes back.
- `src/routes/api/admin/cases.ts` (modified): POST added beside the existing GET. `chwId` comes
  from the form, **not** `claims.sub` — an admin logs a case on a CHW's behalf, so the case is
  attributed to that CHW while `actorId` records who actually wrote it. `mapDbError` turns a stale
  picker option (23503) into a clean 400 instead of a raw 500.
- `src/routes/api/admin/cases.$caseId.ts` (new): PUT + soft DELETE, same role gate. PUT 400s on an
  empty patch; DELETE requires `deleteReasonSchema` and the reason lands in the audit row, not in
  the `cases` row.
- `src/routes/api/public/cases.ts` (modified, one line): passes `actorId: claims.sub`. Side effect
  of `insertCase` now auditing — here the CHW is both author and actor. Rather than let the admin
  and CHW create paths diverge, there is one audited write path.
- `src/routes/admin.cases.tsx` (rewritten): the read-only table from #9 gains an Actions column
  (9 → 10 columns, `colSpan` updated), a `New case` button, one `CaseFormDialog` for create and
  edit, and an `AlertDialog` delete confirm with a required reason. Copy states plainly that the
  row is retained in Postgres with `deleted_at` set. In edit mode the CHW renders as read-only
  text with an explanation, and `chw_id` is stripped from the submitted values before the PUT
  (`caseUpdateSchema` is `.strict()`, so sending it would 400).

## The facility_admin create gap (deliberate, visible)

`cases.chw_id` FKs `users(id) ON DELETE RESTRICT`, so the CHW picker needs real `users.id` values.
The only endpoint listing users is `/api/admin/users`, which is **`cryohealth_admin`-only by the
deliberate #16 security decision** (roles, lhwIds and phone numbers are what an attacker needs to
target sign-in). So a `facility_admin` can edit and soft-delete cases but cannot create one. The
`New case` button is disabled for them with a one-line explanation underneath rather than silently
missing. Rejected alternative: falling back to `/api/public/chw-profiles`, whose `user_id` is
nullable — that would hand back null/unlinked IDs and produce 23503s at insert time. Fix properly
by exposing a minimal `cryohealth_admin`-or-`facility_admin` CHW-roster endpoint (id + name +
lhwId only, no phone, no role); worth a follow-up issue.

## Open questions / actions for a human

- **File the CryoHealth-api sync-endpoint goal** (carried over from #19, still not done — I do not
  access GitHub in this workflow). Suggested scope: an endpoint that writes `sync_log` rows.
- **Fix admin PRD §5 line 141**, which wrongly lists `chw_cases` as writer-less (see git history
  of this file for the verified correction).
- **No restore path exists.** A soft-deleted case cannot be un-deleted from the portal, and
  un-deleting is not an admin form field. If the product wants it, it needs its own issue: a
  `deleted_at IS NOT NULL` list view, a `case.restore` audit action, and a decision about who may
  do it. Until then the delete dialog says to treat the action as final, which is honest.
- **`deleteDistrict`'s dependents count still counts soft-deleted cases** (`SELECT count(*) FROM
  cases WHERE district_id = $1`, unfiltered). Deliberate and conservative: those rows physically
  exist and still reference the district, and `ON DELETE SET NULL` would strip their provenance.
  Known cosmetic side effect — the blocked-delete count can exceed the visible case list. Left as
  is rather than making a destructive check more permissive.
- The district `Select` has no "clear back to null" option once a district is picked. Same
  limitation as `admin.chw-profiles.tsx`; a repo-wide fix (a sentinel "none" item) belongs in one
  pass across all the optional selects, not smuggled into this issue.

## Failed approaches (do not retry)

- Do NOT hand-edit `src/routeTree.gen.ts`. The router plugin regenerates it on dev/build and
  overwrites the edit; a blind hand-edit also risks breaking the whole file's typecheck.
- Do NOT add `DELETE FROM cases` anywhere, and do NOT "fix" the 404 on a repeat delete by making
  `softDeleteCase` idempotent-with-an-update. Two audit rows for one removal is worse than a 404.
- Do NOT put clinical values in audit `meta` (see the decision above), and do NOT copy
  `updateFacility`'s from/to diff into `updateCase` on consistency grounds.
- Do NOT source the CHW picker from `/api/public/chw-profiles` — nullable `user_id` violates the
  FK. See the gap section.
- Do NOT add an `includeDeleted` flag to `listCasesAdmin` "for future use".

## Loops run

- None. No `/uexel:build` / `/uexel:verify` loop — toolchain unavailable (VM down, same
  "VM service not running" signature as the previous three sessions). The issue's fix-loop budget
  of 3 is untouched and available once verification can run. Per the escalation rule this is a
  purely environmental block, not two identical *code* failure signatures.

## Files touched

`src/lib/admin-schemas.ts` (modified), `src/lib/queries.ts` (modified),
`src/routes/api/admin/cases.ts` (modified), `src/routes/api/admin/cases.$caseId.ts` (new),
`src/routes/api/public/cases.ts` (modified, one line), `src/routes/admin.cases.tsx` (rewritten).
`src/routeTree.gen.ts` will change on the next build (adds `/api/admin/cases/$caseId`, plus
`/admin/sync` and `/api/admin/sync` still owed from #19) — include it in the commit. This file.

## Verification status

- **tests**: n/a (no test script in this repo).
- **review**: static self-review only. Every import traced to a real export
  (`useAuth().isCryoHealthAdmin` at `auth.tsx:9/47`, `Textarea` at `textarea.tsx:21`, `Switch`,
  the `Select*`/`AlertDialog*` primitives, `caseCreateSchema`/`CaseCreate`/`CaseUpdate`).
  `insertCase`'s only pre-existing caller was found (`api/public/cases.ts`) before its signature
  changed. Client patterns copied from `admin.chw-profiles.tsx` (mutations, `DeleteReasonField`,
  form dialog), `admin.protocols.tsx:463-472` (`Switch` inside `FormField`, and the identical
  accent badge markup at :205) and `admin.districts.tsx:306-324` (numeric input). Prettier
  alignment reasoned by hand at printWidth 100 — the `AlertDialog` open tag is pre-broken across
  three lines because the single-line form is 103 columns; the long `className` on the Disaster
  badge stays on one line because Prettier cannot split a lone string attribute.
  `noUnusedLocals: false` and `@typescript-eslint/no-unused-vars: "off"` were both confirmed
  before relying on `const { chw_id: _chwId, ...patch } = values;`.
- **qa**: `tsc`/`lint`/`build` NOT run (VM down). Regenerate the route tree first.
- **API gating**: `requireRole(["cryohealth_admin", "facility_admin"])` on GET/POST/PUT/DELETE.
  Runtime 401/403 behaviour not yet confirmed by execution — curl checks in the checklist.

## Resume with

1. `bun run build` (regenerates `routeTree.gen.ts` → adds `/api/admin/cases/$caseId` and the two
   #19 routes).
2. `bunx tsc --noEmit && bun run lint && bun run build` (`bun run format` if lint flags only
   `prettier/prettier` — a formatting diff, not a logic issue).
3. Manual checklist below, then commit (with the regenerated tree), push, fill in commit hash.

---

## Manual Testing Checklist

### Setup

```bash
# Postgres must be up (the shared docker-compose db on :5433 — the DB CryoHealth-api owns).
# Confirm the upstream migration actually ran locally:
psql -h localhost -p 5433 -U cryohealth -d cryohealth -c '\d cases' | grep deleted_at
# → deleted_at | timestamp with time zone |   (if absent, run CryoHealth-api's migrations first)
bun run dev
# Dev server on http://localhost:8080
```

### Sign in (cryohealth_admin)

- http://localhost:8080/login — LHW ID: `admin-001`, PIN: `1234`. Sidebar → **Cases**.

### Create

- ✓ **New case** → the CHW select is populated from the real roster (active CHWs only). Symptoms
  is required; submitting empty shows the field error, not a 500.
- ✓ Save → toast, the row appears at the top of the table, and the audit trail has it:
  ```sql
  SELECT action, "entityType", meta FROM audit ORDER BY "createdAt" DESC LIMIT 1;
  -- → case.create | Case | {"created":{"chw_id":"…","district_id":…,"is_disaster_related":false}}
  ```
- ✓ **No clinical values in that meta** — no symptoms, diagnosis, treatment or patient age.

### Edit

- ✓ **Edit** on that row → the CHW shows as read-only text with the "not editable" explanation;
  there is no CHW dropdown in edit mode.
- ✓ Change Diagnosis and toggle Disaster-related → Save → the table updates and the audit row is
  `case.update` with `{"changed_fields":["diagnosis","is_disaster_related"]}` — **names only**.
- ✓ Save with nothing changed → 400 "No fields to update" surfaced as an error toast (no audit
  row is written for a no-op).

### Soft delete (the DoD requirement)

- ✓ **Delete** → the confirm dialog appears and explains the row is retained with `deleted_at`
  set. **Delete is disabled until a reason is typed.**
- ✓ Confirm → toast, the row disappears from the table.
- ✓ **The row still exists in Postgres** — this is the whole point of the issue:
  ```sql
  SELECT id, symptoms, deleted_at FROM cases ORDER BY created_at DESC LIMIT 3;
  -- → the deleted case is still there, with a non-null deleted_at timestamp
  SELECT action, reason FROM audit WHERE "entityType" = 'Case' ORDER BY "createdAt" DESC LIMIT 1;
  -- → case.delete | <the reason you typed>
  ```
- ✓ It is gone from the other two read paths too: the dashboard's 7-day case KPI drops by one, and
  if the case had a district and was disaster-related it no longer shows on that district's public
  page.
- ✓ Repeat the DELETE by hand → **404**, and no second audit row:
  ```bash
  TOKEN=<cryohealth_admin token from localStorage key `cryohealth_token`>
  curl -i -X DELETE "http://localhost:8080/api/admin/cases/<id>" \
    -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
    -d '{"reason":"again"}'
  # → HTTP 404
  ```
- ✓ PUT to the deleted id → **404** as well (a deleted case is not editable).

### CHW create path still works (regression check on the shared insertCase)

- ✓ Sign in as a CHW (`chw-001` / `1234`), log a case from the CHW screen. It saves, appears in the
  admin table, and its audit row is `case.create` with `actorId` = that CHW. This is the path whose
  signature changed — if it 500s, the `actorId` addition is the cause.

### facility_admin

- Sign out; sign in as facility_admin — LHW ID: `facility-001`, PIN: `1234`.
- ✓ **Cases** is visible and lists cases (both admin roles by design).
- ✓ **New case** is disabled, with the one-line explanation about the roster underneath.
- ✓ Edit and Delete both work.
- ✓ Gating is real, not just UI:
  ```bash
  curl -i "http://localhost:8080/api/admin/cases"   # → 401 with no token
  # with a `viewer` or `chw` token → 403
  ```

### Test complete ✓

Cases can be created, edited and removed by an admin; removal is a confirmed, reason-required soft
delete that leaves the row in Postgres with `deleted_at` set; every write leaves one audit row in
the same transaction, carrying field names and never clinical values; and no read path in the
portal shows a soft-deleted case.
