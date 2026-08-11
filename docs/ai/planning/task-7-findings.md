# Task #7 findings — read-only admin views: Lakes, Lake risk scores, Hazard scores

## Headline

Unlike #6 (where every query and endpoint already existed), **#7 has one genuine
data-access gap**: there is no `listHazardScores()` and no endpoint that returns
`hazard_scores`. Everything else — the route triple, `listLakesAdmin()`,
`listLakeRiskScores()`, the sidebar entry, `TierBadge` — already exists.

Two findings materially change the task from its literal DoD text:

1. **There is nothing to "supersede".** #6 already moved the only `/admin` inventory
   table out of `admin.index.tsx`. See §5.
2. **`lake_risk_scores` has no writer anywhere in the workspace.** Not in
   CryoHealth-api, not in CryoHealth-geo. It is schema-only. This constrains the
   empty-state copy — see §3 and Risk 3.

---

## 1. Exact current state of the three route files

All three exist. `admin.lakes.$lakeId.tsx` **does** exist already (scaffolded by #4).

| File | Lines | State |
| --- | --- | --- |
| `src/routes/admin.lakes.tsx` | 5 | Outlet parent — `component: () => <Outlet />`, no `head`. Identical to `admin.glaciers.tsx`. |
| `src/routes/admin.lakes.index.tsx` | 9 | `AdminPlaceholder title="Lakes"`, route id `"/admin/lakes/"`, `head` with `noindex` already set. |
| `src/routes/admin.lakes.$lakeId.tsx` | 14 | `AdminPlaceholder`, already destructures `Route.useParams()` → `lakeId`. `head` already set. |

Neither has list logic. No `loader:` anywhere in `src/routes/` — data fetching is
uniformly `useQuery` + `fetch("/api/public/…")`. Do not introduce loaders.

**Sidebar: no work needed.** `src/components/cryohealth/AdminShell.tsx:28` already has
`{ to: "/admin/lakes", label: "Lakes", exact: false }` under the "Hazard data" group.
`exact: false` → `startsWith` matching, so `/admin/lakes/<uuid>` keeps Lakes highlighted.

**Precedent to model on, file-for-file:**

- List page → `src/routes/admin.glaciers.index.tsx` (212 lines, shipped in #6). Copy its
  structure wholesale: districts + primary `useQuery` pair, `districtById` `useMemo`,
  search input, district `<select>`, filter pill row, `isError` amber banner, shadcn
  `Table` with house-style className overrides, loading row, empty row, `<Link>` on the
  name cell.
- Detail page → `src/routes/admin.glaciers.$glacierId.tsx` (212 lines). Tabs
  Overview | Observations, `StatCard` grid, `Meta` sub-component (L205-212), explicit
  empty-state row inside `TableBody`.
- Risk-score charting → `src/routes/lakes.$lakeId.tsx:142-178` (recharts `LineChart` with
  `tierClasses.CRITICAL/HIGH/WATCH.hex` `ReferenceLine`s at 75/60/35).

---

## 2. Exact return shapes

**No postgres.js `transform` is configured** — verified in `src/lib/db.ts:47-54`
(`postgres({ host, port, username, password, database, max: 5 })`, nothing else). Column
names arrive **exactly as the SQL emits them**, which is why the queries alias
`l."updatedAt" AS last_updated` and `l."elevationM" AS elevation_m` by hand.

### `listLakesAdmin()` — `src/lib/queries.ts:67-76`

```
id, name, lat (ST_Y), lng (ST_X), current_tier (upper of "currentTier"::text),
current_risk_score, downstream_population, last_updated (from "updatedAt"), district_id
ORDER BY l.current_risk_score DESC NULLS LAST
```

- **Does NOT join `districts`.** Returns bare `district_id` uuid. The list page needs a
  second `useQuery` against `/api/public/districts` plus a `districtById` `useMemo` —
  exactly `admin.glaciers.index.tsx:46-71`.
- `current_tier` is already uppercased and enum-cast → safe to feed `TierBadge`.
- **Numeric-as-string:** `current_risk_score` is `numeric` → arrives as a **string**.
  `downstream_population` is `integer` → arrives as a real number. `lat`/`lng` are
  `double precision` → real numbers.
- **Live wrong type annotation to not copy:** `src/routes/admin.index.tsx:44` declares
  `current_risk_score: number`. That is wrong. It gets away with it only because the
  value is passed to `HazardMap` as `never` (`admin.index.tsx:95`) and never formatted.
  Copying that annotation into a table cell that calls `.toFixed()` is a runtime throw
  `tsc` will not catch. Use `string | number` and wrap in `Number(...)`.

### `listLakeRiskScores(lakeId)` — `src/lib/queries.ts:92-101`

```
score, tier (upper(tier) — plain text column, no ::text cast), confidence, observed_at
WHERE lake_id = $1  ORDER BY observed_at ASC  LIMIT 120
```

Schema (`CryoHealth-api/.../1785700000000-WebSchema.ts:182-194`):
`id uuid PK`, `lake_id uuid NOT NULL REFERENCES lakes(id) ON DELETE CASCADE`,
`score numeric NOT NULL`, **`tier text NOT NULL`** (unconstrained free text — not an
enum), `confidence numeric NOT NULL DEFAULT 0.8`, `source text NOT NULL DEFAULT
'sentinel-1'`, `observed_at TIMESTAMPTZ NOT NULL DEFAULT now()`.

- **Numeric-as-string:** `score` and `confidence` both arrive as strings.
- The query does **not** select `source` or `id`. If the audit view should show the
  provenance column (`source`), the query needs one extra column added — a one-line,
  additive change to a query the public lake page also uses (it ignores extra fields).
- **`ORDER BY observed_at ASC LIMIT 120` returns the *oldest* 120 rows**, not the newest.
  Correct for the public chart (chronological x-axis), wrong for an audit view once real
  data lands. Harmless today (table is empty). **Not fixable in #7** — the public lake
  chart shares this query. Log it with the Risk 4 follow-up, do not change it here.
- `tier` being unconstrained `text` is the `TierBadge` crash risk — see Risk 2.

### `hazard_scores` — no query function exists

Schema (`CryoHealth-api/.../1785608131024-InitialSchema.ts:23`), all camelCase and
**must be double-quoted** in SQL:

```
"id" uuid PK DEFAULT uuid_generate_v4()
"lakeId" uuid NOT NULL  → FK lakes(id) ON DELETE CASCADE
"runId" varchar NOT NULL
"score" numeric(8,4) NOT NULL
"tier" "public"."tier" NOT NULL      -- ENUM('normal','watch','high','critical')
"components" jsonb NOT NULL
"computedAt" TIMESTAMPTZ NOT NULL
"createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
INDEX ("lakeId", "computedAt")
```

`tier` is the `public.tier` **enum**, so `upper(tier::text)` — the `::text` cast is
**mandatory**, not optional. Compare `listLakeRiskScores` which correctly uses bare
`upper(tier)` because that column is plain `text`. Getting this backwards is the exact
bug recorded in project memory ("enum-cast `upper(tier)` bug fixed once seed data
existed to expose it"): with an empty table the wrong form never executes and looks fine.

Proposed shape (write it, it does not exist):

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

Recommend surfacing `run_id` and `components` — those two are what make the view
*auditable* rather than merely readable, which is PRD §5's whole point. `score` is
`numeric(8,4)` → string. Note the existing `listLakeRiskScores` orders ASC (chart
order) while an audit table wants DESC (newest first); `admin.glaciers.$glacierId.tsx:169-171`
solves the same tension with `.slice().reverse()` in the component. Either is fine —
pick one and be consistent.

---

## 3. Writers — provenance, and what the empty state may honestly say

Verified by grep across both sibling repos:

| Table | Writer | Consequence |
| --- | --- | --- |
| `hazard_scores` | **Yes.** `CryoHealth-api/src/alerts/alerts.controller.ts:49` `@Post('hazard-scores')` → `alerts.service.ts:67 recordHazardScore()` → `.getRepository(HazardScore).insert()` at L77. Service-key auth, called by CryoHealth-geo. | Empty state may honestly say "populated by CryoHealth-geo pipeline runs via `POST /alerts/hazard-scores`". |
| `lake_risk_scores` | **None. Anywhere.** Only hits in `CryoHealth-api/src` are the migration itself (create/index/drop). Zero hits in `CryoHealth-geo`. Zero writers in this repo. | The empty state **must not** claim a pipeline populates it. That would be fabricated provenance — the precise failure mode the "No fabricated hazard data" memory rule and the seed script's decision doc warn about. |

Honest copy for `lake_risk_scores`: something like *"No risk scores recorded. This table
is scaffolded in the shared schema but no service writes to it yet."* This mirrors PRD §6's
handling of `sync_log`/`chw_cases` ("schema-ahead-of-implementation … will show an honest
empty state"). Do **not** reuse `admin.glaciers.$glacierId.tsx:165`'s wording verbatim.

Neither table is seeded. `CryoHealth-api/scripts/seed-dev-data.ts` docstring L18-21:

> `glacier_observations`, `lake_risk_scores`: intentionally NOT seeded. A fabricated
> time series here is indistinguishable from real CryoHealth-geo pipeline output —
> exactly the failure mode the decision doc warns about.

**Hard constraint, carried forward from #6:** both empty series are the *correct*
result. #7 must not be "fixed" by seeding synthetic rows.

---

## 4. Existing API routes, and the data-path decision

| Route file | Returns |
| --- | --- |
| `src/routes/api/public/lakes-admin.ts` (10 lines) | `{ lakes }` from `listLakesAdmin()`. GET-only. **Reusable as-is for the list page — zero changes.** Already consumed by `admin.index.tsx:49` for HazardMap markers. |
| `src/routes/api/public/lakes.$lakeId.ts` (19 lines) | `{ lake, history, alerts, glaciers }` — `getLakeDetail` + `listLakeRiskScores` (as `history`) + `listAlertsForLake` + **`listGlaciers()` (all of them)**. 404s when the lake is missing. |

**Trap in the `lake` object:** `getLakeDetail()` selects `l.*` *plus* aliases, so the
response contains **both** `currentTier` (raw lowercase enum, e.g. `"normal"`) **and**
`current_tier` (uppercased, e.g. `"NORMAL"`). Reaching for `currentTier` feeds `"normal"`
to `TierBadge` and throws per Risk 2. Always use **`current_tier`**.
| `src/routes/api/public/lakes.ts` | `{ lakes }` from `fetchLakesFromApi()` — **CryoHealth-api HTTP, not the DB**. Backs the *public* `/lakes` page only. Not relevant to #7. |
| `src/routes/api/public/districts.ts` | `{ districts }` — needed for the district column. |

So: risk scores are already served (as `history`); **hazard scores are served by nothing.**

### GATE decision: where does `hazard_scores` come from?

**Option A — extend `api/public/lakes.$lakeId.ts`** with a fifth key. Zero new files, no
`routeTree.gen.ts` churn. This is the shape #6 chose for glaciers.
*Cost:* this endpoint is **unauthenticated**, and `hazard_scores` carries `components`
(jsonb pipeline internals) and `runId` (internal run identifiers). The workspace rule
that Open Data endpoints are deliberately unauthenticated exists so *safety information*
is never gated — it is not a licence to publish pipeline internals. It also adds a query
to every public lake-detail page load for data that page does not render.

**Option B — new `src/routes/api/public/hazard-scores.$lakeId.ts`**, fetched by a second
`useQuery` on the admin detail page. One new file + one `routeTree.gen.ts` regen. Keeps
the public bundle untouched and keeps a failing hazard-score query from breaking the
Overview tab.
*Cost:* it still lives under `api/public/` (i.e. still unauthenticated) unless it is put
behind `requireAuth`/`requireRole`. PRD §4 anticipates a future `src/routes/api/admin/`
directory for exactly this, but creating that directory is arguably #10+'s job.

**Recommendation: Option B.** Whether to *gate* it is a second, separable decision —
here is the evidence GATE needs, because it cuts both ways:

- `requireAuth` is **Bearer-header-based**, not cookie-based
  (`src/lib/auth-guard.ts:18` — `request.headers.get("authorization")`). A same-origin
  `fetch` therefore does **not** carry the token automatically.
- **But the client plumbing already exists**: `authFetch()` at
  `src/lib/auth-client.ts:51-56` reads the token from `localStorage` and sets the header.
  Used today at `src/routes/alerts.tsx:68,213`. So gating costs **one identifier**
  client-side (`authFetch` instead of `fetch`), not new auth infrastructure.
- **However, it would be the repo's first gated GET.** `requireRole` guards
  `src/routes/api/public/alerts.ts` on **POST only** (L12-20); its **GET is ungated**
  (L8-11) and returns every alert body. Every other `api/public/` GET is likewise open.
  Gating a GET establishes a new pattern.

**Suggested resolution: Option B, gated** (`requireAuth` + `requireRole(claims,
["cryohealth_admin", "facility_admin"])`, copying the try/catch shape at
`api/public/alerts.ts:12-20`) — `components`/`runId` are pipeline internals, not safety
information, and the marginal cost is now demonstrably one word. **But this is the only
authorization decision in #7 and the only new precedent it sets, so it must be decided at
GATE, not defaulted.** If GATE declines, ship Option B ungated (consistent with every
other `api/public` GET) and file the exposure as a follow-up.

*(If GATE prefers minimum diff, Option A is defensible — but then `components` must be
omitted from the SELECT, which guts the audit value.)*

---

## 5. "Today's single-page inventory table logic" — there is nothing left to supersede

PRD L54 and L98 both scope this to `/admin`:

- L54: `Lakes  (supersedes today's single-page /admin)`
- L98: `` `admin.lakes.tsx`, `admin.lakes.$lakeId.tsx` | supersedes today's single-page inventory table ``

**#6 already did that removal.** Commit `304f614` ("feat(admin): real Glaciers list, move
register out of admin.index.tsx (#6 step 2)") moved the only table off the page.
`src/routes/admin.index.tsx` is now 102 lines containing: a `showGibs` toggle, a
`glaciers` `useQuery`, a `lakes-admin` `useQuery` (L35-50), a status-counts `useMemo`, a
`totalArea` reduce, five `StatCard`s, and `<HazardMap>`. **There is no lakes table.**

### Explicit negative constraint for the build agent

> **Do not remove the `lakes-admin` `useQuery` from `admin.index.tsx` (L35-50).**
> `admin.index.tsx` receives **zero changes** in #7. That query feeds `HazardMap`'s lake
> markers (L95) and the "N monitored lakes" count in the header (L71). A build agent
> reading "supersedes today's single-page inventory table logic" will otherwise delete it
> and silently blank the hazard map's lake layer.

Ruling out the alternate reading: the public `/lakes` table (`src/routes/lakes.tsx:128`)
is **not** superseded either. Different route, different data source (`fetchLakes` →
CryoHealth-api HTTP, not the DB), and PRD L54 names `/admin` explicitly. Leave it alone.

---

## 6. `TierBadge` precedent and PRD §5 rationale

**Import path:** `import { TierBadge, type Tier } from "@/lib/tier";`
Defined at `src/lib/tier.tsx:78`. Signature: `TierBadge({ tier: Tier, solid?: boolean, className?: string })`.

Existing consumers (all verified live):

| Site | Usage |
| --- | --- |
| `src/routes/lakes.$lakeId.tsx:129` | `<TierBadge tier={lake.current_tier as Tier} solid={lake.current_tier === "CRITICAL"} />` |
| `src/routes/lakes.$lakeId.tsx:191` | `<TierBadge tier={a.tier as Tier} />` (alert row) |
| `src/routes/lakes.tsx:128` | `<TierBadge tier={l.current_tier} />` (list row, no cast — typed upstream) |
| `src/routes/dashboard.tsx:160,186` | list rows |
| `src/routes/alerts.tsx:120` | `solid={a.tier === "CRITICAL"}` |
| `src/routes/chw.tsx:115` | list row |
| `src/routes/glaciers.$glacierId.tsx:354` | associated-lake row |

**Convention:** bare `<TierBadge tier={...} />` in dense list/table rows; `solid` reserved
for a hero/header context, and only for `CRITICAL`. The component's own doc comment
(`tier.tsx:72-77`) states this: *"`solid` forces the solid-bg / on-tier-text treatment —
reserve that for a hero/header context (e.g. an uncleared CRITICAL alert), not a dense
list row."* So: bare badges in the lakes table and both time-series tables; `solid` only
on the detail-page header badge when the lake is CRITICAL.

Never re-derive tier colour. `tierClasses[t].hex` is the sanctioned raw-string escape
hatch for recharts strokes / Leaflet markers (`lakes.$lakeId.tsx:162-167`,
`HazardMap.tsx:138,210`).

### PRD §5 rationale (`docs/admin-portal-prd.md`), quoted

Preamble — this is the actual argument, the table cells are terse:

> "View + audit-only" = read-only in the UI; the only way the value changes is through
> the system that owns it (see rationale column) — this is the tiering the user asked
> for, and it isn't arbitrary: these are the same tables the seed-data work earlier this
> session deliberately did _not_ write directly to, because they represent policy or
> pipeline **output**, not input a human types in a form.

Row cells:

> | Lake risk scores | `lake_risk_scores` | **View + audit-only** | Scored hazard output |
> | Hazard scores | `hazard_scores` | **View + audit-only** | Written by CryoHealth-geo via `POST /alerts/hazard-scores` (service-key auth, `alerts.controller.ts:49`) |

And for the `lakes` table itself (relevant because the Lakes list *is* full-CRUD later):

> | Lakes | `lakes` | Full CRUD **except** `currentTier`, `current_risk_score` | Those two columns are tier _policy_ output owned by CryoHealth-api's alert service (CLAUDE.md: "never silent ML — a human-auditable reason is required") |

`src/lib/admin-schemas.ts:16-19` already encodes this for the future CRUD task:

> `/** currentTier and current_risk_score must never appear here — that's tier-policy
> output owned by CryoHealth-api's alert service, not an admin-editable field. */`

---

## 7. Draft plan steps

Loop budget **3** (fix loop). Escalation: if step verification still fails after 3 fix
attempts, stop and escalate rather than widening scope.

Baseline verification command for every step:
`bunx tsc --noEmit && bun run lint`

**That command passes on the current placeholders**, so on its own it fails rubric item 2
("a verification command that can actually fail"). Each step therefore pairs it with a
check that can fail today. The no-edit-affordance check is made mechanical:

```bash
# must return no matches: no edit affordance in the two audit views
grep -nE "<button|onClick|Trash|Pencil|Edit|Delete|<form" src/routes/admin.lakes.\$lakeId.tsx
```

(Note: a Tabs trigger is a button. Run this scoped to the two `TabsContent` blocks for
risk scores and hazard scores, or accept `TabsTrigger` as the only permitted match and
say so explicitly in the step.)

**Rollback for every step:** `git revert <sha>`. The routes fall back to
`AdminPlaceholder`; nothing else in the app imports them. Steps 2-4 touch no shared code.
Step 1 adds a new exported function + a new route file — both additive.

---

### Step 0 — pre-flight (no commit)

Confirm, do not assume:
- `bun dev` up, Postgres on `DB_PORT=5433`, `seed:dev-data` has run.
- `AdminShell.tsx:28` already has the `/admin/lakes` nav entry → **no sidebar work**.
- `/admin/lakes` currently renders the `AdminPlaceholder` (proves routing works before
  any change).
- Re-confirm `lake_risk_scores` still has no writer (`grep -rn lake_risk_scores
  ../CryoHealth-api/src ../CryoHealth-geo`) — the empty-state copy in step 3 depends on it.

*Verification:* with `DEV_URL` set to the origin `bun dev` actually prints
(**Vite's default is `http://localhost:5173`** — `vite.config.ts` sets no explicit
`server.port`, and the preset does sandbox port detection, so read it off the dev-server
banner rather than assuming). **`localhost:3000` is CryoHealth-api, a different service —
do not curl it.**

```bash
curl -s "$DEV_URL/api/public/lakes-admin" | jq '.lakes | length'   # → 6
```

---

### Step 1 — `listHazardScores()` + hazard-score endpoint

`src/lib/queries.ts`: add `listHazardScores(lakeId)` per §2 — **`upper(tier::text)`, quoted
`"lakeId"`/`"runId"`/`"computedAt"`**.
`src/routes/api/public/hazard-scores.$lakeId.ts`: new GET handler returning
`{ hazardScores }`, gated per the §4 GATE decision. `routeTree.gen.ts` regenerates.

*Verification:* `bunx tsc --noEmit && bun run lint`, plus a live call against `$DEV_URL`
(**not** `:3000`). **The command depends on the §4 GATE outcome:**

```bash
# If UNGATED:
curl -s -o /dev/null -w '%{http_code}' "$DEV_URL/api/public/hazard-scores/$LAKE_ID"   # → 200
curl -s "$DEV_URL/api/public/hazard-scores/$LAKE_ID" | jq                              # → {"hazardScores":[]}

# If GATED (requireAuth is Bearer-header-based — a bare curl returns 401 by design):
curl -s -o /dev/null -w '%{http_code}' "$DEV_URL/api/public/hazard-scores/$LAKE_ID"   # → 401
TOKEN=$(curl -s -X POST "$DEV_URL/api/auth/login" -H 'content-type: application/json' \
  -d '{"identifier":"<admin>","password":"<pw>"}' | jq -r .accessToken)
curl -s -H "authorization: Bearer $TOKEN" "$DEV_URL/api/public/hazard-scores/$LAKE_ID" | jq
#   → {"hazardScores":[]}
```

The load-bearing assertion either way: **HTTP 200 with an empty array, never a 500.**
A 500 is the enum-cast bug (`upper(tier)` without `::text`); an empty array is the correct
seeded state. Confirm `routeTree.gen.ts` is staged in the same commit.

---

### Step 2 — `admin.lakes.index.tsx`: real list

Replace the placeholder. Two `useQuery`s (`/api/public/lakes-admin`,
`/api/public/districts`) + `districtById` `useMemo`; search-by-name input; district
`<select>`; tier filter pills (ALL / NORMAL / WATCH / HIGH / CRITICAL); `isError` amber
banner; shadcn `Table` with the house overrides; loading row; empty row; name cell
`<Link to="/admin/lakes/$lakeId" params={{ lakeId: l.id }}>`. Columns: Lake, District,
Tier (`TierBadge`), Risk score (`Number(...).toFixed(0)`), Downstream population
(`.toLocaleString()`), Updated. **Structure copied from `admin.glaciers.index.tsx`.**

*Verification:* `bunx tsc --noEmit && bun run lint`, plus `/admin/lakes` shows **6 rows**
(Shishper/Hassanabad, Khurdopin, Badswat, Passu, Ghulkin, Batura), district column reads
**5 Hunza + 1 Ghizer**, every tier badge **NORMAL**, risk score `0`, downstream `0`.
No `.toFixed is not a function` in the console. **Do not assert a specific row order** —
`ORDER BY current_risk_score DESC NULLS LAST` with all-zero scores is unstable.
Also confirm `/admin` still renders the hazard map with lake markers (regression check on
the §5 negative constraint).

---

### Step 3 — `admin.lakes.$lakeId.tsx`: detail with both time series

Replace the placeholder. `useQuery(["admin-lake", lakeId])` → `/api/public/lakes/${lakeId}`
(handle `res.status === 404 → null`, per `admin.glaciers.$glacierId.tsx:66`) and a second
`useQuery` → the step-1 hazard-scores endpoint.

Tabs: **Overview | Risk scores | Hazard scores**.
- Overview: `StatCard` grid + `Meta` rows (valley, district, dam type, elevation,
  historical GLOF, source, `icimodId`). Header `TierBadge` with
  `solid={lake.current_tier === "CRITICAL"}`.
- Risk scores: shadcn `Table` — Observed at / Score / Tier (`TierBadge`) / Confidence.
  Empty state: the honest §3 wording (no writer exists).
- Hazard scores: shadcn `Table` — Computed at / Score / Tier (`TierBadge`) / Run ID
  (`font-mono text-xs`) / Components. Empty state may cite the CryoHealth-geo
  `POST /alerts/hazard-scores` path.
  **`components` is `jsonb NOT NULL`, so postgres.js returns a parsed JS object, not a
  string.** Rendering it directly in JSX throws *"Objects are not valid as a React
  child"*. Required form:
  `<details><summary>components</summary><pre className="text-xs">{JSON.stringify(h.components, null, 2)}</pre></details>`.
  Same class of trap as numeric-as-string, and `tsc` will not catch it if the row type
  annotates `components` as `unknown`/`any`.

Wrap every numeric in `Number(...)`. Read **`updatedAt`**, not `last_updated`, and
**`current_tier`**, not `currentTier` — see Risk 4 and §4.

If the §4 GATE outcome is *gated*, the hazard-scores `useQuery` must use
`authFetch` from `@/lib/auth-client`, not bare `fetch`.

*Verification:* `bunx tsc --noEmit && bun run lint`, plus: open Badswat's detail →
district Ghizer, both time-series tabs show their empty states, **no console error**.
Then the mechanical affordance grep above returns nothing (or only `TabsTrigger`).
Keyboard-tab through both audit tabs: no focusable control other than the tab triggers.

---

### Step 4 — `graphify update .` + close-out

`graphify update .` (AST-only, no API cost) so the graph reflects the new query,
endpoint, and two real page bodies.

*Verification:* `graphify query "admin lakes hazard scores"` returns
`listHazardScores()` as a node (it does not today).

**No cleanup step** — §5's answer is that nothing is superseded.

---

## 8. Deviations from the DoD's literal text → name these at GATE

**D1 — The list table goes in `admin.lakes.index.tsx`, not `admin.lakes.tsx`.**
The DoD names `admin.lakes.tsx`. That file is the Outlet parent
(`component: () => <Outlet />`); a table there renders *above every detail page*.
This is byte-identical to #6's flagged file-layout deviation (`admin.glaciers.tsx` vs
`admin.glaciers.index.tsx`), which was accepted and shipped. Cite that precedent.
`admin.lakes.tsx` is **unchanged** by #7.

**D2 — "supersedes today's single-page inventory table logic" is already satisfied.**
#6 commit `304f614` removed it. #7 makes **zero changes to `admin.index.tsx`**. Naming
this at GATE prevents a build agent from inventing a removal and breaking HazardMap.

**D3 — `hazard_scores` needs new data-access code.** The DoD implies a pure UI task. It
is not: one new query function + one new endpoint (+ `routeTree.gen.ts`). The endpoint's
auth posture is a real decision — see §4 Option A vs B.

**D4 — `TierBadge` on `lake_risk_scores.tier` needs a narrowing guard.** The DoD says
"reuses `TierBadge` … for every tier column". `lake_risk_scores.tier` is unconstrained
`text`; `TierBadge` has no fallback, so an unrecognized value throws (see Risk 2). The
guard is a deviation from "just call TierBadge" and should be agreed at GATE.

---

## 9. Explicitly NOT in scope

- **No edit/create/delete affordances anywhere** — not on `lake_risk_scores`, not on
  `hazard_scores`, and not on `lakes` either. Lakes is full-CRUD *later* (#11 depends on
  this task); #7 ships read-only.
- **No `src/lib/admin-schemas.ts` changes.** `lakeSchema` stays an empty `.strict()` stub.
  Its guard comment (L16-17) is for #11, not #7.
- **No new `src/routes/api/admin/` directory** and no PUT/DELETE on `lakes-admin.ts`
  (PRD §4 floats extending it — that is #11's call).
- **No changes to `admin.index.tsx`** (see §5) and none to the public `/lakes`,
  `/lakes/$lakeId`, or `HazardMap`.
- **No fixes to the two public-page bugs found here** (Risk 4) — file a follow-up issue.
  `getLakeDetail()` is shared; touching it drags the public page into #7's blast radius.
- **No Facilities / Users & roles / System Health / Audit pages** — separate G3 tasks.
- **No migrations, no schema changes, no `synchronize`.** CryoHealth-api owns the schema.
- **No seeding of `lake_risk_scores` or `hazard_scores`.** The empty series is correct.
- **No `loader:` introduction** — the repo has zero; stay on `useQuery`.
- **No fallback branch added to `TierBadge`/`tier.tsx`.** It is the declared single source
  of truth; masking bad tier data there is worse than handling it at the one call site.

---

## Risks / assumptions that change the plan if wrong

1. **`hazard_scores.tier` is an enum, `lake_risk_scores.tier` is plain `text`.** The two
   need *different* SQL (`upper(tier::text)` vs `upper(tier)`). With both tables empty in
   dev, a wrong cast will not surface until real pipeline data lands — this is the exact
   bug in project memory. Mitigation: assert the SQL form at review time, not by testing
   against an empty table.
2. **`TierBadge` will throw on an unknown tier string.** `tier.tsx:87,96` do
   `TIER_ICON[tier]` and `tierClasses[tier].label` with **no fallback** — an unrecognized
   value throws `Cannot read properties of undefined`. Contrast `StatusPill`
   (`StatCard.tsx:54`), which has an explicit `unknown` branch. Since
   `lake_risk_scores.tier` is unconstrained `text`, the route needs a local narrowing
   guard: render `<TierBadge>` for a recognized tier, else render the **raw string** —
   more honest for an audit view than coercing to NORMAL. `tsc` will not catch this:
   the value is typed `string` and cast with `as Tier` everywhere in the codebase today.
3. **`lake_risk_scores` has no writer at all.** If a reviewer expects the #6 empty-state
   wording ("populated by CryoHealth-geo pipeline runs"), that is fabricated provenance
   here. If this finding is wrong — i.e. a writer is added between planning and build —
   the copy should change. Re-check in Step 0.
4. **Two live bugs on the public lake detail page — do not copy, do not fix.**
   `getLakeDetail()` (`queries.ts:78-90`) selects `l.*` plus three aliases.
   - `src/routes/lakes.$lakeId.tsx:136` reads `lake.current_confidence`. **No such column
     exists** — verified absent from every migration. Renders `NaN%`.
   - `src/routes/lakes.$lakeId.tsx:139` reads `lake.last_updated`. `getLakeDetail` does
     **not** alias it (only `listLakesAdmin` does); `l.*` yields `updatedAt`. Renders
     `Invalid Date`.

   Consequence for #7: the admin detail must read **`updatedAt`**, and must take
   confidence **per-row from `lake_risk_scores.confidence`**, never from a lake-level
   field. Both public bugs → follow-up issue, together with `listLakeRiskScores`'s
   oldest-first `ORDER BY observed_at ASC LIMIT 120` (§2).
5. **The lake-detail bundle is fat.** `api/public/lakes.$lakeId.ts` calls `listGlaciers()`
   — *every* glacier — on each admin detail load. Acceptable at 6 glaciers; note it, do
   not optimize in #7.
6. **`admin.index.tsx:44`'s `current_risk_score: number` annotation is wrong** and is
   the most likely thing to be copy-pasted into the new list page. It is a `numeric`
   column → string.
7. **Seeded state:** 6 lakes, `currentTier` deliberately untouched (seed docstring L26-31)
   → all NORMAL; `current_risk_score` and `downstream_population` both `DEFAULT 0`;
   `area_km2` NULL. If a lake shows a non-NORMAL tier, real API activity has occurred —
   adjust the manual check rather than assuming a bug.
8. **Do not curl `localhost:3000` when verifying.** That port is CryoHealth-api
   (workspace CLAUDE.md: `npm run start:dev  # API on :3000`). This dashboard is
   `bun dev` → Vite, default `:5173`, with no explicit `server.port` in `vite.config.ts`.
   Hitting the wrong service produces a confusing 404 or a plausible-looking response
   from the *other* service's routes.
9. **Blast radius:** confined to `src/lib/queries.ts` (one added export),
   `src/routes/admin.lakes.index.tsx`, `src/routes/admin.lakes.$lakeId.tsx`, one new
   `src/routes/api/public/hazard-scores.$lakeId.ts`, and generated `routeTree.gen.ts`.
   No migrations, no user data written, no auth code changed **unless** GATE picks the
   `requireRole`-gated variant in §4 — which is the one auth-touching decision in #7 and
   is flagged as such per rubric item 4.

---

## Key file paths

- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.lakes.tsx`
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.lakes.index.tsx`
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.lakes.$lakeId.tsx`
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.glaciers.index.tsx` (list precedent)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.glaciers.$glacierId.tsx` (Tabs precedent)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.index.tsx` (**do not modify**)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/lakes.$lakeId.tsx` (chart precedent; 2 known bugs)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/api/public/lakes-admin.ts`
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/api/public/lakes.$lakeId.ts`
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/api/public/alerts.ts` (only `requireRole` call site)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/queries.ts`
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/tier.tsx`
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/db.ts` (no `transform`)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/admin-schemas.ts` (**do not modify**)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/components/cryohealth/AdminShell.tsx:28`
- `/Users/m5/Projects/uexel/cryo/cryohealth/docs/admin-portal-prd.md` (§4 L90-110, §5 L112-145)
- `/Users/m5/Projects/uexel/cryo/CryoHealth-api/src/database/migrations/1785608131024-InitialSchema.ts:23` (`hazard_scores`)
- `/Users/m5/Projects/uexel/cryo/CryoHealth-api/src/database/migrations/1785700000000-WebSchema.ts:182-195` (`lake_risk_scores`), `:30-40` (lakes ALTERs)
- `/Users/m5/Projects/uexel/cryo/CryoHealth-api/src/alerts/alerts.controller.ts:49` / `alerts.service.ts:67-77` (only `hazard_scores` writer)
- `/Users/m5/Projects/uexel/cryo/CryoHealth-api/scripts/seed-dev-data.ts` (docstring L18-21)
