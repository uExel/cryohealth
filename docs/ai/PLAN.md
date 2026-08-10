# PLAN

Goal: [#3 — CryoHealth admin portal — sidebar CRUD + platform monitoring](https://github.com/uExel/cryohealth/issues/3)
Task: [#6 — Read-only admin views: Districts, Glaciers, Glacier observations](https://github.com/uExel/cryohealth/issues/6)

Scope: build `/admin/districts` and `/admin/glaciers` (list + `$glacierId` detail with
observation history) as real, view-only pages, replacing today's `AdminPlaceholder`
stubs. No create/edit/delete controls, no new data-access code, no auth changes.

**Process note:** `/uexel:plan`'s step 3 calls for chaining `gstack /autoplan`. Skipped
deliberately — `/autoplan` reviews an _existing_ plan file (none exists yet; this plan
is that file) and its preamble would append a "Skill routing" section to CLAUDE.md and
auto-commit it (neither `cryo/CLAUDE.md` nor `cryohealth/CLAUDE.md` has that heading
yet), an unrequested repo mutation mid-planning. Reviewed inline instead against the
product/design/eng lenses the task actually needs, sized to a size:s, view-only task.

## Assumptions & blast radius

- **No auth, no migration, no user data, no new API routes.** Every query
  (`listDistricts`, `listGlaciers`, `getGlacier`, `listGlacierObservations`) and every
  GET handler (`api/public/districts.ts`, `api/public/glaciers.ts`,
  `api/public/glaciers.$glacierId.ts`) the DoD implies **already exists** — confirmed by
  the planning agent. This task is pure UI: two placeholder route files get real bodies,
  one existing route file (`admin.index.tsx`) loses a section it shouldn't have kept.
- **Role gating needs zero changes.** `admin.tsx`'s client-side `useAuth().isAdmin` gate
  (`cryohealth_admin` OR `facility_admin`) already wraps every `admin.*` child route,
  matching the goal's "For whom" section for this task. `requireRole` (hardened in #5)
  has no relevance here — it gates mutating API routes, and this task adds none.
- **Working tree clean, branch `main`, up to date with `origin/main`** (verified this
  session).
- **Blast radius: `admin.index.tsx` is edited outside the DoD's literal file list** (see
  Deviation 1). This is the one change in this plan that touches a file the issue didn't
  name — flagged for GATE, not slipped in silently.

## What already exists (reused, not rebuilt)

- `src/lib/queries.ts:6-45` — `listDistricts()`, `listGlaciers()`, `getGlacier(id)`,
  `listGlacierObservations(glacierId)`. No new query functions needed.
- `src/routes/api/public/districts.ts`, `glaciers.ts`, `glaciers.$glacierId.ts` — already
  return `{ districts }`, `{ glaciers }`, `{ glacier, observations, lakes, cases }`
  respectively (the last 404s on a missing glacier).
- `src/components/cryohealth/StatCard.tsx` — `StatCard`, `StatusPill` (from #5).
- `src/components/ui/table.tsx` — `Table/TableHeader/TableBody/TableRow/TableHead/TableCell`.
  `src/components/ui/tabs.tsx` — `Tabs/TabsList/TabsTrigger/TabsContent`. Both installed,
  zero consumers today — this task is genuinely their first use, as the DoD says.
- `src/components/cryohealth/AdminShell.tsx` `NAV_GROUPS` — Districts/Glaciers sidebar
  entries already point at `/admin/districts` / `/admin/glaciers`. No sidebar edit needed.
- `src/routes/admin.lakes.tsx` / `.index.tsx` / `.$lakeId.tsx` — the settled three-file
  triple convention (Outlet parent / list / detail) this task's Glaciers routes mirror.
- `src/routes/glaciers.$glacierId.tsx` (public, 19KB) — working precedent for
  `StatCard`/`StatusPill` usage, typed row shapes, and an explicit "No observations
  yet." empty state (L296-302). Model the new detail page's structure on it, not its
  600+ lines of public-page chrome.
- `src/routes/admin.index.tsx:123-228` — existing search/district/status-filtered
  glacier register `<table>`. This is the content that moves in Step 2 (see Deviation 1),
  not new work.

## NOT in scope (explicit non-goals)

- **Seeding synthetic `glacier_observations` rows.** The seed script deliberately leaves
  this table empty (CryoHealth-geo pipeline output, not admin-entered data — see
  workspace CLAUDE.md's "no silent ML / human-auditable reason" framing and this
  session's memory rule against fabricated hazard data). **The empty observations table
  at `/admin/glaciers/<any-id>` is the correct, expected result of this task** — do not
  "fix" it by inserting fake rows, in build or in verify.
- **Editing `districtSchema`/`glacierSchema` in `admin-schemas.ts`.** Those are #10/#11's
  job; this task never imports them.
- **Any create/edit/delete control**, per the DoD.
- **Districts detail page.** The DoD only asks for a districts _table_; no `$districtId`
  route exists in the sidebar or DoD text, and none is added here.

## Deviations from the DoD's literal text (state now, don't let /uexel:verify discover them)

1. **The glacier table moves from `admin.index.tsx` into `admin.glaciers.index.tsx`,
   not `admin.glaciers.tsx`.** The DoD names `admin.glaciers.tsx`, but that file is the
   route-triple's Outlet parent (`component: () => <Outlet />`) — putting a table there
   renders it above every detail page too. The lakes triple already settles this file
   layout; glaciers follows it. **Named GATE decision:** move `admin.index.tsx`'s
   existing register `<section>` (L123-228) into the new `admin.glaciers.index.tsx`
   (converted to shadcn `Table`, links retargeted from the public
   `/glaciers/$glacierId` to `/admin/glaciers/$glacierId`), leaving `/admin` as
   StatCards + HazardMap only. **Rejected alternative:** leave `admin.index.tsx`'s table
   in place and build a second, duplicate glacier table at `/admin/glaciers` — rejected
   because it re-creates exactly the duplication #5 spent five steps eliminating, and
   two tables linking to two different detail routes (public vs admin) for the same
   data is a worse UX than the DoD's placeholder was.
2. **No new queries land in `src/lib/queries.ts`,** despite the DoD's "existing/new GET
   queries" phrasing. All four needed functions already exist (see above). Documenting
   this now so `/uexel:verify` doesn't read a zero-diff `queries.ts` as a missed DoD
   line — the DoD's wording anticipated work that turned out to already be done in an
   earlier task.
3. **The glacier detail page reuses `api/public/glaciers/$glacierId`'s bundle endpoint**
   (glacier + observations + all lakes + district cases) rather than adding a lean
   `api/admin/glaciers.$glacierId.ts`. **Named GATE decision, recommend reuse:** zero
   new server code, at the cost of an admin page fetching lakes/cases data it discards.
   For a view-only, size:s task this is the right trade; PRD §4's lean-endpoint pattern
   is available as a follow-up if the extra payload becomes a real cost once #14/#15
   (facilities/cases CRUD) land.
4. **`Tabs` placement, named GATE decision:** `admin.glaciers.$glacierId.tsx` gets two
   tabs — **Overview** (StatCard grid: area/length/elevation/status, district, source,
   `last_observed`) and **Observations** (the `glacier_observations` history table, with
   the empty state from the NOT-in-scope note above). This is the only place in this
   task's scope `Tabs` has a natural fit (Districts and the Glaciers list are each one
   flat table) — deciding it now, in the plan, rather than improvising at build time, so
   the DoD's "first real consumers" clause is met deliberately, not accidentally.

## Test coverage note

No test framework in this repo. `bunx tsc --noEmit && bun run lint` cannot catch: a
`numeric` Postgres column (`area_km2`, `length_km`, etc., all arrive as `string` via
`postgres.js`) rendered without `Number(...)` before `.toFixed()` — a runtime throw
`tsc` won't flag since the query result types may already claim `number`; a `Table`
migration that visually regresses the house style (flat 2px borders, no shadow, no
radius per PRD design rules) because shadcn's defaults weren't overridden; or the
`admin.index.tsx` trim accidentally deleting the StatCards/HazardMap section instead of
just the register. Per-step manual checks below cover what `tsc`/lint structurally can't.

## Steps

### Step 0 — pre-flight (not a commit)

Confirm clean tree and green baseline: `git status --short` (expect only untracked
`docs/ai/planning/` and graphify cache files), `bunx tsc --noEmit && bun run lint`.
**Verify:** both exit 0; record current lint warning count as this step's baseline for
later regression checks.

### Step 1 — `admin.districts.tsx`

Replace the `AdminPlaceholder` body with: `useQuery(["admin-districts"], () =>
fetch("/api/public/districts").then(r => r.json()))`, render via shadcn `Table`
(columns: Name, Province) styled to match the house table look (`bg-secondary/50
text-xs uppercase text-muted-foreground` head, `divide-y divide-border` body,
`hover:bg-secondary/40` rows — the pattern already used in `admin.index.tsx`'s current
table, passed as `className` overrides on the shadcn primitives so the PRD's flat/no-
radius/no-shadow rules hold). Loading state (skeleton or "Loading…" row) and empty
state ("No districts yet.") both explicit, not blank. Keep the existing `head:` meta
block pattern from sibling admin pages.
**Verify:** `bunx tsc --noEmit && bun run lint` (no new warnings vs. Step 0 baseline).
Manual: `bun dev`, log in as `cryohealth_admin`, visit `/admin/districts` → 2 rows,
`Hunza` / `Gilgit Baltistan` and `Ghizer` / `Gilgit Baltistan` (from
`CryoHealth-api/scripts/seed-dev-data.ts`).

### Step 2 — `admin.glaciers.index.tsx`, trim `admin.index.tsx`

Move the glacier register out of `admin.index.tsx` (L123-228: search + district select +
status filter + `StatusPill` + raw `<table>`) into `admin.glaciers.index.tsx`, converted
to shadcn `Table`, same house styling as Step 1, with each row linking to
`/admin/glaciers/$glacierId` (not the public `/glaciers/$glacierId` the old code linked
to). Keep the search/district/status filters — they're existing, working UX, not new
scope. In the same commit, trim `admin.index.tsx` down to StatCards + HazardMap only, so
the register isn't duplicated across two routes (Deviation 1).
**Verify:** `bunx tsc --noEmit && bun run lint`. `grep -c "<table" src/routes/admin.index.tsx`
→ 0. Manual: `/admin/glaciers` shows 6 rows (5 Hunza, 1 Ghizer — Badswat), all `unknown`
status pills, all measurement columns rendering `—` (nulled in seed data); `/admin`
still shows StatCards + HazardMap with no glacier table; filters still work.

### Step 3 — `admin.glaciers.$glacierId.tsx`

Replace the placeholder with `useQuery(["admin-glacier", glacierId], () =>
fetch(\`/api/public/glaciers/${glacierId}\`).then(r => r.json()))`(404 → not-found
state, matching the existing public detail page's handling). Render via`Tabs`:
**Overview** tab = `StatCard`grid (area_km2, length_km, elevation_min_m/max_m — each
wrapped in`Number(...)`before`.toFixed()`or rendered as`—`when null — status via`StatusPill`, district name/province, source, `last_observed`); **Observations** tab =
shadcn `Table`of`listGlacierObservations`rows (observed_at, area_km2, length_km,
terminus_change_m, status, source), with an explicit empty state ("No observations
yet — populated by CryoHealth-geo pipeline runs.") when the array is empty — this is
the expected state for every seeded glacier today (see NOT-in-scope).
**Verify:**`bunx tsc --noEmit && bun run lint`. Manual: click into Badswat glacier from
`/admin/glaciers`→ detail shows district`Ghizer`, Overview tab renders `—`for all
null measurement fields, Observations tab shows the empty state (not a blank screen, not
fabricated rows). Toggle dark mode —`StatusPill`/`StatCard` colors still change
(regression check inherited from #5's fix, not new work here, but cheap to confirm).

### Step 4 — cleanup

`graphify update .` (graph is stale post-#5). Confirm no dangling references to the old
`admin.index.tsx` register.
**Verify:** `graphify query "admin glaciers"` resolves to the new route files.
`bun run build` succeeds.

## Human verification checklist

Run `bun dev`, log in as `cryohealth_admin` (or `facility_admin` — both must see
identical read access per this task's scope):

- [ ] `/admin/districts` — 2 rows, correct name/province, no create/edit/delete UI
- [ ] `/admin/glaciers` — 6 rows, filters work, links go to `/admin/glaciers/<id>` not
      `/glaciers/<id>`
- [ ] `/admin/glaciers/<Badswat's id>` — Overview tab (district Ghizer, `—` for nulls),
      Observations tab (honest empty state, not fabricated data)
- [ ] `/admin` — StatCards + HazardMap only, glacier table gone, no visual regression
- [ ] Dark mode toggle — `StatusPill` colors still change on all three new/edited pages
- [ ] `facility_admin` login reaches all three routes without a 403 (both roles allowed
      per this task's scope — full role split lands in later G3 tasks)

## Rollback

Each step is one commit; revert in reverse order (4→3→2→1). Step 2 touches two files
(`admin.index.tsx` trim + new `admin.glaciers.index.tsx`) in one commit — revert as a
unit, not separately, or `/admin` and `/admin/glaciers` end up in an inconsistent
half-migrated state. No migrations, no generated-route-tree conflicts expected.

## Loop budget & escalation

Loop budget: 3 (fix loop), copied from issue #6.
Escalation: budget exhausted or two identical failure signatures → label
`agent:needs-human`, comment the trail, stop.
