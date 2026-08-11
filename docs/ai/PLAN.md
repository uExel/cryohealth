# PLAN

Goal: [#3 — CryoHealth admin portal — sidebar CRUD + platform monitoring](https://github.com/uExel/cryohealth/issues/3)
Task: [#7 — Read-only admin views: Lakes, Lake risk scores, Hazard scores](https://github.com/uExel/cryohealth/issues/7)

Scope: replace the `admin.lakes.index.tsx` and `admin.lakes.$lakeId.tsx` placeholders
with real, view + audit-only pages (Lakes list; Lake detail with `lake_risk_scores` and
`hazard_scores` time series). Add the one missing piece of data access
(`listHazardScores()` + an endpoint) the DoD didn't anticipate already being otherwise
complete. No create/edit/delete anywhere, no auth changes unless GATE picks the gated
endpoint option below.

Full exploration: [`docs/ai/planning/task-7-findings.md`](planning/task-7-findings.md)
(written by the uexel-planner agent this session — read it for exact line numbers,
schemas, and the two public-page bugs found as a side effect).

**Process note:** Skipping the `/uexel:plan` step 3 chain to `gstack /autoplan`, for the
same reason task #6's plan did — `/autoplan` reviews an _existing_ plan file's preamble
and would append an unrequested "Skill routing" section to CLAUDE.md and auto-commit it.
Neither `cryo/CLAUDE.md` nor `cryohealth/CLAUDE.md` has that heading today (re-checked
this session, after this session's own unrelated CLAUDE.md edits). Reviewed inline
instead, via the planner agent above.

## Assumptions & blast radius

- **No migration, no user data, no new admin-schemas.ts entries.** `lakes` schema,
  `lake_risk_scores`, and `hazard_scores` all already exist; CryoHealth-api owns them.
- **One genuine data-access gap, not a pure-UI task.** Unlike #6, this task adds one new
  query function (`listHazardScores`) and one new route file
  (`api/public/hazard-scores.$lakeId.ts`), which regenerates `routeTree.gen.ts`.
- **`admin.index.tsx` gets zero changes.** The DoD's "supersedes today's single-page
  inventory table logic" was already satisfied by #6 (commit `304f614`). There is no
  table left there to remove — only a `lakes-admin` `useQuery` that feeds `HazardMap`'s
  markers and the "N monitored lakes" stat. **Do not touch this file.**
- **One real auth decision, flagged for GATE, not defaulted:** does the new
  `hazard-scores.$lakeId` endpoint require `requireAuth`/`requireRole`, or ship
  ungated like every other `api/public/*` GET today? See "GATE decision" below.
- **Working tree clean, branch `main`, up to date with `origin/main`.**

## GATE decision: hazard-scores endpoint auth posture

New endpoint `api/public/hazard-scores.$lakeId.ts` will return `runId` and `components`
(pipeline internals, not safety data) alongside `score`/`tier`/`computedAt`. Every
existing `api/public/*` GET is unauthenticated; this would be the repo's first gated GET.

- **Gating is cheap**: `authFetch()` (`src/lib/auth-client.ts:51-56`) already reads the
  bearer token from `localStorage` and is used today at `alerts.tsx:68,213` — swapping
  `fetch` for `authFetch` on the client is the only extra cost.
- **Recommendation: gate it** (`requireAuth` + `requireRole(claims, ["cryohealth_admin",
"facility_admin"])`, copying the try/catch shape at `api/public/alerts.ts:12-20`) —
  `components`/`runId` are pipeline internals, not the kind of safety info the
  unauthenticated-Open-Data rule exists to protect, and gating is now a one-word cost.
- **If GATE declines**, ship it ungated (consistent with every other `api/public/*` GET)
  and file the resulting exposure as a follow-up issue instead.

Step 1 and Step 3 below branch on this decision — both paths are written out.

## What already exists (reused, not rebuilt)

- Route triple already scaffolded: `admin.lakes.tsx` (Outlet parent, untouched),
  `admin.lakes.index.tsx`, `admin.lakes.$lakeId.tsx` (both currently `AdminPlaceholder`).
- Sidebar entry already present: `AdminShell.tsx:28` (`/admin/lakes`, `exact: false`) —
  no sidebar work needed.
- `listLakesAdmin()` and `listLakeRiskScores(lakeId)` in `src/lib/queries.ts` — both
  already correct and already consumed elsewhere (public lake page).
- `api/public/lakes-admin.ts` (list) and `api/public/lakes.$lakeId.ts` (detail bundle,
  includes risk-score history as `history`) — both reusable as-is.
- `TierBadge`/`Tier`/`tierClasses` in `src/lib/tier.tsx` — established convention: bare
  `<TierBadge>` in table rows, `solid` only on a detail-page header when `CRITICAL`.
- Structural precedent to copy file-for-file: `admin.glaciers.index.tsx` (list — filters,
  search, house `Table` styling) and `admin.glaciers.$glacierId.tsx` (detail — `Tabs`,
  `StatCard` grid, empty-state pattern), both shipped in #6.
- Chart/time-series precedent: `lakes.$lakeId.tsx:142-178` (recharts `LineChart` with
  `tierClasses` `ReferenceLine`s) — reference only; #7 uses tables, not charts, since the
  DoD asks for "view + audit-only" tables, not a re-implementation of the public chart.

## NOT in scope (explicit non-goals)

- No edit/create/delete affordance anywhere — on `lakes`, `lake_risk_scores`, or
  `hazard_scores`. Lakes CRUD is #11's job (depends on this task).
- No `src/lib/admin-schemas.ts` changes — `lakeSchema` stays an empty stub for #11.
- No new `src/routes/api/admin/` directory.
- No changes to `admin.index.tsx`, the public `/lakes`, `/lakes/$lakeId`, or `HazardMap`.
- No fixes to the two public-page bugs the planner found as a side effect (`NaN%`
  confidence, `Invalid Date` on the public lake page — findings §Risk 4). Filing these as
  a follow-up issue after this task ships, not touching `getLakeDetail()` here — it's
  shared with the public page and dragging it into #7's blast radius isn't warranted for
  a size:s task.
- No seeding of `lake_risk_scores` or `hazard_scores` — the empty series is the correct
  result in both cases (one has literally no writer anywhere in the workspace; see below).
- No `loader:` introduction — repo convention is uniformly `useQuery`.
- No fallback branch added inside `tier.tsx` itself (see Deviation D4 below — the guard
  belongs at the one call site that needs it, not in the shared component).

## Deviations from the DoD's literal text (state now, don't let /uexel:verify discover them)

1. **List table goes in `admin.lakes.index.tsx`, not `admin.lakes.tsx`.** Same
   file-layout deviation #6 made for glaciers (`admin.glaciers.tsx` stayed the bare
   Outlet parent). `admin.lakes.tsx` is unchanged.
2. **"Supersedes today's single-page inventory table logic" is already satisfied** — by
   #6, not by this task. #7 makes zero changes to `admin.index.tsx`. Stated explicitly so
   a build pass doesn't invent a removal and blank `HazardMap`'s lake layer.
3. **New data-access code is required**, despite the DoD's implicitly UI-only framing:
   one query function + one endpoint + a `routeTree.gen.ts` regen. See the GATE decision
   above for the one non-trivial part of it.
4. **`TierBadge` needs a local narrowing guard on the risk-scores tab.**
   `lake_risk_scores.tier` is unconstrained `text` (no enum), and `TierBadge` has no
   fallback branch — an unrecognized value throws. The DoD says "reuses `TierBadge` …
   for every tier column"; the deviation is a guard at the one call site (render
   `TierBadge` for a recognized tier, else the raw string), not a change to `tier.tsx`
   itself, which stays the single source of truth.
5. **The two empty states use different copy, deliberately.** `hazard_scores` has a real
   writer (`CryoHealth-api`'s `POST /alerts/hazard-scores`, called by CryoHealth-geo) —
   its empty state may say so. `lake_risk_scores` has **no writer anywhere in the
   workspace** (verified by grep across both sibling repos, re-verified in Step 0) — its
   empty state must not claim a pipeline populates it; that would be fabricated
   provenance, the exact failure mode the project's "no fabricated hazard data" rule
   exists to prevent. Suggested wording: _"No risk scores recorded. This table is
   scaffolded in the shared schema but no service writes to it yet."_

## Known runtime traps `tsc`/lint cannot catch (from the planner's findings)

- `current_risk_score` (numeric) and `score`/`confidence` (numeric) all arrive as
  **strings** from postgres.js (no `transform` configured) — wrap in `Number(...)`
  before any `.toFixed()`/arithmetic. `admin.index.tsx:44`'s existing `number`
  type annotation for `current_risk_score` is wrong; don't copy it.
- `hazard_scores.tier` is a Postgres **enum** → SQL needs `upper(tier::text)`.
  `lake_risk_scores.tier` is plain **text** → `upper(tier)`, no cast. Getting this
  backwards is silent with an empty table (the exact bug recorded in project memory,
  previously hit and fixed once seed data existed to expose it) — get the SQL form right
  at review time, don't rely on the empty-table dev environment to catch it.
- `hazard_scores.components` is `jsonb NOT NULL` → arrives as a parsed object, not a
  string. Rendering it directly in JSX throws "Objects are not valid as a React child".
  Render via `<pre>{JSON.stringify(h.components, null, 2)}</pre>` inside a
  `<details>`/`<summary>` disclosure.
- `api/public/lakes.$lakeId.ts`'s `lake` object contains **both** `currentTier` (raw
  lowercase enum) and `current_tier` (uppercased alias). Always read `current_tier`.
- Same object has `updatedAt` (from `l.*`), **not** `last_updated` — that alias only
  exists on `listLakesAdmin()`'s output, not `getLakeDetail()`'s.

## Test coverage note

No test framework in this repo. `bunx tsc --noEmit && bun run lint` passes on the
current placeholders, so per-step verification pairs it with something that can actually
fail today: a live `curl`/`jq` check against the dev server (never port 3000 — that's
CryoHealth-api; this dashboard is Vite's default `:5173`, unless the dev-server banner
says otherwise), and a mechanical grep for edit affordances on the two audit tabs.

## Steps

### Step 0 — pre-flight (not a commit)

Confirm, don't assume: `bun dev` up, Postgres on `DB_PORT=5433`, `seed:dev-data` has run;
`git status --short` clean; `bunx tsc --noEmit && bun run lint` green (record warning
count as baseline); `/admin/lakes` currently renders `AdminPlaceholder` (proves routing
works pre-change); re-run `grep -rn lake_risk_scores ../CryoHealth-api/src
../CryoHealth-geo` to reconfirm no writer exists (Step 3's empty-state copy depends on
this still being true).
**Verify:** all of the above hold; note the actual dev-server origin from its banner as
`$DEV_URL` for later steps.

### Step 1 — `listHazardScores()` + `hazard-scores.$lakeId` endpoint

Add `listHazardScores(lakeId)` to `src/lib/queries.ts`:

```ts
export async function listHazardScores(lakeId: string) {
  const sql = await getDb();
  return sql`
    SELECT "runId" AS run_id, score, upper(tier::text) AS tier,
           components, "computedAt" AS computed_at
    FROM hazard_scores
    WHERE "lakeId" = ${lakeId}
    ORDER BY "computedAt" DESC
    LIMIT 120
  `;
}
```

New route `src/routes/api/public/hazard-scores.$lakeId.ts` returning
`{ hazardScores }`. If GATE picked **gated**: wrap in `requireAuth` +
`requireRole(claims, ["cryohealth_admin", "facility_admin"])`, mirroring
`api/public/alerts.ts:12-20`'s try/catch shape. If **ungated**: plain GET handler like
`lakes-admin.ts`. `routeTree.gen.ts` regenerates — commit it in the same commit.
**Verify:** `bunx tsc --noEmit && bun run lint`, then, against `$DEV_URL` (not `:3000`):

- Ungated: `curl -s -o /dev/null -w '%{http_code}' "$DEV_URL/api/public/hazard-scores/$LAKE_ID"` → `200`; body → `{"hazardScores":[]}`.
- Gated: same URL bare → `401`; with `Authorization: Bearer <token>` (via `authFetch`-equivalent curl) → `200`, `{"hazardScores":[]}`.
  Either way: **200 with an empty array, never a 500** (a 500 means the enum-cast is wrong).

### Step 2 — `admin.lakes.index.tsx`: real list

Replace the placeholder, structure copied from `admin.glaciers.index.tsx`: two
`useQuery`s (`lakes-admin`, `districts`) + `districtById` `useMemo`; search-by-name;
district `<select>`; tier filter pills; `isError` amber banner; shadcn `Table` with
house styling; loading/empty rows; name cell links to
`/admin/lakes/$lakeId`. Columns: Lake, District, Tier (`TierBadge`), Risk score
(`Number(...).toFixed(0)`), Downstream population (`.toLocaleString()`), Updated.
**Verify:** `bunx tsc --noEmit && bun run lint`. Manual: `/admin/lakes` shows 6 rows (5
Hunza + 1 Ghizer by district), all tiers NORMAL, risk score 0, downstream 0, no
`.toFixed is not a function` console error. Do not assert row order (unstable with
all-zero scores under `ORDER BY ... DESC NULLS LAST`). Regression check: `/admin` still
renders `HazardMap` with lake markers (confirms `admin.index.tsx` untouched).

### Step 3 — `admin.lakes.$lakeId.tsx`: detail with both time series

Replace the placeholder. `useQuery` → `/api/public/lakes/${lakeId}` (404 → not-found
state, matching `admin.glaciers.$glacierId.tsx:66`'s handling) and a second `useQuery` →
Step 1's hazard-scores endpoint (via `authFetch` if GATE picked gated). Tabs:
**Overview** (`StatCard` grid + `Meta` rows; header `TierBadge` with
`solid={lake.current_tier === "CRITICAL"}`) · **Risk scores** (`Table`: Observed at /
Score / Tier with the D4 narrowing guard / Confidence; empty state uses the D5 honest
copy — no writer exists) · **Hazard scores** (`Table`: Computed at / Score / Tier /
Run ID (`font-mono text-xs`) / Components (`<details>` + `JSON.stringify`); empty state
may cite the CryoHealth-geo pipeline path). Every numeric wrapped in `Number(...)`. Read
`current_tier` and `updatedAt` per the traps above, not `currentTier`/`last_updated`.
**Verify:** `bunx tsc --noEmit && bun run lint`. Manual: open Badswat's detail → district
Ghizer, both time-series tabs show their (different) empty states, no console error.
Mechanical affordance check:

```bash
grep -nE "<button|onClick|Trash|Pencil|Edit|Delete|<form" src/routes/admin.lakes.\$lakeId.tsx
```

returns nothing (or only `TabsTrigger`, which is navigation, not an edit affordance).
Keyboard-tab through both audit tabs: no focusable control besides the tab triggers.

### Step 4 — cleanup

`graphify update .` so the graph reflects the new query, endpoint, and two real page
bodies. No file removal step — Deviation 2 established there's nothing left to supersede.
**Verify:** `graphify query "admin lakes hazard scores"` surfaces `listHazardScores()` as
a node (it does not today). `bun run build` succeeds.

## Human verification checklist

Run `bun dev`, log in as `cryohealth_admin` (or `facility_admin` — identical read access
per this task's scope):

- [ ] `/admin/lakes` — 6 rows, correct district split, all NORMAL tier badges, no
      create/edit/delete UI
- [ ] `/admin/lakes/<Badswat's id>` — Overview tab (district Ghizer), Risk scores tab
      (honest "no writer yet" empty state, not the pipeline-runs wording), Hazard scores
      tab (pipeline-runs empty state)
- [ ] `/admin` — unchanged: StatCards + HazardMap still render lake markers
- [ ] Dark mode toggle — `TierBadge` colors still change
- [ ] `facility_admin` login reaches both new routes without a 403
- [ ] If the hazard-scores endpoint shipped gated: confirm a logged-out `curl` gets 401,
      not a leak of `components`/`runId`

## Rollback

Each step is one commit; revert in reverse order (4→3→2→1). Step 1 is additive only
(new function, new file) — safe to revert alone. Steps 2 and 3 each touch exactly one
placeholder route file — safe to revert independently of each other and of Step 1 (the
placeholders don't call the new endpoint, so reverting Step 1 after Step 3 ships would
break the detail page; revert in commit order, not cherry-picked). No migrations, no
generated-route-tree conflicts expected beyond the routine `routeTree.gen.ts` diff.

## Follow-ups to file (not part of this task, don't fix here)

- Public `/lakes/$lakeId` page: `lake.current_confidence` reads a column that doesn't
  exist (renders `NaN%`); `lake.last_updated` isn't aliased on `getLakeDetail()`'s
  output (renders `Invalid Date`). File after #7 ships, since `getLakeDetail()` is
  shared and touching it now would drag the public page into this task's blast radius.
- `listLakeRiskScores()`'s `ORDER BY observed_at ASC LIMIT 120` returns the _oldest_ 120
  rows once real data lands past that limit — correct for the public chart's x-axis,
  wrong for an audit view. Harmless today (table is empty). Not fixed here because the
  query is shared with the public chart.

## Loop budget & escalation

Loop budget: 3 (fix loop), copied from issue #7.
Escalation: budget exhausted or two identical failure signatures → label
`agent:needs-human`, comment the trail, stop.
