# PLAN

Goal: [#3 — CryoHealth admin portal — sidebar CRUD + platform monitoring](https://github.com/uExel/cryohealth/issues/3)
Task: [#11 — CRUD: Lakes (tier/risk-score columns locked)](https://github.com/uExel/cryohealth/issues/11)

Scope: add POST/PUT/DELETE for `lakes`, with the create/edit `Dialog`+`Form` split across
`admin.lakes.index.tsx` (create + delete) and `admin.lakes.$lakeId.tsx` (edit, per the
DoD), every write recorded in `audit`, and `currentTier`/`current_risk_score` structurally
unwritable — not just hidden in the form, rejected by the API even on a direct PUT. This
task copies the whole #10 scaffold (`.strict()` zod schemas, `writeAudit()`,
`sql.begin` transactions, dependent-count delete guard, `api-errors.ts`) but adds four
things #10 never had to solve: a `geometry` column instead of plain lat/lng, five
NOT-NULL-no-default columns on create, an app-level `updatedAt` with no DB trigger, and
the two locked policy-output columns.

Full exploration: [`docs/ai/planning/task-11-findings.md`](planning/task-11-findings.md)
(676 lines, written by the uexel-planner agent this session against the live tree and the
running dev Postgres — read it for exact schemas, live-probed SQL composition, and the
reasoning behind every decision below).

**Process note:** Skipping the `/uexel:plan` step 3 chain to `gstack /autoplan`, same
reason as #6-#10 — it would append an unrequested "Skill routing" section to CLAUDE.md and
auto-commit it. Reviewed inline instead, via the planner agent.

## Headline: the DoD's own filenames don't exist yet

There is no `src/routes/api/admin/lakes*.ts` today. The DoD's "sibling file" is
`src/routes/api/public/lakes-admin.ts` — 10 lines, GET-only, and deliberately
**unauthenticated** (`api/public/*` is the one namespace in this repo where that's an
invariant, consumed anonymously by `admin.lakes.index.tsx` and `alerts.tsx`). Putting a
role-gated PUT/DELETE there breaks that invariant. Plan is net-new
`src/routes/api/admin/lakes.ts` (POST) + `lakes.$lakeId.ts` (PUT/DELETE), leaving the
public file byte-identical — the same "route symmetry beats literal DoD wording" call #10
made for `districts`/`glaciers`, and the path the DoD actually names for PUT/DELETE.

## Assumptions & blast radius

- **`lakes.geom` is `geometry(Point,4326) NOT NULL` — lat/lng are not columns.**
  `sql(patch)` only builds `"col"=$n` pairs; it cannot express
  `ST_SetSRID(ST_MakePoint(lng,lat),4326)`. Live-probed (Parse-only `.describe()`, no
  writes) shape: inject `updatedAt` into every patch so the scalar `sql(patch)` is never
  empty, then append a conditional `sql\`, geom = ST_SetSRID(...)\``fragment only when`lat`/`lng`are present. **This is Parse-verified, not execute-verified** — Step 2 must
live-probe a real round-trip inside a transaction before the shape is locked in. If the
composition misbehaves under real binding, fall back to two statements inside the same`db.begin`, or drop coordinate edits from this task as a follow-up (findings §12 risk 1).
`ST_MakePoint`is`(lng, lat)` — reversed, this silently relocates Gilgit-Baltistan lakes
  into the Indian Ocean and nothing type-checks it.
- **Five NOT-NULL-no-default columns on create** (`name`, `valley`, `district`, `slug`
  UNIQUE, `source`) plus `geom` — #10's create paths had at most two. `slug` is a curated
  short handle (`shishper`, `khurdopin`, …), not derived from `name`; it must be
  create-only, not editable (`CryoHealth-api/scripts/seed-lakes.ts` upserts on
  `ON CONFLICT (slug)` and `seed-dev-data.ts` resolves lakes by slug — renaming one here
  makes the next seeder run insert a duplicate lake).
- **`lakes."updatedAt"` exists with zero DB triggers** (districts/glaciers have no such
  column at all, so #10 never hit this). It's a TypeORM `@UpdateDateColumn` — direct SQL
  from this repo won't bump it unless the query explicitly sets it. The admin list already
  renders it as "Updated"; an edit that doesn't bump it makes that column lie.
- **`tsc --noEmit` cannot verify HTTP verb dispatch** — same blind spot #10 named
  (`server.handlers` accepted a garbage `BOGUS:` key with zero type errors). The DoD's
  verification command proves nothing about PUT/DELETE firing; only live curl does
  (Step 3).
- **Delete is unguarded at the DB level for 4 of 5 dependent tables** (`observations`,
  `hazard_scores`, `lake_risk_scores` CASCADE; `alerts` SET NULL) and **Postgres itself
  will refuse it for the 5th** (`facilities`, `NO ACTION` — the first FK in this project
  where the DB, not just this repo's guard, enforces the block). Guard all five with a
  pre-delete dependent-count check anyway: silently cascading away
  `observations`/`hazard_scores`/`lake_risk_scores` destroys CryoHealth-geo pipeline output
  that `docs/admin-portal-prd.md` classifies as view+audit-only, and `alerts`
  SET NULL would orphan live alert rows (3 of 4 alerts reference a lake today) without so
  much as a confirmation.
- **The 200-path delete test must not run against seeded data.** `shishper` (2 alerts) and
  `khurdopin` (1 alert) are the only two lakes with dependents; the other four
  (`badswat`/`batura`/`ghulkin`/`passu`) have none and are all cited-source hazard data
  under the no-fabricated-hazard-data rule. Exercise the 409 branch against `shishper`;
  exercise the 200 branch only against a lake created during this session (or hand-inserted
  via `psql` if POST is cut per the sizing note below) — never against the six seeded rows.
- **Mixed camelCase/snake_case column names are intentional, not a bug to normalize.**
  `src/lib/db.ts` constructs the `postgres` client with no `transform` option, so
  `sql(patch)` quotes keys verbatim (`"damType"` next to `district_id`). The write schema's
  keys must match the DB column names exactly, camel and snake mixed — say so in a comment
  or a future reviewer will "fix" it into consistent casing and break every dynamic SET.
- **`lakes.district` (text) and `lakes.district_id` (uuid FK) are two different columns
  serving the same concept for two different consumers.** `src/lib/cryohealth-api.ts` maps
  CryoHealth-api's HTTP payload's `district` text into what the public hazard map treats as
  `district_id`; this repo's own admin list filters on the real `district_id` uuid. If an
  edit changes `district_id` without updating the legacy `district` text in the same
  statement, the admin table and the public map disagree about which district a lake is
  in — see GATE decision 2.
- **Working tree**: `graphify-out/cache/last_query_stamp` has an unstaged mtime-only diff
  (pre-existing, unrelated to this task). Local `main` remains ahead of `origin/main` by
  the unpushed #9/#10 commits; unrelated, not this task's concern to resolve.

## GATE decision 1: reject the locked fields with a 400, not silent-drop — and defend it in two layers

The DoD accepts either "rejected or silently ignored" for `currentTier`/`current_risk_score`
sent on a write. `lakeUpdateSchema` built `.strict()` (as #10's schemas already are)
already 400s with `unrecognized_keys` on either key, live-probed against the repo's zod
version and confirmed to survive `.omit().partial()`. That's layer 1 and it's free.

**Recommendation:** take the 400, and add a second layer that doesn't depend on zod at
all: a hardcoded `LAKE_WRITABLE_COLUMNS` allowlist in `queries.ts` that `updateLake`
filters `patch` through before it ever reaches `sql(patch)`, with a comment naming
`CryoHealth-api/src/alerts/alerts.service.ts` as the only legitimate writer of
`currentTier` (`current_risk_score` has no writer anywhere yet — it's `0` on all 6 lakes
pending the alert service populating it). Schema-only enforcement means a `.strict()`
dropped in six months silently reopens mass-assignment onto policy columns; the allowlist
makes it structurally unwritable regardless of what the schema does. This is the DoD's
actual security ask — worth a human sign-off before Step 1 locks in the schema shape.

**Also settled here, not a separate GATE item:** the _form_ must never send these keys
either — react-hook-form submits every key in `defaultValues` regardless of whether an
input is bound to it, so seeding the edit dialog's `defaultValues` from the GET row to
render read-only tier/risk-score would make **every PUT 400** (the exact shape of #10's
blocking F1, just from a different cause). Locked fields render as plain JSX off the fetched
lake object (`<TierBadge>`, a `<div>` for the score), never through `useForm`. Step 4's
verification explicitly checks the Network-tab PUT body for this.

## GATE decision 2: `district_id` required on create, `district` (legacy text) auto-derived from it

`lakes.district` is a NOT-NULL varchar still live-consumed by `src/lib/cryohealth-api.ts`
(it maps onto what the public hazard map treats as `district_id`), while this repo's own
queries use the real `district_id` uuid FK. Exposing both as independent editable fields
lets an admin desync them; exposing neither leaves a NOT-NULL column with no way to
satisfy it on create.

**Recommendation:** require `district_id` (uuid) on create and whenever present in an
update patch; derive `district` (text = the matching row's `name`) inside the same
transaction and set both columns in one statement. No separate `district` text field in
the form. This mirrors #10's GATE decision 2 (making `glaciers.source` required though the
column is nullable) — a data-integrity call, not a technical constraint, so it's named
here rather than settled silently.

## Settled, not GATE items (named so they don't get re-litigated mid-build)

- **Route file placement**: net-new `api/admin/lakes.ts` + `lakes.$lakeId.ts`; the public
  GET sibling stays untouched (Headline, above).
- **`slug` is required on create and absent from the update schema entirely**
  (`lakeUpdateSchema = lakeCreateSchema.omit({ slug: true }).partial()`) — curated data,
  not derivable from `name`, and renaming one desyncs the CryoHealth-api seed scripts.
- **UI split**: edit form lives on `admin.lakes.$lakeId.tsx` (the DoD's own wording, and
  where the locked-field explanation naturally sits next to the live tier/score); create +
  delete live on `admin.lakes.index.tsx`. This inverts #10, where every affordance lived on
  one list page — named so it isn't "corrected" back to matching #10 by habit. Extracting a
  shared `LakeFormDialog` used by both pages is the intended shape (a second hand-copied
  form is the cheap-but-wrong alternative).
- **`.coerce.number()` scoped to `area_km2` only** — the sole writable Postgres `numeric`
  column on `lakes`. `downstream_population`/`elevationM` (`integer`) and lat/lng
  (`double precision` via `ST_Y`/`ST_X`) get plain `z.number()`, never `.coerce` — this is
  finding N1 from #10's verify loop, re-applied: `.coerce` on a required field turns
  `null`/`""`/`[]`/`true` into a silently fabricated in-range value instead of a 400.
  `downstream_population` is NOT NULL, unlike districts' nullable `population` — do not
  copy `.nullable()` onto it out of habit.
- **Role gating**: `["cryohealth_admin", "facility_admin"]` on every new write endpoint,
  same as #10, no new reasoning needed.
- **`audit.reason` required on DELETE only**, create/update record a `meta.changed` field
  diff — #10's GATE decision 1, inherited verbatim rather than re-litigated. Reuse
  `deleteReasonSchema` from `admin-schemas.ts` as-is (it already `.trim()`s per finding N6)
  rather than forking it.
- **No changes to any public GET endpoint or its query function** — `lakes-admin.ts`,
  `lakes.$lakeId.ts` (public), `lakes.ts`, `hot-lakes.ts`, `hazard-scores.$lakeId.ts` all
  stay byte-identical.
- **No migration, ever** — every column this task needs already exists.
- **Follow-ups #34 (delete-guard TOCTOU) and #36 (DELETE-with-JSON-body reason
  transport)** are inherited by construction (same delete-guard/DELETE-body shape as #10)
  — not re-fixed here, not silently diverged from either.

## Sizing note

`size:m`, and #10's own sizing note said the same size class ran long. **Cut line,
pre-authorized:** ship PUT/DELETE + the locked-field read-only UI (the DoD's actual
subject, Steps 1-4) first. POST/create (Step 5 — five NOT-NULL columns, `slug`, the
`district` derivation) becomes a same-priority follow-up if the loop budget is under
pressure; the DoD itself calls POST "already partially covered," making it the softest
part of the scope to defer. If Step 5 is cut, the Step 3/6 live-delete test falls back to
a `psql`-inserted throwaway row (column list modeled on
`CryoHealth-api/scripts/seed-lakes.ts:18`) instead of a UI-created lake.

## Plan steps

### Step 0 — pre-flight (no commit)

`bunx tsc --noEmit && bun run lint` baseline green; `docker ps | grep cryohealth-api-db-1`;
`psql` row-count snapshot (`lakes=6`, `alerts=4` with 3 carrying a `lakeId`, `audit`
current count, `districts=2`); snapshot all 6 lake rows (for the no-fabricated-data
diff-back in Step 6); `bun dev`; obtain tokens for `admin-001`/`1234`
(`cryohealth_admin`), `facility-001`/`1234` (`facility_admin`), `chw-001`/`1234` (`chw`, for
the 403 check).
Verify: baseline `tsc`/`lint` pass; tokens obtained; row counts and lake snapshot recorded.

### Step 1 — `src/lib/admin-schemas.ts`: replace the `lakeSchema` stub with `lakeCreateSchema`/`lakeUpdateSchema`

Keys = DB column names verbatim (camel and snake mixed, per Assumptions). `.strict()` on
the base. `.coerce` only on `area_km2`. `district_id` + `slug` + `source` required on
create (GATE 2, settled item). `lakeUpdateSchema = lakeCreateSchema.omit({slug:true}).partial()`.
Locked columns absent, with an expanded comment citing GATE decision 1 and
`alerts.service.ts:103,141,183` as the only legitimate writer.
Verify: `bunx tsc --noEmit`, plus a scratch (uncommitted) node script asserting:
`lakeUpdateSchema.safeParse({currentTier:"critical"})` and
`{current_risk_score:99}` and `{slug:"x"}` all fail with `unrecognized_keys`; a full valid
create payload parses; and — the check that catches the Layer-0 form trap — the exact
object the Step 4 edit form will submit (copied out of its `defaultValues`) parses
successfully, including `area_km2` arriving as the numeric-as-string postgres.js returns.

### Step 2 — `src/lib/queries.ts`: `createLake`/`updateLake`/`deleteLake` + `LAKE_WRITABLE_COLUMNS`

Transactional (`db.begin`, mirroring #10's `writeAudit`/`HasDependentsError` shape).
`updateLake` builds `geom` via the conditional-fragment shape in Assumptions, injects
`updatedAt`, derives `district` text from `district_id` when present (GATE 2), and filters
`patch` through `LAKE_WRITABLE_COLUMNS` before `sql(patch)` (GATE 1 layer 2). Audit diff
built over the original `patch` keys (not the injected `updatedAt`/derived `district`), with
`lat`/`lng` added to the diff explicitly since they aren't real column keys. `deleteLake`
counts all five dependent tables in parallel inside the transaction.
Verify: `bunx tsc --noEmit`; then a scratch (uncommitted) node script that `.describe()`s
the composed UPDATE (Parse-only) for four shapes — scalars only, scalars+coords, coords
only, empty-after-filter — **and** one real round-trip against the dev DB inside a
transaction that's rolled back (`BEGIN; UPDATE ...; ROLLBACK;` equivalent via `sql.begin`
throwing at the end), to execute-verify the fragment composition risk named in
Assumptions before it's relied on further.

### Step 3 — `src/routes/api/admin/lakes.ts` (POST) + `lakes.$lakeId.ts` (PUT/DELETE)

Copy the districts handler sequence exactly (`requireAuth` → `requireRole` →
`parseJsonBody` → `schema.safeParse` → 400 → query fn → 404/200, `mapDbError` in the catch).
23505 branched on `err.constraint_name` (`slug` vs `icimodId` give different messages —
#10's single hardcoded message isn't enough here, there are two unique constraints).
Verify (this is the DoD's real test — `tsc` proves nothing about verb dispatch):

```
# the field lock — all three must 400, and #3 must leave `name` unchanged
PUT .../api/admin/lakes/$ID  {"currentTier":"critical"}                    -> 400 unrecognized_keys
PUT .../api/admin/lakes/$ID  {"current_risk_score":99}                     -> 400
PUT .../api/admin/lakes/$ID  {"name":"LOCK TEST","currentTier":"critical"} -> 400 AND name NOT applied
psql: SELECT name,"currentTier",current_risk_score FROM lakes WHERE id='$ID';  -- unchanged
psql: SELECT count(*) FROM audit WHERE "entityId"='$ID';                      -- unchanged (rollback proof)
# role/error matrix
401 no token · 403 chw token · 400 empty body · 400 malformed JSON · 400 bad UUID param
200 update (psql: updatedAt bumped, currentTier/current_risk_score byte-identical, audit row present)
409 delete on 'shishper' (2 alerts) with counts in the body
200 delete only on a lake created this session (never shishper/khurdopin/badswat/passu/ghulkin/batura)
```

### Step 4 — `admin.lakes.$lakeId.tsx`: edit Dialog with the two locked fields read-only + note

Extend the `LakeRow` type (no query change — `getLakeDetail` already selects `l.*`, only
the TS type is missing `slug`/`nameUr`/`district_id`/`lat`/`lng`). Add a
`useQuery(["admin-districts"])` for the district `Select` (same key as the list page —
dedupes). Locked fields rendered as plain JSX off the fetched lake (`TierBadge` from
`src/lib/tier.tsx`, a plain `<div>` for the score) with a note explaining they're set by
CryoHealth-api's alert service and are read-only by design — never inside `useForm`'s
`defaultValues` (Layer 0, GATE 1).
Verify: `bunx tsc --noEmit && bun run lint`; in the browser, edit a lake and confirm
tier/risk-score render read-only with the note; **inspect the Network tab and confirm the
PUT body contains neither locked key nor `slug`**; confirm the edit succeeds on a lake
with a non-null `area_km2` (the numeric-as-string round-trip); confirm the page and `psql`
both reflect the change and the two locked fields are byte-identical after.

### Step 5 — `admin.lakes.index.tsx`: Actions column + create Dialog + delete AlertDialog

`colSpan` 6→7. Create dialog carries all 5 NOT-NULL-no-default fields + `district_id`
(GATE 2) + `slug` (settled item) with source-provenance helper text mirroring
`admin-schemas.ts`'s existing glacier comment. Per the sizing note, this step is the first
candidate to cut to a follow-up issue if budget is tight.
Verify: `bunx tsc --noEmit && bun run lint`; create a lake end-to-end, confirm all 5
NOT-NULL fields land correctly including `geom`; delete the just-created lake (200); delete
`shishper` → friendly 409 "still referenced by 2 alerts"; `psql`:
`SELECT action,"entityType",reason FROM audit ORDER BY "createdAt" DESC LIMIT 5` shows
`lake.create`/`lake.update`/`lake.delete` with `reason` populated only on the delete row.

### Step 6 — cleanup

`graphify update .`. Full DoD verification command:
`bunx tsc --noEmit && bun run lint && bun run build`, plus the live PUT-lock curl matrix
from Step 3 re-run once more end-to-end, plus a diff of all 6 seeded lake rows against the
Step 0 snapshot (must be byte-identical — nothing in this task's testing may have mutated
cited-source hazard data), plus a final `audit`-table dump confirming
`lake.create`/`lake.update`/`lake.delete` all appear.

## Verification command (from the issue)

`bunx tsc --noEmit && bun run lint && bun run build` + manual: attempt to PUT `currentTier`
directly against the API and confirm it's rejected (400) or silently ignored, not applied.

## Loop budget

3 (fix loop). Escalation: budget exhausted or two identical failure signatures → label
`agent:needs-human`, comment the trail, stop.

## Rollback

Steps 1-3 and 5 are additive (new schema exports, new query functions, new route files).
Steps 4 and 6 touch shipped code in place: Step 4 rewires `admin.lakes.$lakeId.tsx`'s
existing read-only detail page to add an edit affordance; Step 6 is docs/graph-only. If a
step's live verification fails and can't be fixed within the loop budget, `git revert` that
step's commit. No schema/migration changes anywhere, so there is nothing for CryoHealth-api
to roll back in tandem. Any lake rows created during manual testing (Steps 3/5/6) must be
deleted via the API (or `psql` if the delete path itself is what's broken) before closing
out — the six seeded lakes must never be mutated or deleted outside the deliberate
`shishper`/`khurdopin` 409-branch checks, which only read, never write.
