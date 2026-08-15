# PLAN

Goal: [#3 — CryoHealth admin portal — sidebar CRUD + platform monitoring](https://github.com/uExel/cryohealth/issues/3)
Task: [#9 — Read-only admin views: Facilities, CHW profiles, Cases](https://github.com/uExel/cryohealth/issues/9)

Scope: replace the `admin.facilities.tsx`, `admin.chw-profiles.tsx`, and
`admin.cases.tsx` placeholders with real, view-only tables. Unlike #8, this task has
real new data-access work: `listFacilities()` returns `[]` today (its geom filter
correctly excludes the one seeded facility, which has no mapped location), there's no
listing query or endpoint for `cases` at all, and `chw_profiles` has zero rows and zero
writers anywhere in the workspace. The headline decision: `cases` holds
patient-adjacent clinical fields (age, sex, symptoms, diagnosis, treatment, outcome),
and every existing GET in this repo is unauthenticated — the new cases endpoint must be
this repo's first gated GET, not a default-ungated one.

Full exploration: [`docs/ai/planning/task-9-findings.md`](planning/task-9-findings.md)
(written by the uexel-planner agent this session — read it for exact schemas, live seed
data, and the reasoning behind each decision below).

**Process note:** Skipping the `/uexel:plan` step 3 chain to `gstack /autoplan`, for the
same reason tasks #6-#8's plans did — it would append an unrequested "Skill routing"
section to CLAUDE.md and auto-commit it. Reviewed inline instead, via the planner agent.

## Assumptions & blast radius

- **This task is the most expensive of the four read-only-view tasks.** #8 needed zero
  new queries and zero new endpoints; #9 needs 3 new query functions, 1-2 new endpoints,
  and the repo's first gated GET. The `size:s` label may be optimistic — named below,
  not silently re-scoped.
- **`GET /api/public/facilities` returns `[]` today, correctly.** The one seeded
  facility (Hassanabad BHU) has `geom IS NULL` — deliberately, per the workspace's
  no-fabricated-coordinates rule (`seed-dev-data.ts`: no cited coordinate exists). The
  existing query's `WHERE geom IS NOT NULL` filter is load-bearing (feeds `HazardMap`
  markers) and documented as Open Data ("with a mapped location") — it must not be
  touched. A separate admin query is required, not a judgment call.
- **`chw_profiles` has 0 rows and zero references anywhere in all four repos** except
  the migration that creates it and the one that drops it — stronger than #7's
  `lake_risk_scores` finding. This shapes what the CHW profiles page can honestly show.
- **⚠️ Auth and user data are both touched.** The new cases endpoint serves
  patient-adjacent clinical fields and must be the repo's first gated GET — see the
  named GATE decision below, not defaulted to the repo's existing all-ungated pattern.
- **Working tree clean, branch `main`, up to date with `origin/main`** (task #8 pushed
  as `60d8a7c`).

## GATE decision 1 (headline): auth posture for the cases endpoint

`cases` holds `patient_age`, `patient_sex`, `symptoms`, `diagnosis`, `treatment`,
`outcome`. Every GET in this repo today is unauthenticated — a build agent following
the existing pattern would default to an ungated endpoint serving clinical records. The
workspace rule that justifies ungated Open Data is scoped specifically to safety
information ("must never be gated") — patient records are the opposite category, and
the PRD itself calls `cases` "clinical-adjacent."

**Recommendation: gate it**, admitting both `cryohealth_admin` and `facility_admin`
(the sidebar's "Health workforce" group has `adminOnly: false`, so gating to
`cryohealth_admin` only would make the nav lie to `facility_admin`). Use the exact
`requireAuth` + `requireRole(claims, roles)` pattern already established at
`api/public/alerts.ts:12-20` (two-argument `requireRole`, `claims` first — verified
against `auth-guard.ts`, not guessed).

**Sub-decision 1a — where the handler lives:**

- **Option A — add a `GET` to the existing `api/public/cases.ts`.** No new file, no
  `routeTree.gen.ts` churn. Cost: a gated GET under a path segment literally named
  `public`.
- **Option B (recommended) — new `src/routes/api/admin/cases.ts`.** Honest path
  naming, and it's the first file in the `api/admin/` directory the PRD already
  anticipates. Cost: `routeTree.gen.ts` regenerates (mechanical), and it sets a
  directory convention the rest of goal #3 should then follow.

**Sub-decision 1b — CHW attribution on the cases table: name or `lhwId`?** With one CHW
in the system today, `lhwId` pseudonymizes nobody — it's a stable identifier trivially
resolvable via Users & roles. Recommend showing `chw_name`, conditional on 1 landing
gated (behind a gate, knowing which CHW logged a case is the view's supervisory
purpose). If GATE instead chooses ungated, `lhwId` at most.

## GATE decision 2: what "CHW profiles" reads from

- **Option A (recommended) — read `chw_profiles`.** Matches the PRD's domain mapping
  exactly, zero PII escalation, ships an honest empty state naming that no service
  writes this table yet (CHW-profiles CRUD, a later task, is what populates it).
- **Option B — read `users WHERE role = 'chw'`.** Shows one real row, but duplicates
  #16 (Users & roles) filtered by role, pulls `users` PII into a page the PRD scoped to
  a different table, and both `phone`/`facilityId` are NULL on that one row anyway —
  mostly `—` either way.
- **Option C (compromise) — read `chw_profiles`, but the empty state links to Users &
  roles** plus shows the live count of `role='chw'` users (`getKpis()` already returns
  this, zero new cost). Gives the demo something true without duplicating the roster.

**Recommendation: Option A, or C if GATE wants the page to feel less dead.** Either way,
`passwordHash` never appears in a SELECT, and the endpoint stays ungated — under Option
A/C the table has zero rows, so there's zero PII to protect and no reason to manufacture
a second first-gated-GET decision in one task.

## What already exists (reused, not rebuilt)

- All three target routes already exist as flat 9-line `AdminPlaceholder` files with no
  `.index`/`.$id` siblings — the DoD's naming already matches what's on disk. **Do not**
  convert any into an `Outlet` parent (no detail views in this task).
- Sidebar: `AdminShell.tsx:39-47` already has all three "Health workforce" nav entries
  wired — no sidebar work needed.
- Structural precedent: `admin.districts.tsx` (flat table, no filters — model for
  Facilities and CHW profiles) and `admin.protocols.tsx` (badge column + `<details>`
  expander, shipped in #8 — model for Cases, and the exact disaster-badge markup to
  reuse verbatim).
- `requireAuth`/`requireRole` pattern and `AuthError` catch shape, established at
  `api/public/alerts.ts:12-20` — copy verbatim for the gated cases endpoint.
- The global `DemoBanner` (`__root.tsx:151`) already discloses "Case and health records
  shown are sample data" in both languages — **do not add a second banner** on
  `admin.cases.tsx`.

## Settled, not open: the `is_disaster_related` color question

The DoD says the cases table must flag disaster-related rows "visibly, reusing the
existing tier/critical color convention, not a new ad hoc red." This reads as
ambiguous but isn't: `admin.protocols.tsx:101` (shipped in #8, same goal) already
renders the identical `is_disaster` concept as a `--color-accent-soft`/
`--color-accent-ink` pill labeled "Disaster" — **match it exactly**, same classes, same
label. "Reusing the existing color convention" means using the design-system token
machinery, not painting the row CRITICAL red; "not a new ad hoc red" is the same
instruction stated prohibitively. `styles.css`'s design-system header is explicit: red
means CRITICAL and nothing else, never a brand accent. A disaster-related _case_ is not
a hazard _tier_. Two admin pages rendering the same disaster concept in two different
colors would be a worse outcome than either color alone.

Reviewer check: `grep -nE "color-critical|bg-red|text-red" src/routes/admin.cases.tsx`
must return zero matches.

## NOT in scope (explicit non-goals)

- No create/edit/delete on any of the three domains — separate G3 CRUD tasks. No forms,
  no `useMutation`, no PUT/PATCH/DELETE handlers.
- No `src/lib/admin-schemas.ts` changes — the three schema stubs stay empty.
- No migrations, no schema changes. In particular: do not add `cases.deleted_at` (a
  later Cases-CRUD dependency per the PRD, not a #9 dependency — don't block on it), and
  do not convert `facilities.district` into a FK (it's a plain varchar today; rendering
  the string is correct, "fixing" it is a CryoHealth-api schema change).
- No seeding, no fabricated data — specifically, do not invent a coordinate for
  Hassanabad BHU to make the facilities page "look complete," and do not add
  `chw_profiles` rows to make that page non-empty.
- No changes to `listFacilities()`, `listDisasterCasesForDistrict()`, `insertCase()`,
  `getKpis()`, `lakes.tsx`, `HazardMap.tsx`, `chw.tsx`, `admin.index.tsx`, or
  `data.tsx` (including _not_ adding either new endpoint to the Open Data catalogue —
  the cases one explicitly isn't public data, and the facilities-admin one duplicates
  an existing documented entry).
- No fix for the two latent bugs found during exploration (`chw.tsx`'s tier-red disaster
  chip; `data.tsx`'s facilities example payload showing fabricated-looking coordinates
  against a `[]`-returning endpoint) — roll into #8's existing follow-up issue after
  this ships, don't fix here.
- No auth-infrastructure changes beyond the new endpoint's own guard — no changes to
  `auth-guard.ts`, `jwt.ts`, or `admin.tsx`'s client-side gate.
- No `TierBadge`/`Tier`/`isTier` anywhere in this task — none of the three tables has a
  tier column; `facilities.vulnerability` is free text, not a hazard tier.
- No transform on `cases.diagnosis`/`cases.treatment` beyond `?? "—"` — no
  summarization, no AI-assist, ever (this is exactly the domain the dosing/diagnosis
  lookup-table-only rule protects; read-only makes it automatic here, stated anyway).
- No `SELECT *` and no `passwordHash` in any query this task adds.
- No `loader:` introduction — repo convention is uniformly `useQuery`.

## Known traps from the planner's findings

- **`facilities.district` is a bare `varchar`, not a FK** — unlike every other table in
  this codebase. A pattern-matched join (`LEFT JOIN districts ON d.id = f.district`)
  throws `operator does not exist: uuid = character varying` — a 500 at query time.
  Render the string directly.
- **Mixed column casing across all three tables.** `facilities` uses camelCase
  (`"createdAt"`, `"lakeId"`, must be double-quoted); `cases` and `chw_profiles` are
  fully snake_case; `users` mixes both. An unquoted camelCase identifier fails at parse
  time.
- **`users.role` is a DB enum** — `upper(role)` throws at parse time exactly like the
  bug this project has hit before. `WHERE role = 'chw'` is fine; any text function
  needs `::text`. Only relevant if GATE decision 2 picks Option B.
- **No numeric-as-string trap in this task** (contrast #6/#7) — zero `numeric` columns
  across all three tables; `patient_age` is a real `integer`.
- **Six of eleven `cases` columns are nullable, three are NULL in live data**
  (`diagnosis` on two rows, `treatment` on one). Type them `| null`, render `—`, don't
  let `tsc` pass on an untyped `res.json()` value typed too narrowly.
- **`passwordHash` must never appear in any SELECT, row type, or JSON response** —
  `queries.ts` has no user-read function today; this task would introduce the first
  one (only if GATE decision 2 picks Option B). Enumerate columns explicitly.
- **Empty must be distinguishable from error**, especially on `/admin/chw-profiles`
  (0 rows by design). This exact bug consumed #6's fix-loop budget (`0682013`'s sibling
  commit `28a0f77`) — don't reintroduce it.

## Test coverage note

No test framework in this repo. `bunx tsc --noEmit && bun run lint` passes on the
current placeholders, so per-step verification pairs it with something that can
actually fail today — direct `psql` checks of each new query's exact SQL (catches the
`district` join trap and any casing/enum error at parse time, not as a later 500), live
`curl` checks of each new endpoint including the 401 assertion on the gated one, and a
mechanical grep for edit affordances on all three new files.

## Steps

### Step 0 — pre-flight (not a commit)

Confirm, don't assume: `bunx tsc --noEmit && bun run lint` green on `HEAD` before any
edit; `bun dev` up, Postgres on `DB_PORT=5433`, seed run; all three target routes
currently render `AdminPlaceholder`.
**Verify:** note `$DEV_URL` from the dev-server banner (never `:3000`, that's
CryoHealth-api).

```bash
curl -s "$DEV_URL/api/public/facilities" | jq '.facilities | length'   # 0 — the live trap
curl -s "$DEV_URL/api/public/cases"      | jq .                        # no GET handler
psql -h localhost -p 5433 -U cryohealth -d cryohealth \
  -c "select count(*) from facilities;" -c "select count(*) from cases;" \
  -c "select count(*) from chw_profiles;"                              # 1, 4, 0
```

### Step 1 — three new read functions in `src/lib/queries.ts`

Add `listFacilitiesAdmin()`, `listCasesAdmin(limit = 200)`, and (per GATE decision 2)
`listChwProfiles()`. Do not modify `listFacilities()` or
`listDisasterCasesForDistrict()`. Double-quote every camelCase identifier. No
`SELECT *`, no `passwordHash`.
**Verify:** `bunx tsc --noEmit && bun run lint`, plus direct `psql` checks of each
SELECT verbatim — facilities: 1 row, `has_geom = f`, `district = 'Hunza'`; cases: 4
rows, exactly one `is_disaster_related = t`; chw_profiles: 0 rows, no error (proves the
joins don't throw on an empty table).

### Step 2 — `GET /api/public/facilities-admin` (new endpoint, ungated)

New route returning `{ facilities: await listFacilitiesAdmin() }`, mirroring
`api/public/lakes-admin.ts`'s 10-line shape. Facilities are infrastructure reference
data, not PII — ungated is consistent with the existing admin-variant pattern. Do not
add to `data.tsx`'s Open Data catalogue.
**Verify:** `bunx tsc --noEmit && bun run lint`.

```bash
curl -s "$DEV_URL/api/public/facilities-admin" | jq '.facilities | length'   # 1
curl -s "$DEV_URL/api/public/facilities"       | jq '.facilities | length'   # still 0 — unchanged
```

The second line is load-bearing: proves the public/map payload wasn't disturbed.

### Step 3 — the cases endpoint, gated (per GATE decision 1)

Per 1/1a: new `src/routes/api/admin/cases.ts` GET, wrapped in `requireAuth` +
`requireRole(claims, ["cryohealth_admin", "facility_admin"])` inside the same
`AuthError` catch pattern as `api/public/alerts.ts`. Returns
`{ cases: await listCasesAdmin() }`. Do not touch the existing POST handler in
`api/public/cases.ts`. Do not add to `data.tsx`.
**Verify:** `bunx tsc --noEmit && bun run lint`, plus:

```bash
curl -s -o /dev/null -w '%{http_code}\n' "$DEV_URL/api/admin/cases"   # 401, no token
ADMIN_JWT=$(curl -s -X POST "$DEV_URL/api/auth/login" -H 'content-type: application/json' \
  -d '{"identifier":"admin-001","password":"1234"}' | jq -r .accessToken)
curl -s -H "Authorization: Bearer $ADMIN_JWT" "$DEV_URL/api/admin/cases" | jq '.cases | length'   # 4
curl -s -H "Authorization: Bearer $ADMIN_JWT" "$DEV_URL/api/admin/cases" \
  | jq '[.cases[] | select(.is_disaster_related)] | length'   # 1
curl -s -H "Authorization: Bearer $ADMIN_JWT" "$DEV_URL/api/admin/cases" \
  | jq '[.cases[] | has("passwordHash")] | any'   # false
```

The 401 assertion is the one a build pass would otherwise skip — it's the whole point
of this step.

### Step 4 — `admin.facilities.tsx`: real table

Replace the placeholder. One `useQuery` → `/api/public/facilities-admin`, plain
`fetch`. Structure copied from `admin.districts.tsx`. Columns: Name, Type, District
(the raw string, no join), Vulnerability (plain text, not `TierBadge`), Mapped
(`has_geom` → "Yes"/"No location" — the honest surfacing of the NULL-geom fact),
Lat/Lng (`| null` → `—`), Contact (`| null` → `—`), Added (formatted date).
**Verify:** `bunx tsc --noEmit && bun run lint`. Manual at `/admin/facilities`: 1 row,
Hassanabad BHU, type `bhu`, district `Hunza`, vulnerability `high`, Mapped reads "No
location" (proves the new endpoint is in use, not the old `[]`-returning one), contact
renders `—` not "null", date formatted. No-affordance grep clean.

### Step 5 — `admin.chw-profiles.tsx`: real table (per GATE decision 2)

Replace the placeholder. One `useQuery` → the chw-profiles endpoint, plain `fetch`
(ungated per decision 2). Structure copied from `admin.districts.tsx`. Under Option
A/C the page renders its empty state — that copy is the actual deliverable, and it must
name that no service writes `chw_profiles` yet (not fabricate rows, not silently fall
back to `users`).
**Verify:** `bunx tsc --noEmit && bun run lint`. Manual at `/admin/chw-profiles`:
renders the honest empty state (not an infinite loading spinner, not an error banner —
this is exactly the empty-vs-error distinction #6's fix loop existed for), Network
shows HTTP 200 with an empty array, not a 4xx/5xx. `grep -n "passwordHash"
src/lib/queries.ts src/routes/admin.chw-profiles.tsx` → zero matches. No-affordance
grep clean.

### Step 6 — `admin.cases.tsx`: real table with the disaster flag

Replace the placeholder. One `useQuery` against the gated endpoint using **`authFetch`**
(`src/lib/auth-client.ts:51`), not bare `fetch` — the one place in this task where #8's
"plain fetch, all GETs are ungated" guidance does not carry over. Structure copied from
`admin.protocols.tsx`. Columns: Logged (formatted date, server already sorts DESC),
Disaster (the `admin.protocols.tsx:101` accent pill, exact classes, label "Disaster",
`—` on false), Patient (`age · sex`, both nullable → `—`), Symptoms (`<details>`
expander per the protocols precedent), Diagnosis/Treatment/Outcome (`?? "—"`, verbatim
from the DB, no transform), District (`| null` → `—`), CHW (name or lhwId per
sub-decision 1b). No filter bar — 4 live rows doesn't justify one.
**Verify:** `bunx tsc --noEmit && bun run lint`. Manual at `/admin/cases`: 4 rows,
newest first; exactly one row carries the Disaster badge; `grep -nE
"color-critical|bg-red|text-red" src/routes/admin.cases.tsx` → zero matches; badge
markup visually matches `admin.protocols.tsx`; NULL fields render `—` not "null"; the
global `DemoBanner` is visible, no second banner added; **sign out and reload** →
blocked/redirected, and the endpoint returns 401 in Network (proves the gate is
server-side, not just the client route guard). No-affordance grep clean.

### Step 7 — cleanup

`graphify update .` so the graph reflects three real page bodies, three new query
functions, and the new endpoint(s). No removal step — nothing is superseded;
`listFacilities()`, `listDisasterCasesForDistrict()`, and `chw.tsx` all stay untouched.
**Verify:** `graphify query "admin cases disaster related table"` surfaces
`admin.cases.tsx` as a real component node. `bun run build` succeeds.

## Mechanical no-affordance check (used across Steps 4-6)

```bash
grep -nE "<form|useMutation|Trash|Pencil|Edit|Delete|method=\"post\"" \
  src/routes/admin.facilities.tsx src/routes/admin.chw-profiles.tsx src/routes/admin.cases.tsx
```

`useMutation` and `<form>` must have zero matches anywhere. Permitted matches: a
`<details>` body expander's read-only `onClick`.

## Human verification checklist

Run `bun dev`, log in as `cryohealth_admin` (or `facility_admin` — identical read
access per this task's scope, including Cases):

- [ ] `/admin/facilities` — 1 row, Mapped column reads "No location", contact/lat/lng
      render `—` not "null"
- [ ] `/admin/chw-profiles` — honest empty state naming that no service writes this
      table yet, not an infinite spinner or error
- [ ] `/admin/cases` — 4 rows, exactly one Disaster badge (accent color, not red),
      diagnosis/treatment render verbatim with `—` on NULL, global demo banner visible
- [ ] Sign out, try `/admin/cases` directly — blocked, and the endpoint 401s
- [ ] `facility_admin` login reaches all three routes including Cases without a 403
- [ ] Dark mode toggle — disaster badge color still renders correctly on both
      `/admin/cases` and `/admin/protocols`

## Rollback

Each step is one commit; revert in reverse order (7→1). Steps 1's three new functions
are purely additive — no existing function's body changes, so a revert can't break an
existing consumer. Steps 2-6 each touch one new file or one placeholder route — safe to
revert independently. Step 3 (the gated endpoint) is the one step with real blast
radius if reverted after Step 6 ships — the cases page would start 401ing; revert in
commit order, not cherry-picked.

## Sizing note

The `size:s` label may be optimistic — #8 needed zero new queries/endpoints; this task
needs three new query functions, 1-2 new endpoints, and the repo's first gated GET
(7 commits vs. #8's 4). Not silently re-scoping, naming it here: if the session runs
long, the separable piece is **Cases** (Steps 3 and 6, the only part carrying the auth
decision) — Facilities + CHW profiles (Steps 1a/1b, 2, 4, 5) stand alone as a smaller,
coherent commit set if a split becomes necessary.

## Loop budget & escalation

Loop budget: 3 (fix loop), copied from issue #9.
Escalation: budget exhausted or two identical failure signatures → label
`agent:needs-human`, comment the trail, stop.
