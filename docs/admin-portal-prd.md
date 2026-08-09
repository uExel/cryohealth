# PRD — CryoHealth Admin Portal

Status: Draft · Author: Claude (with Shaan) · Date: 2026-08-09
Repo: `cryohealth` (TanStack Start dashboard) · Depends on: `CryoHealth-api` for new write endpoints

## 1. Problem & goal

Today's `/admin` (`src/routes/admin.tsx`) is a single page — a glacier register with a
hazard map. It has no CRUD (every query in `src/lib/queries.ts` is read-only except
`insertAlert`, `insertAlertAck`, `insertCase`), no coverage of most of the data model
(districts, facilities, protocols, users, cases, audit trail are invisible), and no
visibility into the three other services this dashboard depends on
(`CryoHealth-api`, `CryoHealth-geo`, `CryoHealth-app`).

**Goal**: a proper admin portal — sidebar-navigated, grouped by domain — that gives
`cryohealth_admin` and `facility_admin` users full monitoring and CRUD control over
platform data, plus a live health overview of the connected services, built entirely
from this repo's existing (mostly unused) design system rather than new UI patterns.

## 2. Users & permissions

Roles are fixed today at `src/lib/jwt.ts:3`: `cryohealth_admin | facility_admin | chw | viewer`.
Client-side `isAdmin` (`src/lib/auth.tsx:44`) currently treats `cryohealth_admin` and
`facility_admin` as identical — no distinction exists anywhere. This PRD introduces one,
because "tiered CRUD" and a facility_admin's naturally narrower scope both need it:

| Role               | Portal access                                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cryohealth_admin` | Full portal: all domains, full CRUD, users/roles, audit log, connected-systems                                                                                             |
| `facility_admin`   | Portal minus Users & Roles and System Health; CRUD on content domains scoped conceptually to their facility (see §7 open question — no facility-scoping column exists yet) |
| `chw`, `viewer`    | No portal access (unchanged — redirected to the existing "Admin access required" gate)                                                                                     |

This requires a new `requireRole(claims, roles[])` helper in `src/lib/auth-guard.ts`,
modeled on the one existing inline check at `src/routes/api/public/alerts.ts:20`
(`claims.role !== "cryohealth_admin" && claims.role !== "facility_admin"`) — today that
check is duplicated per-handler; centralize it since the admin API will need it on ~15
new endpoints.

## 3. Information architecture — sidebar

Activates `src/components/ui/sidebar.tsx` (744 lines, fully-built shadcn primitive,
currently **zero imports anywhere in the app** — confirmed via repo-wide grep). Visual
language follows `SiteHeader.tsx`, not shadcn defaults: flat 2px borders, zero
border-radius, `var(--color-line)` / `var(--color-accent)`, no shadows (see the brand
rule documented near the Leaflet override block in `src/styles.css`).

```
┌─ Overview ──────────────────────────
│  Dashboard              (existing KPI view, relocated under the sidebar)
│
├─ Hazard data ───────────────────────
│  Districts
│  Glaciers
│  Lakes                  (supersedes today's single-page /admin)
│  Glacier observations
│  Lake risk scores        [view + audit-only]
│  Hazard scores            [view + audit-only]
│
├─ Alerts & response ─────────────────
│  Alerts                 (full CRUD; today insertAlert() exists, no update/delete)
│  Alert acknowledgements  [view-only]
│  Protocols               (full CRUD — flag every edit: "sourced from a lookup
│                            table, never generate protocol text" per CLAUDE.md)
│
├─ Health workforce ───────────────────
│  CHW profiles
│  Cases                  (full CRUD; today insertCase() only)
│  Facilities
│
├─ People & access ───────────────────  (cryohealth_admin only)
│  Users & roles
│  Audit log                [view-only, exportable]
│
└─ Platform ───────────────────────────  (cryohealth_admin only)
   System health            (CryoHealth-api / -geo / -app status)
   Sync activity            [view-only — see §6, mostly unbuilt upstream]
```

Grouping matches `SidebarGroup`/`SidebarGroupLabel`/`SidebarMenu` (`sidebar.tsx:409-582`).
Collapsible sub-groups need `collapsible.tsx` composed on top — also installed, also
unused, no existing pattern to follow, so this is new composition work, not reuse.

**Layout**: `__root.tsx` renders `<SiteHeader /><Outlet />` with no layout route
anywhere in the repo. The sidebar needs a persistent wrapper across all `admin.*`
routes — since no pathless layout route exists as precedent, the simplest option
consistent with this repo's flat-file convention is a shared `<AdminShell>` component
in `src/components/cryohealth/AdminShell.tsx` that each `admin.*.tsx` route renders
itself (mirrors how every page currently self-composes rather than relying on nested
layouts).

## 4. Routes (flat dot-segment convention — matches `lakes.$lakeId.tsx`, no `admin/` directory exists today)

| Route                                                 | Replaces / extends                                           |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| `admin.tsx`                                           | Becomes the Overview/dashboard landing inside `<AdminShell>` |
| `admin.districts.tsx`                                 | new                                                          |
| `admin.glaciers.tsx`, `admin.glaciers.$glacierId.tsx` | extends existing public glacier detail page's admin twin     |
| `admin.lakes.tsx`, `admin.lakes.$lakeId.tsx`          | supersedes today's single-page inventory table               |
| `admin.alerts.tsx`                                    | new — today's `/alerts` is public read-only                  |
| `admin.protocols.tsx`                                 | new                                                          |
| `admin.cases.tsx`                                     | new                                                          |
| `admin.facilities.tsx`                                | new                                                          |
| `admin.chw-profiles.tsx`                              | new                                                          |
| `admin.users.tsx`                                     | new, `cryohealth_admin` only                                 |
| `admin.audit.tsx`                                     | new, `cryohealth_admin` only                                 |
| `admin.system-health.tsx`                             | new, `cryohealth_admin` only                                 |

API writes live under a new `src/routes/api/admin/` directory (parallel to the existing
`api/public/` and `api/auth/`), one file per resource, each following the exact
scaffold already established at `src/routes/api/public/alerts.ts` (auth via
`requireAuth`, then role check, then a `queries.ts` function, then `Response.json`).
`src/routes/api/public/lakes-admin.ts` is GET-only today despite its name — a natural
first file to extend with PUT/DELETE rather than duplicating into `api/admin/`.

## 5. Data domain → CRUD matrix

"Full CRUD" = create/read/update/delete in the UI, gated by role per §2.
"View + audit-only" = read-only in the UI; the only way the value changes is through
the system that owns it (see rationale column) — this is the tiering the user asked
for, and it isn't arbitrary: these are the same tables the seed-data work earlier this
session deliberately did _not_ write directly to, because they represent policy or
pipeline **output**, not input a human types in a form.

| Domain                 | Table(s)                 | Portal capability                                                                                                                                                                 | Rationale                                                                                                                                                                                             |
| ---------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Districts              | `districts`              | Full CRUD                                                                                                                                                                         | Reference data                                                                                                                                                                                        |
| Glaciers               | `glaciers`               | Full CRUD                                                                                                                                                                         | Inventory, human-curated                                                                                                                                                                              |
| Glacier observations   | `glacier_observations`   | **View + audit-only**                                                                                                                                                             | CryoHealth-geo pipeline output — editing here would silently diverge from the Sentinel-2 run that produced it                                                                                         |
| Lakes                  | `lakes`                  | Full CRUD **except** `currentTier`, `current_risk_score`                                                                                                                          | Those two columns are tier _policy_ output owned by CryoHealth-api's alert service (CLAUDE.md: "never silent ML — a human-auditable reason is required")                                              |
| Lake risk scores       | `lake_risk_scores`       | **View + audit-only**                                                                                                                                                             | Scored hazard output                                                                                                                                                                                  |
| Hazard scores          | `hazard_scores`          | **View + audit-only**                                                                                                                                                             | Written by CryoHealth-geo via `POST /alerts/hazard-scores` (service-key auth, `alerts.controller.ts:49`)                                                                                              |
| Alerts                 | `alerts`                 | Full CRUD                                                                                                                                                                         | Human-issued; `insertAlert()` exists today, needs update (edit/clear) + delete                                                                                                                        |
| Alert acknowledgements | `alert_acknowledgements` | View-only                                                                                                                                                                         | Derived from CHW action, not admin-authored                                                                                                                                                           |
| Protocols              | `protocols`              | Full CRUD, **with a hard warning banner on every edit form**                                                                                                                      | CLAUDE.md: dosing/diagnosis text must come from a lookup table, never be generated — the admin UI is that lookup table's editor, so it must not offer an "improve wording"/AI-assist affordance, ever |
| Facilities             | `facilities`             | Full CRUD                                                                                                                                                                         | Reference data                                                                                                                                                                                        |
| CHW profiles           | `chw_profiles`           | Full CRUD                                                                                                                                                                         | Reference/roster data                                                                                                                                                                                 |
| Cases                  | `cases`                  | Full CRUD, but treat as clinical-adjacent — confirm delete (soft-delete preferred; schema has no `deleted_at` today, add one)                                                     | Demo/real patient-adjacent records                                                                                                                                                                    |
| Users & roles          | `users`                  | **View + restricted actions**: create, deactivate (`active=false`), role change — **no hard delete** (FK `cases.chw_id ON DELETE RESTRICT` already enforces this at the DB level) | Security-sensitive                                                                                                                                                                                    |
| Audit log              | `audit`                  | **View-only, exportable (CSV)**                                                                                                                                                   | It's the audit trail — already actively written by `alerts.service.ts`; making it editable would defeat its purpose                                                                                   |
| Sync log               | `sync_log`               | View-only                                                                                                                                                                         | See §6 — currently unpopulated, no writer exists yet                                                                                                                                                  |
| CHW offline cases      | `chw_cases`              | View-only                                                                                                                                                                         | Same — schema exists, no API writer yet                                                                                                                                                               |

## 6. Connected-systems / platform health

Grounded in what's real today, not proposed-but-unbuilt:

- **CryoHealth-api**: `GET /health` (`src/health/health.controller.ts`) returns
  `{status, database}` — public, no auth. Poll this from `admin.system-health.tsx`.
- **CryoHealth-geo**: `GET /health` returns `{status, scheduler_running}`
  (`pipeline/service.py:90`). Also surface manual trigger buttons for
  `POST /run` and `POST /run-hazard` (same file, lines 95/102) — an admin
  "run the pipeline now" action, not just passive monitoring. **`cryohealth_admin`
  only** — `facility_admin` does not see these buttons, and the server enforces it
  even if they hit the API directly (see §10, resolved).
- **CryoHealth-app**: **no live signal exists today.** `sync_log` and `chw_cases`
  tables are fully scaffolded in the shared schema (`sync-log.entity.ts`,
  columns for `deviceId`/`itemCount`/`status`) but grep across all of
  `CryoHealth-api/src` finds **no controller or service that ever writes to
  `sync_log`** — the offline-sync feature is schema-ahead-of-implementation.
  **This PRD's "Sync activity" page will show an honest empty state** ("No sync
  data yet — CryoHealth-api's sync endpoint is not built") rather than fabricate
  activity. Building that endpoint is a `CryoHealth-api` task, out of scope here,
  but flagged as a blocking dependency for this page to ever show real data.

Cross-repo call: since `cryohealth`'s own server already holds `CRYOHEALTH_API_URL`
and would need a similar `CRYOHEALTH_GEO_URL` env var (does not exist yet in
`.env.example` — add it), these two health checks are simple server-side `fetch()`
calls proxied through a new `src/routes/api/admin/system-health.ts`, not client-side
CORS calls (CryoHealth-geo has no CORS policy documented for browser access).

## 7. Component reuse plan (grounded in current repo state)

Reuse:

- `src/lib/tier.tsx`'s `TierBadge` — the one properly shared status component today;
  every lake/alert tier column in the new admin tables uses it directly.
- shadcn `Table`, `Tabs`, `Dialog`, `Form` (`src/components/ui/`) — all fully built,
  **currently unused anywhere in the app**. The admin portal is their first consumer.
  `Form` is react-hook-form-based; pairs with `zod` (already a dependency,
  `package.json`) for the validation this codebase's write endpoints currently lack
  entirely (today's 3 POST handlers do a bare `as {...}` cast, no schema validation).
- `sidebar.tsx` + `collapsible.tsx` for the nav itself.

Extract (net-new, but consolidating existing duplication rather than inventing style):

- **`StatCard`** — `Stat` is independently copy-pasted in `index.tsx:383`,
  `admin.tsx:277`, `lakes.$lakeId.tsx:253`, `glaciers.$glacierId.tsx:413`. Extract once
  to `src/components/cryohealth/StatCard.tsx`, use everywhere including new admin
  pages.
- **`StatusPill`** (glacier stability: stable/retreating/advancing/surging/unknown) —
  today only in `admin.tsx:302`, using raw Tailwind colors (`bg-blue-100` etc.)
  disconnected from the CSS-var tier system. Reconcile onto CSS vars when extracting,
  for dark-mode correctness (see the `PipelineDiagram` dark-mode contrast bug fixed
  earlier this session — the same class of bug is likely here since these are
  hardcoded Tailwind palette classes, not theme tokens).

New validation layer: introduce `zod` schemas per resource in a new
`src/lib/admin-schemas.ts`, used by both the `Form` components and the new
`api/admin/*` route handlers (single source of truth for shape, client + server).

## 8. Non-functional requirements

- **Audit every admin mutation.** Write to the `audit` table (`actorId`, `action`,
  `entityType`, `entityId`, `reason`, `meta`) on every create/update/delete from the
  new `api/admin/*` handlers — extending the pattern `alerts.service.ts` already
  established, not a new concept.
- **Dark mode + RTL**, matching the rest of the site (verified working elsewhere this
  session) — every new admin component must use theme tokens, never hardcoded hex.
- **No fabricated content in Protocols.** Enforced at the UI level: no AI-assist /
  "generate" button on the protocol editor, full stop (see §5).
- **Confirm before destructive actions** — matches this session's own operating rule;
  applies doubly inside the product now (delete confirmations, soft-delete on `cases`).

## 9. Phasing

1. `AdminShell` + sidebar IA + route scaffolding (empty pages, nav only)
2. Read-only views for every domain in §5 (fastest value: turns invisible tables visible)
3. CRUD write endpoints + forms for the "Full CRUD" rows, one domain at a time,
   starting with Alerts and Lakes (highest existing partial support: `insertAlert`,
   `listLakesAdmin` already exist)
4. Users & roles + Audit log (`cryohealth_admin`-only screens)
5. System health page (CryoHealth-api + -geo `/health` polling, manual pipeline
   trigger buttons)
6. Sync activity page — ships as an honest empty state; revisit once
   `CryoHealth-api` builds a real sync endpoint

## 10. Open questions (need a decision before build)

1. **Facility-scoping for `facility_admin`.** No `facilityId` scoping column exists on
   most content tables (lakes, alerts, cases) — only `users.facilityId` exists. Does
   `facility_admin` get full-dataset CRUD (same as today's `isAdmin` boolean, just
   without Users/System Health), or does this PRD's tiering require a schema change
   to scope rows to a facility? Recommend: ship full-dataset access for both admin
   roles first (matches current behavior, zero schema risk), track facility-scoping
   as a fast-follow.
2. **`cases` soft-delete column.** Needs a migration (`deleted_at timestamptz null`)
   in `CryoHealth-api` — that repo owns all migrations per workspace CLAUDE.md. This
   PRD assumes that migration lands before Cases CRUD ships.
3. ~~CryoHealth-geo CORS / auth for `POST /run` triggers from the admin UI.~~
   **Resolved**: only `cryohealth_admin` may trigger `/run` and `/run-hazard` —
   `facility_admin` does not get this action, same as the rest of the Platform group
   in §3. Enforcement is server-side, not a hidden button: the browser never calls
   CryoHealth-geo directly (it's unauthenticated within the docker-compose network,
   fine for service-to-service, not fine for direct browser access). The "run
   pipeline now" button calls `cryohealth`'s own `POST /api/admin/system-health/run`,
   which does `requireRole(claims, ["cryohealth_admin"])` before proxying to
   CryoHealth-geo — so a `facility_admin` hitting the endpoint directly (not just
   clicking the hidden button) still gets a 403.
