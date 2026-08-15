# PLAN

Goal: [#3 — CryoHealth admin portal — sidebar CRUD + platform monitoring](https://github.com/uExel/cryohealth/issues/3)
Task: [#8 — Read-only admin views: Alerts, Alert acknowledgements, Protocols](https://github.com/uExel/cryohealth/issues/8)

Scope: replace the `admin.alerts.tsx` and `admin.protocols.tsx` placeholders with real,
view-only pages. Add two columns (`status`, `cleared_at`) to the existing
`listAllAlerts()` query so the admin table can show cleared alerts distinctly — the
DoD's "all alerts including cleared" is already satisfied at the row-set level (no
`WHERE` filters out cleared rows) but not at the display level. No create/edit/delete
anywhere, no new endpoints, no auth changes.

Full exploration: [`docs/ai/planning/task-8-findings.md`](planning/task-8-findings.md)
(written by the uexel-planner agent this session — read it for exact schemas, live
seed-data state, and the two latent bugs found as a side effect).

**Process note:** Skipping the `/uexel:plan` step 3 chain to `gstack /autoplan`, for the
same reason tasks #6 and #7's plans did — `/autoplan` reviews an existing plan file's
preamble and would append an unrequested "Skill routing" section to CLAUDE.md and
auto-commit it. Reviewed inline instead, via the planner agent above.

## Assumptions & blast radius

- **This task is cheaper than #6 or #7.** No new query functions, no new endpoints, no
  `routeTree.gen.ts` churn, no route-triple/file-layout deviation (both target files are
  already flat leaf routes on disk, matching the DoD's literal naming), no `TierBadge`
  narrowing guard needed (`alerts.tier` is a DB enum, unlike #7's `lake_risk_scores.tier`
  which is unconstrained text).
- **One shared-query change, scoped to its own commit.** `listAllAlerts()` backs both
  the new admin page and the existing public `/alerts` page and the documented Open
  Data endpoint `GET /api/public/alerts` (`src/routes/data.tsx:73`, with a published
  example payload). Adding `status`/`cleared_at` is additive (existing consumers ignore
  unknown fields) but it does touch a documented public API surface — flagged for GATE
  below, not defaulted.
- **Sidebar and role gate need zero changes.** `AdminShell.tsx:31-38` already has both
  nav entries; `admin.tsx`'s `isAdmin` gate already wraps every `admin.*` child route.
- **Working tree clean, branch `main`, up to date with `origin/main`** (verified this
  session, task #7 pushed as `9fd9c02`).

## GATE decision: how `status`/`cleared_at` reach the admin page

The DoD requires showing cleared alerts distinctly. `listAllAlerts()` already returns
cleared rows (no `WHERE`) but selects neither column.

- **Option A (recommended) — add both columns to the existing `listAllAlerts()`.**
  Additive to a shared query; the public page and Open Data consumers ignore unknown
  fields. One commit, no new files. Cost: it's an additive change to a _documented_
  public payload (`data.tsx`'s example response goes one line stale unless updated in
  the same commit — recommended). Argument beyond convenience: whether an alert is
  cleared is itself safety information, the exact category the workspace rule says must
  never be gated behind auth ("Open Data endpoints are intentionally unauthenticated —
  safety info must never be gated"). Publishing it is arguably a correction, not a leak.
- **Option B — a new `listAllAlertsAdmin()` + a new admin-only endpoint.** Keeps the
  public payload byte-identical. Cost: a near-duplicate query, a new route file,
  `routeTree.gen.ts` churn, and a fresh auth-posture question this repo doesn't have
  today (zero gated GETs besides #7's hazard-scores endpoint) — reintroducing #7's
  entire GATE decision for a task that otherwise has none.

**Recommendation: Option A**, with `data.tsx`'s example payload updated in the same
commit.

## GATE decision: acknowledgement display — count, or count + names?

The DoD says acks shown "inline on each alert row as view-only." The existing
`alerts.tsx:85` precedent already does a plain count via the ungated, undocumented
`/api/public/alert-acks` — zero new code needed for that reading.

- **Count only (recommended).** Fully served by existing code. Showing _who_
  acknowledged would require a `users` join that doesn't exist anywhere in `queries.ts`
  today, and would expose CHW identity via an endpoint that is currently ungated and
  undocumented — a real privacy escalation, not a display change.
- **Count + most-recent `acknowledged_at`.** `listAlertAcks()` already returns that
  field — zero new data access, zero privacy escalation (no name, no uuid), more
  audit-useful than a bare integer. Worth naming since PRD §5 frames these as audit
  surfaces, but not required by the DoD's literal text.
- **Declined: names.** Real scope growth (new query, privacy question) that overlaps
  #9/#16 (CHW profiles, Users & roles) — a separate task, not this one.

**Recommendation: count only** (the DoD's literal reading), with count + latest
timestamp as a cheap upgrade if GATE prefers it — both ship with zero new endpoints.

## What already exists (reused, not rebuilt)

- Both target routes already exist as flat 9-line `AdminPlaceholder` files with no
  `.index`/`.$id` siblings — the DoD's naming already matches what's on disk. **Do not**
  convert either into an `Outlet` parent (unlike #6/#7's `admin.lakes.tsx`-style
  parents, these are leaf routes with no detail view).
- All three data paths already exist and are wired: `listAllAlerts()` →
  `GET /api/public/alerts`, `listAlertAcks()` → `GET /api/public/alert-acks`,
  `listProtocols()` → `GET /api/public/protocols`. `listAllAlerts()` already joins
  `lakes`/`districts` in-row — no second `useQuery` needed for those columns, unlike
  #7's `listLakesAdmin()`.
- `TierBadge`/`Tier` (`src/lib/tier.tsx`) — `alerts.tier` is already
  `upper(a.tier::text)`, a DB enum, safe to feed directly with **no narrowing guard**
  (do not copy `admin.lakes.$lakeId.tsx`'s `isTier()` — that guard exists because
  `lake_risk_scores.tier` is unconstrained text; `alerts.tier` is constrained by the
  database itself).
- Structural precedent to copy file-for-file: `admin.districts.tsx` (flat table, no
  filters — model for `admin.protocols.tsx`) and `admin.glaciers.index.tsx` (search +
  filter bar + combined error banner — model for `admin.alerts.tsx`).
- `alerts.tsx:85`'s `ackCount` filter expression — copy the expression only, not that
  page's query options (`enabled: !!user`, a `user`-scoped `queryKey`); `admin.tsx`
  already gates the whole `/admin` subtree, so the ack query here needs no auth
  conditioning.

## NOT in scope (explicit non-goals)

- No create/edit/delete on alerts, acks, or protocols — Alerts CRUD is #12, Protocols
  CRUD is #13. Acknowledgements are view-only _permanently_ (PRD: "derived from CHW
  action, not admin-authored"), not a placeholder for a future edit form.
- No `src/lib/admin-schemas.ts` changes, no new `src/routes/api/admin/` directory, no
  new endpoints, no PUT/DELETE anywhere.
- No changes to `src/routes/alerts.tsx` (public feed/broadcast form), `chw.tsx`,
  `admin.index.tsx`, or `open-alerts.ts`. The only shared file touched is
  `src/lib/queries.ts` (Step 1), plus `data.tsx`'s example payload if GATE approves the
  status/cleared_at Option A above.
- No fixes for the two latent bugs found during exploration (§ below) — filed as a
  follow-up issue instead, matching the #7 precedent for non-blocking findings.
- No widening of `StatCard.tsx`'s shared `STATUS_CLASSES` map with `active`/`cleared`
  keys — that map is documented as glacier-stability-specific; a local inline pill in
  `admin.alerts.tsx` is the correct scope.
- No `chips`/`checklist` in any SELECT — jsonb columns, not needed here, same
  React-child hazard #7 handled for `hazard_scores.components`.
- No migrations, no seeding, no cleanup of the pre-existing "test smoke check" alert
  row (dev noise from earlier manual testing — leave it; it's a useful null-safety
  case, since it has both `lake_name` and `district_name` NULL).
- No `loader:` introduction — repo convention is uniformly `useQuery`.
- No `isTier` guard and no fallback branch added to `tier.tsx` itself.
- No AI-assist / "improve wording" affordance on protocols, ever (PRD, both CLAUDE.md
  files: dosing/diagnosis text is lookup-table-only). Trivially satisfied by read-only,
  stated because this task's subject matter is exactly what that rule protects.

## Known traps from the planner's findings

- **No numeric-as-string trap in this task** (notable absence vs. #6/#7) — zero
  `numeric` columns across `alerts`/`alert_acknowledgements`/`protocols`.
  `affected_population` is a real `integer`, `is_disaster` a real `boolean`. Do not add
  defensive `Number(...)` wrappers where none are needed.
  - **`upper()` on an enum column without `::text` throws at parse time** — verified
    live (`ERROR: function upper(tier) does not exist`). `listAllAlerts` already gets
    `tier` right; the new `status::text` column is where this mistake would land if
    copied wrong. Cast is required, and `"clearedAt"` needs double-quoting (camelCase
    column), same as the existing `"createdAt"`/`"lakeId"` in that query.
  - **Keep `status` lowercase** (`a.status::text`, no `upper()`) — format for display in
    the UI, don't uppercase in SQL. Unlike `tier`, `TierBadge` doesn't consume `status`.
  - `lake_name`/`district_name` are `LEFT JOIN` results and **are genuinely NULL on a
    live seeded row** (the "test smoke check" alert) — type them `string | null`, not
    `string`, and guard before any `.toLowerCase()` in a search filter.
  - `protocols.body` is long multi-line text (up to 454 chars, `\n`-joined `STEP N ·`
    lines) — a naive `TableCell` renders it as one unreadable line and breaks table
    width. Needs truncate + expand with `whitespace-pre-line`, not a raw render.
  - **Cleared-alert visual treatment must not use tier-red.** Workspace CLAUDE.md: "Red
    alert severity means CRITICAL and nothing else — never repurpose it." Same trap
    exists in `chw.tsx:133`'s disaster-protocol chip (not touched by this task, but
    don't copy that line as a pattern for the protocols "Disaster" column either — use
    a neutral or `--color-accent-soft` pill for both).
  - Format `created_at`/`cleared_at` as dates, never raw ISO strings — this is exactly
    the bug #7's fix-loop commit `0682013` fixed; don't reintroduce it here.

## Two live latent bugs found (not fixed here — filed as a follow-up)

1. **`listOpenAlerts()` has no status filter** — `WHERE tier IN ('high','critical')`
   with no `AND status = 'active'`. `chw.tsx` renders this under "No active
   HIGH/CRITICAL alerts," so a cleared HIGH/CRITICAL alert would show as active to a
   CHW. A genuine, if currently invisible (no cleared HIGH/CRITICAL exists in dev
   today), safety-UX bug. Out of scope — `chw.tsx` isn't touched by this task.
2. **Cleared alerts render identically to active ones on two public surfaces** — the
   public `/alerts` feed and the public lake-detail page (via `listAlertsForLake()`,
   which also omits `status`). Live today: the seeded cleared Khurdopin alert appears
   current on both. Out of scope per the DoD ("no changes to the public /alerts page
   unless truly required") — but if GATE approves this task's Option A, the _feed_
   half becomes trivial to fix later since `status` would already be in the payload;
   `listAlertsForLake()` would still need its own column added separately. The
   follow-up issue must name both call sites so a future fix doesn't close it half-done.

File one follow-up issue covering both after this task ships, same pattern as #27/#28/#29.

## Test coverage note

No test framework in this repo. `bunx tsc --noEmit && bun run lint` passes on the
current placeholders, so per-step verification pairs it with something that can
actually fail today: live `curl`/`jq` checks against the dev server (origin read off
the `bun dev` banner — never assume `:5173`, and never `:3000`, which is
CryoHealth-api), and a mechanical grep for edit/mutation affordances on both new files.

## Steps

### Step 0 — pre-flight (not a commit)

Confirm, don't assume: `bunx tsc --noEmit && bun run lint` green on `HEAD` _before any
edit_ (establishes the baseline so a pre-existing failure isn't misattributed to Step
1); `bun dev` up, Postgres on `DB_PORT=5433`, seed run; `/admin/alerts` and
`/admin/protocols` currently render `AdminPlaceholder`; re-confirm
`CryoHealth-api/src/alerts/alerts.service.ts:167` is still the only `status='cleared'`
writer.
**Verify:** all hold. Note the actual dev-server origin as `$DEV_URL`. Live counts:

```bash
curl -s "$DEV_URL/api/public/alerts"     | jq '.alerts | length'   # ≥3 (4 in this dev DB)
curl -s "$DEV_URL/api/public/alert-acks" | jq '.acks | length'     # 1
curl -s "$DEV_URL/api/public/protocols"  | jq '.protocols | map(.slug)'  # glof-evacuation-checklist first
```

### Step 1 — `listAllAlerts()`: add `status` + `cleared_at`

`src/lib/queries.ts:126-138`: add `a.status::text AS status, a."clearedAt" AS
cleared_at` to the SELECT. No other change — no `WHERE`, no `ORDER BY` change. If GATE
approved Option A, update `src/routes/data.tsx`'s alerts example payload in the same
commit.
**Verify:** `bunx tsc --noEmit && bun run lint`, plus:

```bash
curl -s "$DEV_URL/api/public/alerts" | jq '.alerts[] | {title, status, cleared_at}'
# → exactly one row status "cleared" with a non-null cleared_at (Khurdopin drainage slowing)
# → the rest "active" with cleared_at null
```

Load-bearing: HTTP 200 with both keys present, never a 500 (a 500 means the enum cast
was written wrong — `upper(a.status)` instead of `a.status::text`). Then reload the
public `/alerts` page and confirm it's visually unchanged — new fields must not break it.

### Step 2 — `admin.alerts.tsx`: real table

Replace the placeholder. Two `useQuery`s (`admin-alerts` → `/api/public/alerts`,
`admin-alert-acks` → `/api/public/alert-acks`), plain `fetch` with `isError` handling.
`ackCount` copied from `alerts.tsx:85`'s filter expression only. Search + tier filter +
status filter (default ALL — required for "including cleared" to actually show by
default). Combined `isError` amber banner, shadcn `Table` with house styling
(`max-w-7xl`, per `admin.glaciers.index.tsx`). Columns: Tier (`TierBadge`, bare), Title
(not a link — no detail route), Status (+ formatted `cleared_at` on cleared rows,
neutral pill, never tier-red), Target (`lake_name ?? district_name ?? "—"`), Window,
Affected (`.toLocaleString()`, no `Number()` needed — real integer), Acks (`ackCount`,
plain count, no button), Issued (formatted date).
**Verify:** `bunx tsc --noEmit && bun run lint`. Manual at `/admin/alerts`: ≥4 rows, one
cleared (Khurdopin, WATCH) visible with status filter on ALL; tier badges match seed
data (CRITICAL/HIGH/WATCH/NORMAL); ack column shows `1` on "Meltwater surge in
Hassanabad", `0` elsewhere; "test smoke check" row renders `—` for both lake and
district; dates formatted, not raw ISO; status filter set to `cleared` leaves exactly
one row; no-affordance grep (below) clean.

### Step 3 — `admin.protocols.tsx`: real table

Replace the placeholder. One `useQuery` (`admin-protocols` → `/api/public/protocols`).
Structure copied from `admin.districts.tsx`. Columns: Title, Category, Disaster
(neutral/accent badge on `true`, `—` on `false` — **not** tier-red, not `chw.tsx:133`'s
pattern), Source, Slug (`font-mono text-xs`), Body (truncate + expand,
`whitespace-pre-line` when expanded), Created (formatted date). Preserve server-side
`is_disaster DESC` order — no client-side re-sort.
**Verify:** `bunx tsc --noEmit && bun run lint`. Manual at `/admin/protocols`: 2 rows,
`glof-evacuation-checklist` first (proves order preserved); IMCI body shows its 4
`STEP N ·` lines on separate lines when expanded, doesn't blow out collapsed row width;
grep the file for `color-critical` → zero matches; no-affordance grep clean.

### Step 4 — cleanup

`graphify update .` so the graph reflects both real page bodies. No removal step —
nothing is superseded; the public `/alerts` page and `chw.tsx` both stay untouched.
**Verify:** `graphify query "admin alerts acknowledgements table"` surfaces
`admin.alerts.tsx` as a real component node (today it resolves only to
`AdminPlaceholder`). `bun run build` succeeds.

## Mechanical no-affordance check (used across Steps 2-3)

```bash
grep -nE "<button|onClick|<form|Trash|Pencil|Edit|Delete|useMutation" \
  src/routes/admin.alerts.tsx src/routes/admin.protocols.tsx
```

Permitted matches: filter pills, a search input's clear control, a `<details>`-style
body expander — all read-only view state, not edit affordances. Don't strip search
boxes/selects to force a clean grep. `useMutation` must have zero matches anywhere.

## Human verification checklist

Run `bun dev`, log in as `cryohealth_admin` (or `facility_admin` — identical read access
per this task's scope):

- [ ] `/admin/alerts` — ≥4 rows, one cleared alert visible and visually distinguished
      without using tier-red, status filter defaults to ALL, filtering to `cleared`
      isolates it, ack counts correct (1 on Meltwater surge, 0 elsewhere)
- [ ] `/admin/protocols` — 2 rows, disaster protocol first, body text readable
      (truncated + expandable), no tier-red on the disaster badge
- [ ] No create/edit/delete UI anywhere on either page
- [ ] Dark mode toggle — `TierBadge` colors still change on the alerts table
- [ ] `facility_admin` login reaches both routes without a 403
- [ ] Public `/alerts` page still renders correctly after Step 1's query change (no
      visual regression from the two added fields)

## Rollback

Each step is one commit; revert in reverse order (4→3→2→1). Steps 2 and 3 each touch
exactly one placeholder route file — safe to revert independently. Step 1 changes a
shared query (`listAllAlerts`) consumed by the public `/alerts` page too — revert it
last if Steps 2/3 are already live, since the admin page's status filter depends on the
columns it adds. No migrations, no generated-route-tree conflicts (no new route files
in this task, unlike #7).

## Follow-ups to file (not part of this task, don't fix here)

- `listOpenAlerts()` has no `status` filter — a cleared HIGH/CRITICAL alert would
  render as active on `chw.tsx`. Currently invisible (no such row exists in dev) but a
  real latent safety-UX bug.
- Cleared alerts render identically to active ones on the public `/alerts` feed and the
  public lake-detail page (`listAlertsForLake()`, which also omits `status`). File one
  issue naming both call sites so a future fix doesn't close it half-done.

## Loop budget & escalation

Loop budget: 3 (fix loop), copied from issue #8.
Escalation: budget exhausted or two identical failure signatures → label
`agent:needs-human`, comment the trail, stop.
