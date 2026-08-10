# Task #6 findings — read-only admin views: Districts, Glaciers, Glacier observations

## Headline: the DoD is significantly overstated. #6 is a UI-only task.

Every query, every GET handler, and every route file the DoD names **already exists**. There is no new data-access work, no new API route, and no `routeTree.gen.ts` churn. What's missing is only the page bodies (today they render `AdminPlaceholder`).

---

## 1. Existing admin scaffolding (task #4)

All under `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/`:

| File                                                                           | Current state                                                                  |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `admin.tsx`                                                                    | Real shell. Client-side role gate + `<AdminShell><Outlet/></AdminShell>`       |
| `admin.index.tsx`                                                              | **Real page, 231 lines** — StatCards + HazardMap + full glacier register table |
| `admin.districts.tsx`                                                          | `AdminPlaceholder title="Districts"`                                           |
| `admin.glaciers.tsx`                                                           | **Outlet-only parent** — `component: () => <Outlet />`                         |
| `admin.glaciers.index.tsx`                                                     | `AdminPlaceholder title="Glaciers"`                                            |
| `admin.glaciers.$glacierId.tsx`                                                | `AdminPlaceholder`, already reads `Route.useParams()`                          |
| `admin.lakes.tsx` / `.index.tsx` / `.$lakeId.tsx`                              | Identical parent/index/detail triple — the settled convention                  |
| `admin.alerts/audit/cases/chw-profiles/facilities/protocols/system-health.tsx` | Placeholders                                                                   |

**Route conventions (verified, not assumed):**

- Flat dot-segment file names, no `admin/` directory.
- A list+detail domain is a **three-file triple**: `admin.X.tsx` (Outlet parent, no `head`), `admin.X.index.tsx` (list, route id `"/admin/X/"` with trailing slash), `admin.X.$xId.tsx` (detail).
- Every admin page except the Outlet parents declares `head: () => ({ meta: [{ title: "… — Admin — CryoHealth" }, { name: "robots", content: "noindex" }] })`.
- **There is no loader pattern anywhere in this repo.** `grep -rn "loader:" src/routes/` returns **zero matches**. Data fetching is uniformly `useQuery` + `fetch("/api/public/…")` against `server.handlers` route files. The task prompt's "TanStack loader" premise is false — do not introduce loaders in #6.

**Sidebar IA** — `src/components/cryohealth/AdminShell.tsx`, `NAV_GROUPS` const at the top. Districts and Glaciers are already registered under the "Hazard data" group pointing at `/admin/districts` and `/admin/glaciers`. **No sidebar changes needed for #6.** Active state uses `loc.pathname.startsWith(item.to)` for non-exact items, so `/admin/glaciers/<uuid>` correctly keeps "Glaciers" highlighted.

---

## 2. `requireRole` — the prompt's premise is wrong

`/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/auth-guard.ts:33`

```ts
export function requireRole(claims: JwtPayload, roles: Role[]): void;
```

Throws `AuthError` (403 `{error:"Forbidden"}`) if `claims.role` is not in `roles`. Used inside the same `try` as `requireAuth(request)`, caller catches and returns `err.response`.

**No admin route calls it.** It has exactly one call site repo-wide: `src/routes/api/public/alerts.ts:16`, `requireRole(claims, ["cryohealth_admin", "facility_admin"])`.

Admin gating today is **client-side only**, in `admin.tsx` via `useAuth().isAdmin`, which is defined in `src/lib/auth.tsx` as `user?.role === "cryohealth_admin" || user?.role === "facility_admin"` — i.e. **both roles already pass, inherited automatically by every `admin.*` child route.** #6 needs zero auth work. The goal's "403 on direct navigation" success metric applies only to Users & Roles and System Health (tasks later in G3), not to districts/glaciers.

---

## 3. `StatCard` / `StatusPill`

`/Users/m5/Projects/uexel/cryo/cryohealth/src/components/cryohealth/StatCard.tsx` — three named exports:

```ts
StatCard({ label: string; value: React.ReactNode; tone?: "default"|"danger"|"warn"|"ok"; icon?: React.ReactNode })
StatPair({ label: string; value: string })
StatusPill({ status: string })
```

`StatusPill` maps `stable|retreating|advancing|surging|unknown` onto design tokens; unrecognised values fall back to the `unknown` grey. Import as `import { StatCard, StatusPill } from "@/components/cryohealth/StatCard";`.

Also available: `AdminPlaceholder` and `CryoHealthAdminOnly` from `@/components/cryohealth/AdminPlaceholder`.

---

## 4. shadcn `Table` / `Tabs` — installed, unused, deps present

Both files exist and are fully built:

- `src/components/ui/table.tsx` → exports `Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption`
- `src/components/ui/tabs.tsx` → exports `Tabs, TabsList, TabsTrigger, TabsContent` (Radix-based; `@radix-ui/react-tabs ^1.1.13` **is** in `package.json:39`, so no install step).

**Confirmed zero consumers.** The only file in the entire app importing anything from `@/components/ui/` is `AdminShell.tsx` (sidebar). #6 genuinely is the first consumer, as the DoD says.

**Brand-rule caveat.** PRD lines 43-45 mandate flat 2px borders, zero radius, `var(--color-line)`/`var(--color-accent)`, no shadows. shadcn `TableHead` defaults to `h-10 px-2 font-semibold text-muted-foreground` and `TableRow` to `hover:bg-muted/50`. The de-facto house table style (from `admin.index.tsx:159-172`) is:

- head: `bg-secondary/50 text-left text-xs uppercase text-muted-foreground`, cells `px-3 py-2`
- body: `divide-y divide-border`, row `hover:bg-secondary/40`

The plan should pass these as `className` overrides so migrating to `Table` reads as a refactor, not a visual regression. `AdminShell.tsx` already demonstrates the override pattern (`rounded-none border-s-[3px] border-[var(--color-accent)]`).

---

## 5. `src/lib/queries.ts` — all four functions already exist

```ts
listDistricts()                          // L6  → SELECT id, name, province FROM districts ORDER BY name
listGlaciers()                           // L11 → glaciers LEFT JOIN districts, + d.name AS district_name,
                                         //       ORDER BY g.area_km2 DESC NULLS LAST
getGlacier(id: string)                   // L23 → g.*, d.name AS district_name, d.province AS district_province
listGlacierObservations(glacierId: string) // L35 → observed_at, area_km2, length_km,
                                         //       terminus_change_m, status, source, notes; ORDER BY observed_at ASC
```

Plus supporting GET handlers, also already built:

- `src/routes/api/public/districts.ts` → `{ districts }`
- `src/routes/api/public/glaciers.ts` → `{ glaciers }`
- `src/routes/api/public/glaciers.$glacierId.ts` → `{ glacier, observations, lakes, cases }`, 404s when the glacier is missing

**Schema** (`CryoHealth-api/src/database/migrations/1785700000000-WebSchema.ts`, L14-129 — CryoHealth-api owns migrations, do not touch):

- `districts`: `id uuid PK`, `name text NOT NULL UNIQUE`, `province text NOT NULL DEFAULT 'Gilgit Baltistan'`, `population int`, `centroid_lat/lng double precision`, `created_at timestamptz`
- `glaciers`: `id uuid PK`, `name text NOT NULL`, `rgi_id text`, `glims_id text`, `district_id uuid → districts(id) ON DELETE SET NULL`, `lat/lng double precision NOT NULL`, `area_km2 numeric`, `length_km numeric`, `elevation_min_m/max_m integer`, `status text NOT NULL DEFAULT 'unknown'`, `terminus_type text`, `source text`, `last_observed text`, `notes text`, `created_at`
- `glacier_observations`: `id uuid PK`, `glacier_id uuid NOT NULL → glaciers(id) ON DELETE CASCADE`, `observed_at timestamptz NOT NULL`, `area_km2/length_km/terminus_change_m numeric`, `status text`, `source text`, `notes text`, `created_at`

Note `numeric` columns arrive from postgres.js as **strings** — existing code consistently wraps in `Number(...)` before `.toFixed()`. Follow that.

`src/lib/admin-schemas.ts` holds `districtSchema`/`glacierSchema` as empty `.strict()` stubs for tasks #10-#19. **#6 is view-only and must not touch them.**

---

## 6. Route to model on

Two, at different levels:

- **Structure / triple convention:** the `admin.lakes.*` triple, which is the identical shape.
- **Actual working list+detail with observations:** the _public_ pair `src/routes/lakes.tsx` → `src/routes/lakes.$lakeId.tsx`, and best of all `src/routes/glaciers.$glacierId.tsx` (19KB) — it already renders a glacier detail with a `GlacierRow`/`ObservationRow`/`CaseRow` type block, a recharts observation series, an observations `<table>` with an explicit `"No observations yet."` empty state (L296-302), and `StatCard`/`StatusPill`. **Copy its row types and its empty-state discipline.**

`admin.index.tsx` is the closest model for a list page: `useQuery` for districts + glaciers, `districtById` lookup via `useMemo`, search/status/district filters, `StatusPill` in the status column.

---

## 7. Seed data — concrete expected verification values

`/Users/m5/Projects/uexel/cryo/CryoHealth-api/scripts/seed-dev-data.ts`

- **districts (2, upsert on name):** `Hunza` / Gilgit Baltistan, `Ghizer` / Gilgit Baltistan. `population` and `centroid_lat/lng` left **NULL** deliberately.
- **glaciers (6, insert-if-name-absent):** Hassanabad glacier (Shishper) · Hunza; Khurdopin glacier · Hunza; Badswat glacier (G1/G2) · **Ghizer**; Passu Glacier · Hunza; Ghulkin Glacier · Hunza; Batura Glacier · Hunza. Only `name`, `district_id`, `lat`, `lng`, `source` are populated.
- **Therefore every glacier row will show:** `status = "unknown"` (DB default → grey `StatusPill`), and `area_km2`, `length_km`, `elevation_min_m`, `elevation_max_m`, `rgi_id`, `last_observed`, `notes` all **NULL → render as `—`**.
- **`glacier_observations`: intentionally NOT seeded** (script docstring L18-21; PRD §5 marks it view+audit-only as CryoHealth-geo pipeline output). Confirmed by the MEMORY rule "No fabricated hazard data".

**Manual verification wording for the plan:** "`/admin/districts` shows 2 rows (Hunza, Ghizer, both Gilgit Baltistan). `/admin/glaciers` shows 6 rows, 5 Hunza + 1 Ghizer, all `unknown` status, all measurement columns `—`. Clicking Badswat opens `/admin/glaciers/<uuid>` showing district Ghizer and an **empty observations state** reading e.g. 'No observations yet — populated by CryoHealth-geo pipeline runs.'"

**Hard constraint to write into the plan:** the empty observations table is the _correct_ result. #6 must not be 'fixed' by seeding synthetic observation rows.

---

## Risks / assumptions that change the plan if wrong

1. **`admin.index.tsx` already contains the glacier register.** (L123-228: search + district select + status filter + `StatusPill` + raw `<table>`, linking to the **public** `/glaciers/$glacierId`.) Task #6's `admin.glaciers.index.tsx` is that same table. PRD L54/L98 say per-domain pages _supersede_ today's single-page `/admin`. **The clearly-wrong option is building a second glacier table and leaving `admin.index.tsx` intact** — that re-creates exactly the duplication task #5 spent five steps eliminating. Recommend: move the register `<section>` out of `admin.index.tsx` into `admin.glaciers.index.tsx` (converting to shadcn `Table`), leaving `/admin` as StatCards + HazardMap. Either way the new table must link to **`/admin/glaciers/$glacierId`**, not the public route.
2. **DoD says the table goes in `admin.glaciers.tsx` — it must not.** That file is the Outlet parent; putting a table there would render it above every detail page. It belongs in `admin.glaciers.index.tsx`. The lakes triple already settles this.
3. **`Tabs` has no natural home unless deliberately placed.** Districts is one table; the glacier list is one table. Recommend `Tabs` on `admin.glaciers.$glacierId.tsx` as **Overview | Observations** — the obvious fit, and it's how the admin twin differentiates from the public 19KB page. Decide this in the plan, not at build time, or the "first real consumers" clause silently goes unmet.
4. **Reusing `api/public/glaciers/$glacierId` for the admin detail is zero new code but returns a fat bundle** — glacier + observations + _all_ lakes (`listLakesForAssoc()`) + district cases. For a view-only task, recommend reuse and note the cost; PRD §4's lean `api/admin/glaciers.$glacierId.ts` is the alternative but adds a file and regenerates `routeTree.gen.ts`.
5. `numeric` → string coercion: forget `Number(...)` and `.toFixed()` throws at runtime, which `tsc` will not catch.

---

## Suggested atomic commits

Each verifiable with `bunx tsc --noEmit && bun run lint`, plus the stated manual check.

1. **`admin.districts.tsx`** — replace placeholder with a `useQuery(["districts"])` + shadcn `Table` (name / province), house styling, loading + empty rows. Manual: 2 rows render.
2. **`admin.glaciers.index.tsx`** — move the register out of `admin.index.tsx` into it, converted to shadcn `Table`, links retargeted to `/admin/glaciers/$glacierId`; trim `admin.index.tsx` to StatCards + HazardMap in the same commit. Manual: 6 glaciers at `/admin/glaciers`; `/admin` still shows map + stats with no duplicate table.
3. **`admin.glaciers.$glacierId.tsx`** — `useQuery(["glacier", glacierId])` against the existing bundle endpoint; `Tabs` Overview | Observations; Overview = `StatCard` grid + district/source metadata; Observations = shadcn `Table` with an honest empty state. Manual: Badswat detail shows Ghizer + empty observations.

**Key file paths:** `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.index.tsx`, `.../src/routes/admin.districts.tsx`, `.../src/routes/admin.glaciers.index.tsx`, `.../src/routes/admin.glaciers.$glacierId.tsx`, `.../src/routes/glaciers.$glacierId.tsx`, `.../src/lib/queries.ts`, `.../src/lib/auth-guard.ts`, `.../src/components/cryohealth/StatCard.tsx`, `.../src/components/cryohealth/AdminShell.tsx`, `.../src/components/ui/table.tsx`, `.../src/components/ui/tabs.tsx`, `/Users/m5/Projects/uexel/cryo/CryoHealth-api/scripts/seed-dev-data.ts`, `/Users/m5/Projects/uexel/cryo/CryoHealth-api/src/database/migrations/1785700000000-WebSchema.ts`.
