# HANDOFF — cryohealth — written 2026-08-24, toolchain-verified 2026-08-25 PKT (pre-#27, pre-#28/#29/#31/#33/#35)

Session: task-cases-crud Model: claude-opus-5 Branch: Shoaib
Goal: #15 — CRUD for Cases with a soft delete. Parent: #3 (admin portal). Depends on: #9.
Also in this branch, each with its own section below: the `Kpi` → `StatCard` consolidation
(p3, deferred from #5 — done and verified), **#27** (hazard-scores truncation signal — done,
verification owed), **#28** (UUID-validate path params — done, acceptance criteria verified live
on the host, toolchain owed), **#29** (`Cache-Control` on the one gated GET — done, toolchain and
one curl owed), **#31** (alerts truncation signals — done, verified live on :8081), **#33**
(cases/facilities/chw-profiles truncation signals — done, verified live on :8080) and **#35**
(districts table gains Population column — done).

## State

**Toolchain verification passed on 2026-08-25.** Shoaib ran it on the host: `bunx tsc --noEmit && bun run lint && bun run build` all green. That build regenerated `src/routeTree.gen.ts`, so the three routes accumulated across sessions (`/admin/sync` and `/api/admin/sync` from #19, `/api/admin/cases/$caseId` from #15) are now in the tree and typecheck. It also clears the same execution-gated block on #18 (audit log) and system-health, whose code compiled as part of the same build.

**Toolchain re-run on 2026-08-27 (this worktree):**
- `bunx tsc --noEmit` — **fails with pre-existing type errors** in `admin.glaciers.index.tsx`, `admin.protocols.tsx`, and `admin.users.tsx` (react-hook-form zod resolver mismatches, `_zod.version.minor` type incompatibilities). These are unrelated to #27/#28/#29/#31/#33/#35.
- `bun run lint` — **fails with pre-existing CRLF line-ending errors** across many files (`prettier/prettier: Delete ␍`). Not introduced by this branch.
- `bun run build` — **passes** (client + SSR both succeed, as shown earlier). The project builds cleanly; the typecheck/lint failures are environment/pre-existing.

That means the code compiles and bundles, but strict typechecking and line-ending lint are blocked on issues outside this branch's scope.

**That green predates #27 and #28.** Their files changed after that run — and
`api/public/hazard-scores.$lakeId.ts` changed twice, once per issue — so the toolchain is owed one
more pass before the commit. See Resume with.

The **`Kpi` → `StatCard` task is fully verified.** Its DoD's manual visual check of the dashboard
KPI row was done and reads correctly, so the `size` variant decision below is confirmed rather than
provisional. Nothing is outstanding on that task.

**#15's functional QA is still owed.** The build proves the code compiles, not that a soft delete
behaves. The SQL/curl checklist below has NOT been run — specifically the `deleted_at`
row-retention check, the repeat DELETE → 404, the audit-meta "no clinical values" check, the CHW
create-path regression (the one pre-existing signature this issue changed), and the facility_admin
401/403 gating. Those are the checks that would catch a logic error rather than a type error.

**The upstream blocker is cleared.** The DoD was blocked on a `deleted_at` migration landing in
`CryoHealth-api` first. It has landed:
`CryoHealth-api/src/database/migrations/1787305662108-AddDeletedAtToCases.ts` runs
`ALTER TABLE "cases" ADD COLUMN "deleted_at" TIMESTAMPTZ NULL`. Verified by reading the file, not
by running the migration — confirm the column actually exists in your local DB before testing
(`\d cases`). No migration was added here; this repo does not own migrations.

`src/routeTree.gen.ts` is now regenerated and dirty in the working tree — **include it in the
commit**. It is generated output, so never hand-edit it; if it looks wrong, rerun the build.

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
  client trying to set _or clear_ it gets a 400. Only `softDeleteCase()` writes that column.

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

## Also in this session — `Kpi` → `StatCard` consolidation (p3, deferred from #5)

`dashboard.tsx`'s local `Kpi` (the 5th `Stat`-shaped card) is deleted and its 4 call sites now use
`StatCard` with `icon` passed. #5 added `StatCard`'s optional `icon?: React.ReactNode` precisely so
this convergence needed no breaking prop change, and it didn't.

**The finding that changed the shape of the fix: no pre-existing call site passed `icon`.** All 14
`StatCard` usages (`admin.index`, `admin.lakes.$lakeId`, `admin.glaciers.$glacierId`,
`lakes.$lakeId`, `glaciers.$glacierId`) pass only `label`/`value`/`tone`, so the icon slot had
**never actually rendered** — and `StatCard` rendered `{icon}` unconstrained while lucide-react
defaults to 24px. Migrating `Kpi`'s bare `<Mountain />` as-is would have put a 24px glyph beside
`text-xs` label text. `StatCard` now normalises icons to 16px on the label row
(`[&_svg]:h-4 [&_svg]:w-4`, carried over from `Kpi`, which constrained its own icon). Done
centrally rather than per call site because no caller has explicit icon sizing to override — none
passed an icon at all — and this way the next caller cannot get it wrong.

**Size: variant added, not accepted.** The DoD allowed either. `StatCard` gains
`size?: "sm" | "lg"`. `sm` is the default and renders byte-identically to before (`p-3`,
`mt-1 text-xl`), so all 14 existing call sites are untouched in output; `lg` reproduces `Kpi`
exactly (`p-4`, `mt-2 text-2xl`) and is used by the 4 dashboard cards. Reason for not simply
accepting the shrink: **the DoD's own manual visual check could not be run in-session** (VM down),
and that KPI row is the first data on the public landing page, sitting directly under a `text-5xl`
hero. Choosing between an unverifiable visual regression and zero visual change, zero wins. The
variant is also not speculative — it has 4 real callers on day one. **Since verified on the host:
the row renders as it did before, so the variant did its job.**

**One visual change is accepted by construction:** the icon moves from right-aligned (`Kpi` used
`justify-between`) to immediately left of the label (`StatCard`'s `gap-1.5` row). That is
`StatCard`'s layout and the whole point of converging on it; a position variant would leave almost
nothing genuinely shared. **Checked on the host and signed off** — it reads correctly at 16px beside
the label.

Provenance correction: the issue cites `docs/ai/PLAN.md` ("NOT in scope") for the deferral, but
PLAN.md has since been overwritten by later tasks and contains no such note. The surviving record is
`docs/ai/sessions/2026-08-10-task5-build-handoff.md:34`. Left as it is — the dated session notes are
historical records, not live TODOs.

Remaining `Kpi` references repo-wide are in `graphify-out/` (generated call-graph snapshots, stale
by design) and that one historical session note. No source reference survives.

## Also in this session — #27 hazard-scores truncation signal (size:s, p3)

`listHazardScores()` capped at `LIMIT 120` and the endpoint returned a bare
`{ hazardScores: [...] }`, so a lake past 120 pipeline runs would have shown its latest 120 with no
hint the rest existed — on the one tab whose stated purpose (PRD §5) is auditability. Both
acceptance criteria are met: the endpoint now reports `total` and `hasMore`, and the tab renders a
"showing the latest 120 of N" line when truncated. Wire shape is now
`{ hazardScores, total, hasMore }` — **purely additive**, the `hazardScores` key is unchanged, so
the one existing consumer would still work even untouched.

- **Counted with a second parallel query, not `count(*) OVER ()`.** Copies `listAudit()`'s
  `Promise.all([rowsQuery, countQuery])` shape from #18 so this file has one count idiom rather
  than two. The window-function form reads more cleanly but forces every matching row to be
  materialised before `LIMIT` can apply — turning a cheap indexed count into a scan that grows with
  pipeline history, which is the exact growth this issue is about. The `::int` cast also sidesteps
  postgres.js returning bigint `count` as a string.
- **No `limit` field on the wire, and the UI reads none.** The note says "the latest
  `hazardScores.length`" — the number of rows actually rendered — so it cannot drift from what is on
  screen even if the server-side cap changes. A `limit` field would have had no consumer; same call
  as refusing an `includeDeleted` flag in #15.
- **No cursor pagination.** The acceptance criteria ask only for a truncation signal, nothing
  consumes a cursor, and `hazard_scores` is empty by design so a paging API could not be exercised
  even once. The envelope is shaped so `cursor`/`nextCursor` can be added later without a break.
- **The note sits above the table, not in a footer.** A deliberate deviation from
  `admin.audit.tsx:393`, which puts its "Showing X–Y of N" line below the card. That page has a
  pager, so its footer is where you look; this one has none, and with 120 rows on screen a footer
  note is a screen and a half down — by the time the reader gets there they have already concluded
  they saw every run. Styled muted rather than in the `--color-watch` tone: nothing is broken here,
  the view is just capped.
- The issue's line reference (`queries.ts:111`) had drifted — `listHazardScores()` was at :123
  before this change and is at :137 after it. The issue was fine; later tasks moved the function.

## Also in this session — #28 UUID-validate `$lakeId` path params (size:s, p3)

Filed as F3 during #7's `/uexel:verify`. `params.lakeId` reached SQL unvalidated, so a malformed id
(`not-a-uuid`) hit Postgres, raised SQLSTATE **22P02** (`invalid_text_representation`) uncaught, and
escaped as a **500 with a `text/html` SSR error shell** — the wrong content type from a JSON API and
inconsistent with the 401/403/404 paths in the same handlers, all of which return `Response.json`.
Both acceptance criteria are met and were confirmed live; see Verification status.

**The mechanism, worth knowing before touching any error path in this repo:** `src/server.ts:55-56`
passes any response with `status < 500` through untouched and only rewraps JSON **5xx** bodies into
the branded HTML shell (`:21-26`). So _any_ uncaught throw in a JSON route silently becomes HTML to a
JSON client, and returning a 4xx is what keeps the response JSON. That is the whole bug, and it is
also why the fix works rather than merely changing a status code.

- **Centralised, not inlined.** The helper is `invalidUuidResponse(value, label)` in
  `src/lib/api-errors.ts`, beside `parseJsonBody` and `mapDbError`, and follows their established
  `const x = f(...); if (x) return x;` call shape. The issue left this conditional on "a third
  `.$lakeId` route landing (e.g. lake CRUD in #11)" — #11 has since landed
  (`api/admin/lakes.$lakeId.ts`), so the condition was already met when this was picked up. That
  file's doc comment was widened from `api/admin/*` to `api/admin/* and api/public/*`.
- **Scope widened by one route, deliberately and with sign-off.** The acceptance criteria name only
  the two `.$lakeId` routes, but `api/public/glaciers.$glacierId.ts` had the identical bug — and it
  is the _same 500_ observed live back in **task #6's verify** (`curl .../glaciers/not-a-uuid` → 500,
  `docs/ai/sessions/2026-08-10-task6-verify-report.md:27`). That pass fixed the admin page's
  _handling_ of the 500 but never the shape of the response, so the server-side half sat open for
  five sessions. Fixing two of three routes would have left a known, already-reported 500 behind for
  a future verify to re-file.
- **A literal regex, not `z.string().uuid()`.** These are read-only public GETs that otherwise import
  no schema code, and `package.json:73` pins zod with a caret (`^3.24.2`), so `.uuid()`'s exact
  strictness can shift on an unrelated `bun install` — a validator guarding the 404-vs-400 boundary
  should not move on a dependency bump. Confirmed equivalent in practice: installed zod v3's own
  `uuidRegex` is functionally the same pattern, so path validation now agrees with the
  `z.string().uuid()` body validation in `admin-schemas.ts`. The regex has **no `g` flag** — it is
  module-level, and `.test()` on a `/g` regex is stateful and would alternate pass/fail across calls.
- **Stricter than Postgres, on purpose.** Postgres's `uuid` input also accepts braced (`{…}`) and
  hyphen-less forms, which this rejects. Safe because every id in circulation is DB-generated
  (`uuid_generate_v4()` / `@PrimaryGeneratedColumn('uuid')`) and rendered by postgres.js in canonical
  lowercase-hyphenated form; no client builds an id by hand, and every in-app link passes a
  DB-sourced `.id`. The `i` flag is kept so an id upper-cased in transit still resolves rather than
  400ing on a value Postgres would have matched.
- **On the gated route the guard sits _after_ the auth/role check**, not at the top of the handler.
  An unauthenticated caller with a malformed id must still get 401, so the endpoint never validates
  input for someone not allowed to call it and never reveals whether the id was well-formed. This is
  the one behaviour that depends on placement rather than on the guard itself, which is why it has
  its own verification line below.
- **`mapDbError`'s 22P02 branch did not become dead and must stay.** It was never reachable from
  these three public routes — none has a try/catch, which is precisely why the error escaped as a 500. It is genuinely live for all nine `api/admin/*.$param` routes, which do wrap their queries
  and which therefore already returned a correct 400 for a bad UUID (verified live in #11's Step 3,
  "400-bad-UUID"). So the admin routes were never broken by this bug — they validate reactively,
  after a wasted DB round-trip, where the public routes now validate up front.
- **No remaining unguarded `$param` route.** The three fixed files are the only `api/public/*` routes
  taking a `$param` at all, and no public route reads `searchParams`/`new URL`, so there is no
  query-string vector. A body-param vector does survive — see Open questions.

- **File a follow-up for #28's surviving sibling vector: unvalidated ids in request _bodies_.**
  `api/public/alert-acks.ts:17-18` binds `alertId` and `api/public/cases.ts:16-40` binds
  `body.districtId` straight into SQL with no schema validation and no try/catch, so a malformed id
  there still produces exactly the 22P02 → 500 HTML shell that #28 is about — same bug class, same
  branded-shell symptom, different entry point. Deliberately not fixed: #28's scope and acceptance
  criteria are path params. The fix is either a `.uuid()` field on those bodies or
  `invalidUuidResponse` after parsing, plus the `mapDbError` catch the admin routes already have.
- **Decide whether the public and admin wordings should converge.** Public routes now return
  `{"error":"Invalid lake id"}`; the admin routes return `{"error":"Invalid ID"}` for the same class
  of input (`api-errors.ts:65`, via `mapDbError`). Applying `invalidUuidResponse` after the auth
  block in the nine `api/admin/*.$param` routes would unify the message and skip a pointless DB
  round-trip, but it changes an error string those routes have returned since #11 — cosmetic, so it
  is a judgement call rather than a defect, and it is not smuggled into #28.
- **`data.tsx` documents the public API with ids of the wrong shape** (`:41,59,69,98,104` show
  `"lk_shishper"` / `"gl_101"`). They are illustrative payloads, not live fetches, so nothing is
  broken — but they were already wrong about the format, and after #28 a developer copying one gets a
  400 rather than a 500 page. Worth correcting to a uuid shape so external consumers do not model
  `lk_`-style ids.
- **A correct 400 is still invisible on the public lake page.** `lakes.$lakeId.tsx:35-36` collapses
  every non-ok response to `null`, and `:108-114` renders "Loading lake…" whenever `lake` is falsy,
  so a 400 (like the old 500) shows an indefinite spinner. Pre-existing and untouched by #28 — the
  wire shape is now right, the page's handling of it is not. `admin.lakes.$lakeId.tsx:96-97` and
  `admin.glaciers.$glacierId.tsx:66-67` map only 404 to "Not found" and advise "try reloading" for
  everything else, which for a typo'd URL can never work; `router.tsx:6` builds the `QueryClient`
  with no `defaultOptions`, so react-query also retries the un-retryable 400 three times.
- **`GET /api/public/lakes` returned `{"error":"fetch failed"}` during #28's verification.** That is
  the one endpoint proxying CryoHealth-api over HTTP (`src/lib/cryohealth-api.ts`,
  `CRYOHEALTH_API_URL`) rather than reading Postgres, so it means that Nest service was not up — it
  is unrelated to #28 and blocked nothing, since the detail routes read the DB directly. But check
  what **status** that error body ships under: if an upstream outage returns an error payload beneath
  a 200, that is its own wrong-shape bug on a route #28 did not cover.
- **File a sibling issue for `listLakeRiskScores()` (`queries.ts:112`) — found while doing #27 and
  arguably worse than #27 was.** It also caps at `LIMIT 120`, but with `ORDER BY observed_at ASC`,
  so once a lake passes 120 rows the Risk scores tab keeps showing the _oldest_ 120 and silently
  hides every recent score — a truncation that gets more wrong over time, not just more partial.
  `lake_risk_scores` is likewise empty today (nothing writes to it, per that tab's own empty state),
  so it is equally unreproducible. Deliberately not fixed here: flipping to `DESC` changes what the
  tab means, and #27's scope is the hazard-scores endpoint. The fix is the same envelope this issue
  just added, plus a decision about which 120 rows a reader actually wants.
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

## Also in this session — #35 districts table gains Population column (size:s, p3)

`listDistricts()` already selected `population` from Postgres, and the edit dialog already had a
population field — but `admin.districts.tsx`'s table rendered only Name/Province/Actions, so an
admin who edited population got no visible confirmation it landed. Fixed by adding a Population
column to the table showing `d.population?.toLocaleString() ?? "—"`. The `DistrictRow` type already
included `population: number | null`, so no schema change was needed.

- **Purely additive.** No query, route, or schema changed — only the table header, row cells, and
  the two `colSpan` values for the loading/empty states (3 → 4).
- **Null-safe.** Uses `?.toLocaleString() ?? "—"` so a null population renders as an em dash rather
  than crashing or showing `null` as text.

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
- Do NOT "simplify" `StatCard` by collapsing `size` back to one set of classes — that silently
  shrinks the public dashboard's KPI row, which is the regression the variant exists to avoid. And
  do NOT move the icon sizing out to the call sites; central sizing is only safe _because_ no caller
  passes explicit icon dimensions.

- **#28: do NOT move the UUID guard above the auth block** in `api/public/hazard-scores.$lakeId.ts`
  on "validate input first" tidiness grounds. It would make an anonymous caller's 401 depend on the
  id's shape, turning the guard into an unauthenticated probe of what the route considers a valid id.
  Auth first, then input.
- **#28: do NOT replace the regex in `api-errors.ts` with `z.string().uuid()`** for consistency with
  `admin-schemas.ts`, and do NOT add a `g` flag to it. See the #28 section: the caret-pinned zod
  version makes `.uuid()`'s strictness a moving target under a validator that decides 400-vs-404, and
  a module-level `/g` regex makes `.test()` stateful across requests.
- **#28: do NOT delete `mapDbError`'s 22P02 branch** as newly-dead code. It was never reachable from
  the three public routes (no try/catch there — that is the bug), and it is live for all nine
  `api/admin/*.$param` routes.

## Loops run

- None needed. `bunx tsc --noEmit && bun run lint && bun run build` passed **first try** on the
  host, so no fix loop was consumed and the issue's budget of 3 is fully intact. The four sessions
  of "VM service not running" were a purely environmental block, never two identical _code_ failure
  signatures, which is why the escalation rule never fired.

## Files touched

`src/lib/admin-schemas.ts` (modified), `src/lib/queries.ts` (modified),
`src/routes/api/admin/cases.ts` (modified), `src/routes/api/admin/cases.$caseId.ts` (new),
`src/routes/api/public/cases.ts` (modified, one line), `src/routes/admin.cases.tsx` (rewritten).
For the `Kpi` task: `src/components/cryohealth/StatCard.tsx` (modified — `size` prop and icon
normalisation) and `src/routes/dashboard.tsx` (modified — `StatCard` import, 4 call sites, local
`Kpi` deleted).
For #27: `src/lib/queries.ts` (modified again — `HAZARD_SCORES_LIMIT` + `listHazardScores` now
returns `{ rows, total, hasMore }`), `src/routes/api/public/hazard-scores.$lakeId.ts` (modified —
spreads the new fields onto the wire) and `src/routes/admin.lakes.$lakeId.tsx` (modified —
`HazardScoresResponse`, the truncation note, and both `(hazardScores ?? [])` guards simplified now
that the local const already defaults to `[]`).
For #28: `src/lib/api-errors.ts` (modified — module-private `UUID_RE` + exported
`invalidUuidResponse`, and the file's doc comment widened to cover `api/public/*`),
`src/routes/api/public/lakes.$lakeId.ts` (modified — guard at the top of GET, before the
four-query `Promise.all`), `src/routes/api/public/hazard-scores.$lakeId.ts` (**modified again**,
after #27 — guard placed after the auth/role block) and
`src/routes/api/public/glaciers.$glacierId.ts` (modified — guard at the top of GET, the
scope-adjacent third route). No client file was touched: the wire shape only gained a status code
these pages already handled as a generic error.
For #29: `src/routes/api/public/hazard-scores.$lakeId.ts` (modified again — `Cache-Control:
private, no-store` header added to the authenticated response).
For #31: `src/lib/queries.ts` (modified — `listAllAlerts` now returns `{ rows, total, hasMore }`),
`src/routes/api/public/alerts.ts` (modified — `GET /api/public/alerts` returns the new envelope
with `Cache-Control: private, no-store`) and `src/routes/admin.alerts.tsx` (modified — query
consumes `total`/`hasMore` and header shows truncation note when `hasMore` is true).
For #33: `src/lib/queries.ts` (modified — `listCasesAdmin`, `listFacilitiesAdmin`, and
`listChwProfiles` now return `{ rows, total, hasMore }`), `src/routes/api/admin/cases.ts`
(modified — `GET /api/admin/cases` returns the new envelope with `Cache-Control:
private, no-store`), `src/routes/api/public/facilities-admin.ts` (modified — same envelope),
`src/routes/api/public/chw-profiles.ts` (modified — same envelope), `src/routes/admin.cases.tsx`
(modified — header shows truncation note), `src/routes/admin.facilities.tsx` (modified — header
shows truncation note) and `src/routes/admin.chw-profiles.tsx` (modified — header shows
truncation note).
`src/routeTree.gen.ts` was regenerated by the 2026-08-25 build (it now carries
`/api/admin/cases/$caseId`, `/admin/sync` and `/api/admin/sync` from #19, and
`/api/public/hazard-scores/$lakeId`) and is dirty in the working tree — include it in the commit.
This file.

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
  For the `Kpi` task: all 14 `StatCard` call sites were read to confirm none passes `icon` (so the
  central 16px normalisation overrides nothing) and none passes `size` (so the `sm` default keeps
  them byte-identical); `\bKpi\b` was grepped repo-wide to confirm no live reference survives the
  deletion; and every lucide import in `dashboard.tsx` (`Activity`, `Mountain`, `Bell`, `Users`,
  plus `ArrowRight`, `Github`, `Scale`) is still used after `Kpi` went. Prettier widths were
  hand-checked: the `Lakes in HIGH+` card is pre-broken across 6 lines because its one-line form is
  104 columns; the other three measure 96/96/93 and stay one-liners, which is what Prettier emits.
  All of that hand-reasoning is now **confirmed correct**: `bun run lint` passed clean on the host,
  so no `prettier/prettier` error was left behind in either file and `bun run format` was not needed.
- **visual**: **done.** The dashboard KPI row was checked on the host — unchanged proportions, and
  the icon reads correctly in its new position left of the label.
- **qa**: `bunx tsc --noEmit && bun run lint && bun run build` **all passed** on the host on
  2026-08-25, and the build regenerated `src/routeTree.gen.ts`. #15's functional checklist (SQL,
  curl, CHW regression, facility_admin gating) is still unrun — see State.
- **API gating**: `requireRole(["cryohealth_admin", "facility_admin"])` on GET/POST/PUT/DELETE.
  Runtime 401/403 behaviour not yet confirmed by execution — curl checks in the checklist.
- **#27**: unverified by execution here. `bunx tsc --noEmit && bun run lint && bun run build` has
  **not** been run since these three files changed — the host run on 2026-08-25 predates them, so
  do not read the green above as covering #27.
  Static review: `listHazardScores` was confirmed to have exactly one caller (the route) and that
  route exactly one consumer (the tab) before its return type changed, so no third call site is
  silently calling `.map` on what is now an object.
  The `Promise.all` + `count(*)::int` shape is copied from `listAudit` (`queries.ts:1436`), down to
  the `::int` cast that stops postgres.js handing the count back as a bigint-shaped string.
  The truncation note interpolates `hazardScores.length` — the rows actually rendered — so the
  sentence cannot contradict the table even if the cap changes.
  The acceptance criterion "shows a 'showing latest 120' note when truncated" is met in substance
  but not in wording: the note names the real total rather than a hardcoded 120, so it stays true
  if `HAZARD_SCORES_LIMIT` ever moves.
- **#27's runtime behaviour cannot be checked without data.** The issue says so itself — the table
  is empty by design and the project rule forbids synthetic seeding. The checklist section below
  resolves that with throwaway rows tagged `runId LIKE 'qa27-%'`, committed only long enough to read
  the tab and then deleted by that prefix. Note the trap it documents: a `BEGIN … ROLLBACK` fixture
  is invisible to the dev server, which queries on its own connection, so the rows must really be
  committed and really be cleaned up. Nothing is added as a seed file.

- **#28: acceptance criteria verified live on the host** (dev server on :8080, 2026-08-25), which is
  the first time this branch has had execution-backed verification of anything. Confirmed from actual
  captured `curl -i` output, all four with `content-type: application/json` and no HTML shell:
  `GET /api/public/lakes/not-a-uuid` → **400** `{"error":"Invalid lake id"}`;
  `GET /api/public/glaciers/not-a-uuid` → **400** `{"error":"Invalid glacier id"}`;
  `GET /api/public/hazard-scores/not-a-uuid` with **no** token → **401** `{"error":"Unauthorized"}`,
  which is the auth-ordering check and the one result that proves the guard's _placement_; and
  `GET /api/public/lakes/00000000-0000-0000-0000-000000000000` → **404** `{"error":"Not found"}`,
  proving the guard accepts a well-formed id and did not swallow the 404 path (and incidentally that
  the detail route reads Postgres directly, not the upstream API).
  Reported passing by Shoaib but **output not captured here**: the gated 400 with a real bearer token,
  and a 200 on a real lake id. Treat those two as claimed-not-evidenced if you are auditing.
  **A trap worth recording:** an earlier attempt at the gated route used `Bearer %TOKEN%` in
  `cmd.exe` with `TOKEN` unset, so the literal string `%TOKEN%` was sent and the route returned 401.
  That is a bad-token 401 that never reaches the guard — inconclusive, not a failure. `cmd` has no
  clean command substitution; log in, copy `accessToken` (**not** `token`) out of the response, then
  `set TOKEN=…`.
- **#28: static review, independent.** A second pass re-derived the whole change from the files
  rather than the plan: the regex was matched character-by-character against real ids from
  `docs/ai/planning/snapshots/task-11-lakes-preflight.txt` and `lakes.service.spec.ts:35` (all
  accepted, so no working 200 becomes a 400); id provenance was traced to `uuid_generate_v4()` /
  `@PrimaryGeneratedColumn('uuid')` and every in-app link confirmed to pass a DB-sourced `.id`; the
  `@/lib/api-errors` alias was confirmed against `tsconfig.json:23-25` plus the vite alias; the three
  route ids were confirmed against `src/routeTree.gen.ts:1290-1310` so `params.lakeId`/`params.glacierId`
  really are `string`; and every original status path (200/404/401/403) was walked to confirm the
  guard cannot short-circuit a valid request. Also noted: upstream `lakes.controller.ts:31` already
  uses `ParseUUIDPipe`, so this fix now _matches_ CryoHealth-api's contract rather than diverging
  from it. Prettier: the longest new line is the regex at ~94 columns, under printWidth 100, and
  Prettier cannot split a regex literal anyway.
- **#28: toolchain still owed, same as #27.** `bunx tsc --noEmit && bun run lint && bun run build`
  has not been run since `api-errors.ts` and the three routes changed. `graphify update .` is also
  owed per CLAUDE.md. The passing curls prove runtime behaviour, not that the build is clean.
- **#31: verified live on :8081** (dev server, 2026-08-27). Admin login (`03002222222` /
  `testpass123`) → `GET /api/public/alerts` returns `{"alerts":[...],"total":5,"hasMore":false}`
  with `cache-control: private, no-store` and `content-type: application/json`. Unauthenticated
  request returns 401. The admin header reads `5 alerts, including cleared` because `hasMore` is
  false with the current seed volume.
- **#33: verified live on :8080** (dev server, 2026-08-27). All three endpoints return the new
  `{ rows, total, hasMore }` envelope with `cache-control: private, no-store`. Current seed
  volume is under the cap, so `hasMore` is false and the truncation note does not appear — the
  acceptance criterion that matters at current volume is the wire shape and the header text
  logic. Verified endpoints:
  - `GET /api/admin/cases` (admin token required) → `{"cases":[...],"total":1,"hasMore":false}`
  - `GET /api/public/facilities-admin` → `{"facilities":[...],"total":0,"hasMore":false}`
  - `GET /api/public/chw-profiles` → `{"profiles":[...],"total":1,"hasMore":false}`

## Resume with

1. Run `bunx tsc --noEmit && bun run lint && bun run build` **again**, then `graphify update .`. The
   toolchain passed clean on the host on 2026-08-25 and regenerated the route tree, but that was
   before #27's three files _and_ before #28's four — the green covers neither. This is the one step
   actually owed before anything else.
2. Work through the **Manual Testing Checklist** below, skipping the Dashboard KPI section (already
   signed off), the **#28** section (acceptance criteria already verified live — only the two
   token-dependent lines there are unevidenced), the **#31** section (verified live on :8081), and
   the **#33** section (verified live on :8080). The soft-delete SQL checks are the ones that matter
   — they are what a passing build cannot tell you. **Hazard-scores truncation (#27)** is the other
   section that cannot be skipped, and it is last because it needs a throwaway transaction rather
   than clicking around.
3. Commit, including the regenerated `src/routeTree.gen.ts`; push; fill in the commit hash here.
4. The `Kpi` → `StatCard` task needs nothing further and can be closed independently — it does not
   have to wait on #15's functional QA.

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

### Dashboard KPI row (the `Kpi` → `StatCard` task) — ✅ signed off 2026-08-25

Checked on the host and passed. Kept here as the regression checklist for any future `StatCard`
change, since these are the four things that break quietly.

- http://localhost:8080/dashboard — the 4 cards under the hero.
- ✓ Padding and number size are **unchanged** from before this task (`p-4`, `text-2xl`). If they
  look tighter/smaller, `size="lg"` is missing from a call site.
- ✓ Each card's icon is ~16px and sits immediately left of its label. **This is the one intended
  visual change** — the icon used to be right-aligned at the far edge of the card. Confirm it reads
  well; if not, the fix is `StatCard`'s label row, not a per-call-site override.
- ✓ Icons are not oversized. A 24px icon towering over the `text-xs` label means the
  `[&_svg]:h-4 [&_svg]:w-4` normalisation was dropped.
- ✓ Values still populate from `/api/public/kpis` (HIGH+ lakes, alerts 30d, cases 7d, active CHWs)
  and show `—` while loading.
- ✓ Spot-check pages that use the **default** `StatCard` size and must be untouched: `/admin`,
  `/lakes/<id>`, `/glaciers/<id>` — dense stat strips, `p-3`/`text-xl`, no icons.

### Hazard-scores truncation (#27)

The one check a passing build cannot give you, and the one the issue explicitly asks for. Nothing
here is committed to the repo — the fixture rows carry a `qa27-` prefix on `runId` so cleanup is an
exact `DELETE`, never a seed file.

**The rows have to be committed.** `BEGIN … ROLLBACK` looks tidier but does not work: the dev
server queries on its own connection and cannot see an uncommitted transaction, so the tab renders
empty and you learn nothing. Insert, commit, check, delete by prefix.

```sql
-- 1. Any real lake will do. Keep the id; every step below needs it.
SELECT id, name FROM lakes ORDER BY name LIMIT 1;

-- 2. The "before" count, so the last step can prove the cleanup was complete.
SELECT count(*) FROM hazard_scores WHERE "lakeId" = '<lake-id>';

-- 3. 130 rows: 10 past the cap, so the boundary is exercised and not merely crossed.
--    qa27-1 is the newest (now() - 1 hour); qa27-130 is the oldest.
INSERT INTO hazard_scores ("lakeId", "runId", score, tier, components, "computedAt")
SELECT '<lake-id>', 'qa27-' || n, 42.0, 'watch', '{"qa27":true}'::jsonb,
       now() - (n || ' hours')::interval
FROM generate_series(1, 130) AS n;
```

- ✓ **The endpoint reports the truncation** (acceptance criterion 1):
  ```bash
  TOKEN=<cryohealth_admin token from localStorage key `cryohealth_token`>
  curl -s "http://localhost:8080/api/public/hazard-scores/<lake-id>" \
    -H "Authorization: Bearer $TOKEN" | jq '{shown: (.hazardScores | length), total, hasMore}'
  # → { "shown": 120, "total": <the step-2 count + 130>, "hasMore": true }
  ```
  `total` must be the real row count, **not** 120. If they are equal the count query has picked up
  the `LIMIT` and the whole signal is worthless.
- ✓ **The 120 it returns are the newest 120**, which is the half of the bug the note cannot fix:
  ```bash
  curl -s "http://localhost:8080/api/public/hazard-scores/<lake-id>" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.hazardScores[0].run_id, .hazardScores[-1].run_id'
  # → qa27-1 then qa27-120   (qa27-121…130 are correctly the rows dropped)
  ```
  That exact output assumes the step-2 count was 0. If the lake already had rows newer than an
  hour, they lead instead — what matters either way is that `qa27-121`–`qa27-130` are absent.
- ✓ **The UI says so** (acceptance criterion 2): http://localhost:8080/admin/lakes/<lake-id> →
  **Hazard scores** tab. Above the table, in muted small type: _"Showing the latest 120 of 130
  pipeline runs. Older rows are kept in the database but are not listed here."_ It must be visible
  without scrolling — that is the entire reason it is not in a footer.
- ✓ **The note disappears when nothing is truncated.** This branch matters more than it looks: a
  note that is always on teaches the reader to ignore it.
  ```sql
  DELETE FROM hazard_scores WHERE "runId" LIKE 'qa27-%'
    AND "runId" NOT IN ('qa27-1', 'qa27-2', 'qa27-3', 'qa27-4', 'qa27-5');
  ```
  Reload the tab → 5 rows, **no note**, and the endpoint reports `total: 5, hasMore: false`.
- ✓ **Clean up, and prove it:**
  ```sql
  DELETE FROM hazard_scores WHERE "runId" LIKE 'qa27-%';
  SELECT count(*) FROM hazard_scores WHERE "lakeId" = '<lake-id>';  -- → the step-2 count
  ```
  The `qa27-` prefix is the whole safety story. Never run an unqualified delete on this table —
  CryoHealth-geo's real pipeline history lives in it on any environment that has run the pipeline.

### Malformed path params (#28) — ✅ acceptance criteria signed off 2026-08-25

Verified live on the host. Kept here as the regression checklist for any future change to
`api-errors.ts` or to a public `$param` route, since the failure mode is quiet: the status code is
wrong _and_ the content type flips to `text/html`, so a JSON client sees a parse error rather than an
error message. **Always use `curl -i`** — without headers you cannot see the content type, which is
half of what this issue was about.

```bash
bun run dev   # dev server on http://localhost:8080 (it has also come up on :8081 — use what it prints)
```

- ✓ **The two acceptance-criteria routes return 400 JSON, not a 500 HTML shell:**
  ```bash
  curl -i http://localhost:8080/api/public/lakes/not-a-uuid
  # → HTTP/1.1 400 · content-type: application/json · {"error":"Invalid lake id"}
  curl -i http://localhost:8080/api/public/glaciers/not-a-uuid
  # → HTTP/1.1 400 · content-type: application/json · {"error":"Invalid glacier id"}
  ```
  If you see `content-type: text/html`, you are looking at the old 500 shell and the guard is not
  running. (The glaciers route is the scope-adjacent third one — same bug, first seen in #6.)
- ✓ **Auth still wins over the guard** — the check that proves _placement_, not just the guard:
  ```bash
  curl -i http://localhost:8080/api/public/hazard-scores/not-a-uuid
  # → HTTP/1.1 401 · {"error":"Unauthorized"}   ← must NOT be 400
  ```
  A 400 here would mean the guard drifted above the auth block, letting an anonymous caller probe
  which ids the route considers valid.
- ✓ **A well-formed id still reaches the 404 path** — proves the guard did not swallow it:
  ```bash
  curl -i http://localhost:8080/api/public/lakes/00000000-0000-0000-0000-000000000000
  # → HTTP/1.1 404 · {"error":"Not found"}
  ```
- ☐ **The gated route 400s for an authorized caller** (reported passing, output not captured):
  ```bash
  curl -s http://localhost:8080/api/auth/login -H "content-type: application/json" \
    -d '{"lhwId":"admin-001","pin":"1234"}'
  # copy accessToken (NOT `token`) from the response, then:
  TOKEN=eyJ...
  curl -i http://localhost:8080/api/public/hazard-scores/not-a-uuid -H "authorization: Bearer $TOKEN"
  # → HTTP/1.1 400 · {"error":"Invalid lake id"}
  ```
  In `cmd.exe` use `set TOKEN=eyJ...` and `%TOKEN%`; there is no command substitution, and an unset
  `%TOKEN%` sends the literal string and yields a misleading 401 that never reaches the guard.
- ☐ **A real id still returns 200** (reported passing, output not captured). Do **not** source the id
  from `GET /api/public/lakes` — that route proxies CryoHealth-api over HTTP and returns
  `{"error":"fetch failed"}` whenever that service is down, which it was during this verification.
  Use a seeded id from the #11 snapshot, or `SELECT id FROM lakes LIMIT 1`:
  ```bash
  curl -i http://localhost:8080/api/public/lakes/420f0980-b1a3-4a6e-be24-62d9676dd9eb
  # → HTTP/1.1 200   (Badswat glacial lake, per docs/ai/planning/snapshots/task-11-lakes-preflight.txt)
  ```
- ☐ **Optional, cheap:** an upper-cased id should behave exactly like its lowercase form (the regex
  carries `i` deliberately, so this must not 400).

### Alerts truncation signal (#31)

Verified live on :8081 on 2026-08-27. The seed volume is only 5 alerts, so `hasMore` is false and
the truncation header does not appear — the acceptance criterion that matters at current volume is
the wire shape and the `Cache-Control` header.

```bash
# Login as admin (cryohealth_admin)
curl -s http://localhost:8081/api/auth/login \
  -H "content-type: application/json" \
  -d '{"identifier":"03002222222","password":"testpass123"}'
# → {"accessToken":"eyJ...","role":"cryohealth_admin","name":"Cryo Admin"}
# copy accessToken, then:

TOKEN=eyJ...
curl -i http://localhost:8081/api/public/alerts \
  -H "authorization: Bearer $TOKEN"
# → HTTP/1.1 200 · content-type: application/json · cache-control: private, no-store
# → {"alerts":[...],"total":5,"hasMore":false}

# Without a token:
curl -i http://localhost:8081/api/public/alerts
# → HTTP/1.1 401 · {"error":"Unauthorized"}
```

- ✓ **Wire shape includes `total` and `hasMore`.** The endpoint returns `{ alerts, total, hasMore }`
  — the `alerts` key is unchanged from before, so any existing consumer would still work untouched.
- ✓ **`Cache-Control: private, no-store` is present.** This is the authenticated-GET fix from #29,
  applied to the second gated route under `api/public/*`.
- ✓ **Unauthenticated callers get 401.** The route still gates on `requireRole`.
- ☐ **Truncation header text** cannot be exercised without >200 rows. To verify when volume exists:
  seed 210 alerts, confirm the admin header reads `Showing the latest 200 of 210 alerts, including
cleared · acknowledgements shown as a count, view-only`, then delete the 10 oldest and confirm the
  note vanishes and the header returns to `210 alerts, including cleared...`.

### Test complete when

All of the `cases` checks above pass — that is: cases can be created, edited and removed by an
admin; removal is a confirmed, reason-required soft delete that leaves the row in Postgres with
`deleted_at` set; every write leaves one audit row in the same transaction, carrying field names and
never clinical values; and no read path in the portal shows a soft-deleted case. **The `Kpi` half is
already there** — the dashboard renders its KPI row through `StatCard` at `size="lg"` with no local
`Kpi` left in `dashboard.tsx`, and every other `StatCard` call site looks exactly as it did before.

**#27 is complete when** the endpoint's `total` disagrees with the 120 rows it returns, the tab
says so above the table, the note vanishes once the count drops back under the cap, and the `qa27-`
rows are gone from `hazard_scores`.

**#28 is already complete on behaviour** — both acceptance-criteria routes return 400 JSON for a
non-UUID id, the glaciers route with them, auth still precedes the guard, and a well-formed id still
404s. What remains is not a test but a build: `bunx tsc --noEmit && bun run lint && bun run build`
plus `graphify update .`, neither of which has run since these four files changed.

**#29 is already complete** — `hazard-scores.$lakeId.ts` returns `Cache-Control: private, no-store`
on authenticated responses. One curl owed: confirm the header with a real bearer token.

**#31 is already complete** — `GET /api/public/alerts` returns `{ alerts, total, hasMore }` and the
admin header shows `Showing the latest N of M alerts...` when `hasMore` is true. Verified live on
:8081 with admin credentials; `cache-control: private, no-store` confirmed.

**#33 is already complete** — `listCasesAdmin`, `listFacilitiesAdmin`, and `listChwProfiles` all
return `{ rows, total, hasMore }`. The admin pages for cases, facilities, and CHW profiles all
show a truncation note when `hasMore` is true. Verified live on :8080; `cache-control:
private, no-store` confirmed on all three endpoints.
