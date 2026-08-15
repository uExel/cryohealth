# Task #8 findings — read-only admin views: Alerts, Alert acknowledgements, Protocols

## Headline

**#8 is the cheapest of the three so far.** Unlike #7 (which needed a new query *and* a new
endpoint, with a real auth decision attached), #8 needs **zero new endpoints** and **zero new
query functions**. All three data paths already exist and are already wired:

| Need | Already exists |
| --- | --- |
| Alerts list | `listAllAlerts()` → `GET /api/public/alerts` |
| Alert acknowledgements | `listAlertAcks()` → `GET /api/public/alert-acks` |
| Protocols | `listProtocols()` → `GET /api/public/protocols` |

Four findings materially shape the task:

1. **The only data-access gap is display-level, not row-level.** `listAllAlerts()` already
   returns cleared alerts (it has no `WHERE`), but it selects **neither `status` nor
   `clearedAt`** — so the UI cannot tell a cleared alert from an active one. "All alerts
   including cleared" is satisfied at the row-set level and **not** at the display level.
   Two additive columns close it. See §3 and the GATE item in §9.
2. **"Acknowledgements inline, view-only" already has a working precedent in this repo.**
   `src/routes/alerts.tsx:85` does exactly this — a second `useQuery` on
   `/api/public/alert-acks`, then `ackCount(id)` by client-side filter. No join, no new
   query, no CHW names. See §4 and the deferred variant in §9 (D2).
3. **No file-layout deviation this time.** Both routes already exist as flat 9-line
   `AdminPlaceholder` files with no `.index`/`.$id` siblings, and both nav entries are
   already wired. #6/#7's D1 deviation does **not** recur. See §1.
4. **`alerts.tier` is the `public.tier` enum → no `isTier` narrowing guard needed.** This
   is the opposite of #7's D4. Do not cargo-cult the guard. See §5.

Two live latent bugs found, both out of scope, both worth filing (§8).

---

## 1. Exact current state of the two route files

Both exist. Both are flat placeholders. **There is no route triple and there must not be one.**

| File | Lines | State |
| --- | --- | --- |
| `src/routes/admin.alerts.tsx` | 9 | `AdminPlaceholder title="Alerts"`, route id `"/admin/alerts"`, `head` with `noindex` already set. |
| `src/routes/admin.protocols.tsx` | 9 | `AdminPlaceholder title="Protocols"`, route id `"/admin/protocols"`, `head` with `noindex` already set. |

No `admin.alerts.index.tsx`, no `admin.alerts.$alertId.tsx`, no `admin.protocols.*` siblings —
confirmed by `ls src/routes/`. The DoD's naming (`admin.alerts.tsx`, `admin.protocols.tsx`, no
`.index`/`.$id` split) is therefore **literally correct** and matches what is on disk.

> **Negative constraint for the build agent:** do **not** convert either file into an
> `Outlet` parent. Unlike `admin.lakes.tsx` / `admin.glaciers.tsx`, these are leaf routes.
> Adding `component: () => <Outlet />` would blank both pages. There is no detail view in #8.

**Sidebar: no work needed.** `src/components/cryohealth/AdminShell.tsx:31-38` already has the
"Alerts & response" group with `{ to: "/admin/alerts", label: "Alerts", exact: false }` and
`{ to: "/admin/protocols", label: "Protocols", exact: false }`. `adminOnly: false`, so both
are visible to `facility_admin` as well as `cryohealth_admin`.

**Shell + role gate: no work needed.** `src/routes/admin.tsx:29-55` renders
`<AdminShell><Outlet/></AdminShell>` behind an `isAdmin` check with a loading state. Every
`admin.*` child inherits that. **Do not add a per-page role check.**

**Precedent to model on, file-for-file:**

- Simple flat admin page → `src/routes/admin.districts.tsx` (89 lines). The minimal shape:
  `main.mx-auto.max-w-5xl.px-4.py-6`, `<header>` with `h1` + count subtitle, `isError` amber
  banner (L42-53), `div.rounded-xl.border.border-border.bg-card` wrapping a shadcn `Table`,
  `TableRow className="border-border bg-secondary/50 hover:bg-secondary/50"` on the header
  row, `TableHead className="text-xs uppercase text-muted-foreground"`,
  `TableBody className="divide-y divide-border"`, explicit loading row and empty row with
  `colSpan`. **This is the right template for `admin.protocols.tsx`.**
- List page with search/filter → `src/routes/admin.glaciers.index.tsx:38-120`. Adds
  `useState` search + `<select>` filters, `const filtered = (rows ?? []).filter(...)`, a
  combined `isError = aError || bError` with per-source error copy, and a filter bar
  `div.flex.flex-wrap.items-center.gap-2.border-b.border-border.p-3` inside the card, above
  the `Table`. **This is the right template for `admin.alerts.tsx`.** Use `max-w-7xl`
  (as `admin.glaciers.index.tsx:79` does) — the alerts table is wider than districts'.
- Ack-count-per-row → `src/routes/alerts.tsx:55-63` (the `useQuery`) and `:85`
  (`const ackCount = (alertId: string) => (acks ?? []).filter((a) => a.alert_id === alertId).length;`).
- Protocol card rendering → `src/routes/chw.tsx:126-149`. Useful for the `body`/`source`
  treatment; **its disaster-badge colour is the one thing not to copy** (see §7).

No `loader:` anywhere in `src/routes/` — data fetching is uniformly `useQuery` + `fetch`.
Do not introduce loaders.

---

## 2. Exact schemas (read from CryoHealth-api migrations, then verified against the live DB)

**No postgres.js `transform` is configured** (`src/lib/db.ts`) — column names arrive exactly
as the SQL emits them, which is why `queries.ts` hand-aliases `"createdAt" AS created_at`.

### `alerts` — `1785608131024-InitialSchema.ts:41`, extended by `1785700000000-WebSchema.ts:44-60` and `1786204276808-AlertChipsAndChecklist.ts:14-17`

```
"id"                  uuid PK DEFAULT uuid_generate_v4()
"lakeId"              uuid            NULL  → FK lakes(id) ON DELETE SET NULL
"tier"                "public"."tier" NOT NULL   -- ENUM('normal','watch','high','critical')
"title"               varchar         NOT NULL
"body"                text            NOT NULL
"windowStart"         TIMESTAMPTZ     NULL
"windowEnd"           TIMESTAMPTZ     NULL
"downstreamSummary"   text            NULL
"status"              "public"."alert_status" NOT NULL DEFAULT 'active'  -- ENUM('active','cleared')
"issuedById"          uuid            NULL  → FK users(id)
"createdAt"           TIMESTAMPTZ     NOT NULL DEFAULT now()
"clearedAt"           TIMESTAMPTZ     NULL
district_id           uuid            NULL  → FK districts(id) ON DELETE SET NULL
body_en               text            NULL
body_ur               text            NULL
estimated_window      text            NULL
affected_population   integer         NOT NULL DEFAULT 0
chips                 jsonb           NULL
checklist             jsonb           NULL
-- UNIQUE INDEX idx_alert_active_lake_tier ("lakeId","tier") WHERE status = 'active'
```

`alert_status` enum declared at `InitialSchema.ts:38`: `ENUM('active', 'cleared')`. **That is
the "cleared" concept** — a `status` enum *plus* a nullable `clearedAt` timestamp. There is no
boolean and no `deletedAt`.

### `alert_acknowledgements` — `1785700000000-WebSchema.ts:171-179`

```
"id"              uuid PK DEFAULT uuid_generate_v4()
"alert_id"        uuid        NOT NULL REFERENCES alerts(id)  ON DELETE CASCADE
"chw_id"          uuid        NOT NULL REFERENCES users(id)   ON DELETE CASCADE
"acknowledged_at" TIMESTAMPTZ NOT NULL DEFAULT now()
CONSTRAINT "UQ_ack_alert_chw" UNIQUE ("alert_id","chw_id")
```

Snake_case throughout — no double-quoting needed. The `UNIQUE(alert_id, chw_id)` is what makes
`insertAlertAck`'s `ON CONFLICT DO NOTHING` idempotent, and it means **ack count == distinct
CHW count**, no `DISTINCT` needed.

### `protocols` — `1785700000000-WebSchema.ts:70-81`

```
"id"          uuid PK DEFAULT uuid_generate_v4()
"slug"        text        NOT NULL  UNIQUE (UQ_protocols_slug)
"title"       text        NOT NULL
"category"    text        NOT NULL
"body"        text        NOT NULL
"source"      text        NOT NULL DEFAULT 'WHO IMNCI'
"is_disaster" boolean     NOT NULL DEFAULT false
"created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
```

All snake_case, no quoting needed, **no nullable columns at all** except none — every column is
`NOT NULL`. That simplifies the row type: no `| null` anywhere.

### There is no numeric-as-string trap in #8

This is the notable *absence* versus #6/#7. Grep of all three tables' DDL: **zero `numeric`
columns.** `affected_population` is `integer` (real JS number), `is_disaster` is `boolean`
(real JS boolean), everything else is `text`/`varchar`/`uuid`/`timestamptz`/enum/jsonb.
Do not add defensive `Number(...)` wrappers here and do not claim the risk exists.

The **jsonb trap** (`chips`, `checklist` → parsed JS objects, "Objects are not valid as a React
child") applies only if someone adds them to the SELECT. `listAllAlerts()` does **not** select
them today and #8 has no reason to. Treat it as a *don't*, not a risk.

---

## 3. Exact return shapes of the three existing query functions

### `listAllAlerts(limit = 200)` — `src/lib/queries.ts:126-138`

```sql
SELECT a.id, a."lakeId" AS lake_id, a.district_id, upper(a.tier::text) AS tier, a.title,
       a.body_en, a.body_ur, a.estimated_window, a.affected_population,
       a."createdAt" AS created_at, l.name AS lake_name, d.name AS district_name
FROM alerts a
LEFT JOIN lakes l     ON l.id = a."lakeId"
LEFT JOIN districts d ON d.id = a.district_id
ORDER BY a."createdAt" DESC
LIMIT ${limit}
```

- **Already joins both `lakes` and `districts`** — unlike `listLakesAdmin()` in #7, there is
  **no second `useQuery` needed** for the district column. `lake_name` and `district_name`
  come back in-row (both `LEFT JOIN` → both nullable, and both *are* null for one live row —
  see §6).
- **Already returns cleared alerts** — no `WHERE status = ...`. Verified live: the cleared
  Khurdopin row is in the response today.
- **Does NOT select `status` or `clearedAt`.** ← the one real gap.
- `tier` is already `upper(a.tier::text)` → `"NORMAL" | "WATCH" | "HIGH" | "CRITICAL"`. Safe
  to feed `TierBadge` directly.

**Proposed additive change (two columns, nothing else):**

```sql
       a.status::text AS status, a."clearedAt" AS cleared_at,
```

`status::text` yields lowercase `'active'` / `'cleared'` — verified live
(`SELECT DISTINCT status::text FROM alerts` → `active`, `cleared`).

> **Decided, not open: keep it lowercase** (`a.status::text`, no `upper()`), and format for
> display in the UI. Step 1's verification command and Step 2's status-filter values both
> assume lowercase. Row type: `status: "active" | "cleared"`. Do **not** write
> `upper(a.status::text)` — the curl check in Step 1 would then appear to fail for the wrong
> reason. (Contrast `tier`, which *is* uppercased in SQL, because `TierBadge` takes
> uppercase.)

### `listAlertAcks()` — `src/lib/queries.ts:183-186`

```sql
SELECT alert_id, chw_id, acknowledged_at FROM alert_acknowledgements
```

Unfiltered, unordered, unlimited, **no join to `users`**. Returns every ack row in the table.
`chw_id` is a bare uuid. Backed by `GET /api/public/alert-acks` → `{ acks: [...] }`.

### `listAlertsForLake(lakeId)` — `src/lib/queries.ts:115-124` (not used by #8, but load-bearing for §8)

```sql
SELECT id, title, upper(tier::text) AS tier, "createdAt" AS created_at, estimated_window
FROM alerts WHERE "lakeId" = ${lakeId} ORDER BY "createdAt" DESC LIMIT 10
```

**Also selects no `status`.** It backs the `alerts` key of
`src/routes/api/public/lakes.$lakeId.ts:11`, which the public lake-detail page renders at
`src/routes/lakes.$lakeId.tsx:191`. So the "cleared alerts look active" defect (B2) has **two**
public call sites, not one. #8 touches neither — see §8.

### `listOpenAlerts(limit = 5)` — `src/lib/queries.ts:140-149`

```sql
SELECT id, title, upper(tier::text) AS tier, "createdAt" AS created_at, estimated_window
FROM alerts WHERE tier IN ('high','critical') ORDER BY "createdAt" DESC LIMIT ${limit}
```

Consumed only by `chw.tsx` via `GET /api/public/open-alerts`. **Not used by #8.** Carries
bug B1 (§8).

### `insertAlert(...)` / `insertAlertAck(alertId, chwId)` — `src/lib/queries.ts:151-167`, `:188-195`

Both exist and both are already wired (§4). **#8 must not call, change, or extend either** —
they are the write path that #12 builds on. `insertAlert` lowercases the tier before insert
(`${input.tier.toLowerCase()}`) because the column is the `public.tier` enum; noted only so
nobody "fixes" the uppercase read path to match.

### `listProtocols()` — `src/lib/queries.ts:178-181`

```sql
SELECT * FROM protocols ORDER BY is_disaster DESC
```

`SELECT *` → all eight columns (`id, slug, title, category, body, source, is_disaster,
created_at`). The `is_disaster DESC` ordering is confirmed and is the right default for the
admin table too: disaster/GLOF protocols first. **Do not change the query** —
`chw.tsx` and the Open Data page both consume it and rely on that order.

---

## 4. Existing API routes — nothing new is needed

| Route file | Handlers | Auth |
| --- | --- | --- |
| `src/routes/api/public/alerts.ts` | `GET` → `{ alerts }` from `listAllAlerts(200)`; `POST` → `insertAlert` | GET **ungated**; POST `requireAuth` + `requireRole(["cryohealth_admin","facility_admin"])` (L12-20) |
| `src/routes/api/public/alert-acks.ts` | `GET` → `{ acks }` from `listAlertAcks()`; `POST` → `insertAlertAck(alertId, claims.sub)` | GET **ungated**; POST `requireAuth` only (no role check — any signed-in user can ack) |
| `src/routes/api/public/protocols.ts` | `GET` → `{ protocols }` | **ungated** |
| `src/routes/api/public/open-alerts.ts` | `GET` → `{ alerts }` from `listOpenAlerts(5)` | ungated. Backs `chw.tsx` only — **not used by #8** |

**So: there is no §4-style "new endpoint, gate it or not" decision in #8.** That was #7's
defining GATE item and it does not recur. `admin.alerts.tsx` and `admin.protocols.tsx` can be
pure client-side pages hitting three existing GETs with plain `fetch` (not `authFetch` — all
three are ungated; using `authFetch` would be harmless but misleading).

**Which endpoints are documented Open Data** (`src/routes/data.tsx`, the public API catalogue):
`/api/public/alerts` **is** (L73, with a published example payload at L75-90) and
`/api/public/protocols` **is** (L118-120). `/api/public/alert-acks` is **not** listed — it is
ungated but undocumented. That asymmetry matters for §9's GATE items.

---

## 5. `TierBadge` on `alerts.tier` — no narrowing guard needed

**Import:** `import { TierBadge, type Tier } from "@/lib/tier";`
Signature (`src/lib/tier.tsx:78`): `TierBadge({ tier: Tier, solid?: boolean, className?: string })`.

`alerts.tier` is the `public.tier` **enum** — `ENUM('normal','watch','high','critical')`
(`InitialSchema.ts:17`). `upper(a.tier::text)` can therefore only ever produce
`NORMAL|WATCH|HIGH|CRITICAL`. The database constrains it.

> **Explicitly: do NOT copy the `isTier()` guard from
> `src/routes/admin.lakes.$lakeId.tsx:25-28`.** That guard exists because
> `lake_risk_scores.tier` is unconstrained `text` (#7's D4). `alerts.tier` is an enum. A guard
> here is dead code that implies a risk that does not exist. Type the row as
> `tier: Tier` and render `<TierBadge tier={a.tier} />` with no cast.

**`solid` convention** (`tier.tsx:72-77` doc comment): *"reserve that for a hero/header context
(e.g. an uncleared CRITICAL alert), not a dense list row."* The admin alerts table **is** a
dense list row → use bare `<TierBadge tier={a.tier} />`. Note that `src/routes/alerts.tsx:120`
uses `solid={a.tier === "CRITICAL"}` — that page is a card feed, not a table, so it is not the
precedent to follow here. (Amusingly the doc comment says "*uncleared* CRITICAL", which the
public page cannot currently determine — see §8.)

Never re-derive tier colour; `tierClasses[t].hex` is the sanctioned escape hatch for
recharts/Leaflet only.

### The enum-cast rule, stated correctly

The rule is **not** "`::text` is mandatory on enum columns". Selecting an enum column bare is
fine and yields a string. What fails is applying a **text function** to it. Verified live:

```
cryohealth=> select upper(tier) from alerts limit 1;
ERROR:  function upper(tier) does not exist
```

This throws at **parse time**, so it fails even against an empty table — but only when the
query actually runs, which is why an unexercised code path hides it (the project-memory bug).

Applied to #8:
- `upper(a.tier::text)` — already correct in `listAllAlerts`. Leave it.
- `a.status::text AS status` — cast needed to get a JS string out of the `alert_status` enum,
  and mandatory if you wrap it in `upper()`.
- `a."clearedAt"` — plain timestamptz, no cast, but **must be double-quoted** (camelCase),
  same as `"createdAt"` / `"lakeId"` already are in this query.

---

## 6. Live seeded state (verified against Postgres on :5433, not inferred)

**Alerts — 4 rows, not 3.** The seed script inserts 3; a 4th (`test smoke check`) exists from
prior manual broadcast-form testing in an earlier session:

| Title | tier | status | clearedAt | lake_name | district_name | affected_pop | body_ur |
| --- | --- | --- | --- | --- | --- | --- | --- |
| test smoke check | normal | active | NULL | **NULL** | **NULL** | 0 | NULL |
| Shishper Lake outburst likely tonight | critical | active | NULL | Shishper (Hassanabad) glacial lake | Hunza | 0 | NULL |
| Meltwater surge in Hassanabad | high | active | NULL | Shishper (Hassanabad) glacial lake | Hunza | 0 | NULL |
| Khurdopin drainage slowing | watch | **cleared** | 2026-08-07 14:54:52+00 | Khurdopin glacial lake | Hunza | 0 | NULL |

Consequences for the build:
- **`lake_name` and `district_name` are both genuinely NULL on a live row.** Render `—`, do
  not assume presence. (`admin.glaciers.index.tsx`'s `districtById[...]?.name ?? "—"` pattern.)
- `body_ur` is NULL on every row → the Urdu column/row will be empty in dev. That is correct,
  not a bug.
- `affected_population` is `0` everywhere → `.toLocaleString()` renders `0`. Fine.
- **Do not assert "exactly 3 alerts"** in any verification step. Assert *at least* the three
  seeded titles and *exactly one* `cleared`.
- The `test smoke check` row is pre-existing dev noise, **not** something #8 should clean up.

**Acknowledgements — 1 row:** `Amina Baig` (`role = chw`) acknowledged
*"Meltwater surge in Hassanabad"* at `2026-08-09 14:54:52+00`. Every other alert has **0** acks.
So the admin table will show `1` on one row and `0` on three — enough to prove the join-free
count works, and enough to prove the zero case renders.

**Protocols — 2 rows** (ordered `is_disaster DESC`):

| slug | category | is_disaster | body length | source |
| --- | --- | --- | --- | --- |
| `glof-evacuation-checklist` | GLOF · Evacuation | **true** | 122 chars | Transcribed from CryoHealth-app src/lib/mock.ts ALERT_DETAIL.checklist |
| `fast-breathing-pneumonia-2y` | IMCI · Respiratory | false | 454 chars | WHO IMCI chart booklet · LHW curriculum (transcribed from …) |

**`body` is multi-line joined text**, not a phrase — the IMCI one is 4 `STEP N ·` lines joined
with `\n`. Rendering it raw in a `TableCell` produces one unreadable 454-char line. Required
treatment: truncate + expand (`<details>` / a `line-clamp` + `whitespace-pre-line`), following
`chw.tsx:147`'s `whitespace-pre-line` on the expanded body.

**Provenance is honest and citable, unlike #7's `lake_risk_scores`.** All three tables have
real writers:

| Table | Writer(s) |
| --- | --- |
| `alerts` (insert) | `CryoHealth-api` alert service; **and this repo's own** `insertAlert()` via `POST /api/public/alerts` (the broadcast form at `src/routes/alerts.tsx:164`) |
| `alerts.status = 'cleared'` | `CryoHealth-api/src/alerts/alerts.service.ts:167` — `repo.update(id, { status: 'cleared', clearedAt: new Date() })`. **Nothing in this repo clears an alert.** |
| `alert_acknowledgements` | this repo's `insertAlertAck()` via `POST /api/public/alert-acks` (CHW "Acknowledge" button, `alerts.tsx:144`) |
| `protocols` | `CryoHealth-api/scripts/seed-dev-data.ts:172-184` upsert only; no runtime writer anywhere |

So **no fabricated-provenance risk in #8** and no empty-state copy problem — every table has
rows. If empty-state copy is written anyway (it should be, for robustness), it can honestly
name these writers. Note the one genuinely honest thing to say about **protocols**: it has no
runtime writer today — it is seeded, and #13 is what makes it editable.

---

## 7. What each page should show

### `admin.alerts.tsx`

Table columns (from `listAllAlerts` + the two added columns + the ack count):

| Column | Source | Notes |
| --- | --- | --- |
| Tier | `tier` | `<TierBadge tier={a.tier} />`, bare (no `solid`) |
| Title | `title` | `font-semibold text-foreground`; **not a `<Link>`** — there is no detail route |
| Status | `status` + `cleared_at` | `active` / `cleared`; show `cleared_at` as a formatted date on the cleared rows |
| Target | `lake_name` ?? `district_name` ?? `—` | both nullable; a "Lake" + "District" column pair is also fine |
| Window | `estimated_window ?? "—"` | |
| Affected | `affected_population.toLocaleString()` | integer, no `Number()` needed |
| Acks | `ackCount(a.id)` | **view-only** — a plain count, no button |
| Issued | `created_at` | **format it.** #7's fix-loop commit `0682013` was exactly this bug ("format Updated column as a date, not a raw ISO string") — use `new Date(x).toLocaleDateString()`/`toLocaleString()`, never the raw string |

Filters (following `admin.glaciers.index.tsx`): search by title, tier `<select>` or pill row
(ALL/NORMAL/WATCH/HIGH/CRITICAL), status `<select>` (ALL/active/cleared). **The status filter
must default to ALL** — the DoD says "all alerts *including cleared*".

**Cleared-row visual treatment.** Needs a decision but a small one; recommendation: a neutral
`StatusPill`-style pill plus `text-muted-foreground` / reduced-opacity row. Explicitly:
- **Do not** use `var(--color-critical)` / red for "cleared". Workspace CLAUDE.md: *"Red alert
  severity means CRITICAL and nothing else — never repurpose it."*
- **Do not** strike-through or hide the row. This is an audit view.
- `StatusPill` (`src/components/cryohealth/StatCard.tsx:54-62`) takes `status: string` and has
  a safe `?? STATUS_CLASSES.unknown` fallback, but its `STATUS_CLASSES` map has no
  `active`/`cleared` keys — both would fall through to the neutral `unknown` style
  (`bg-secondary text-foreground`). That is *acceptable but indistinguishable*. Either accept
  the identical neutral pill for both, or render a local inline pill in `admin.alerts.tsx`.
  **Do not add `active`/`cleared` keys to `StatCard.tsx`'s shared map** — that map is
  documented (L40-45) as glacier-stability-specific, and widening it is a shared-component
  change outside #8's blast radius.

### `admin.protocols.tsx`

Model on `admin.districts.tsx` (no filters needed at 2 rows; a search box is optional).

| Column | Source | Notes |
| --- | --- | --- |
| Title | `title` | `font-semibold` |
| Category | `category` | e.g. `IMCI · Respiratory` |
| Disaster | `is_disaster` | badge on true, `—` on false — **see the colour warning below** |
| Source | `source` | long strings; `text-xs text-muted-foreground`, allow wrap |
| Slug | `slug` | `font-mono text-xs` — it is the stable identifier CryoHealth-app keys on |
| Body | `body` | truncate + expand; `whitespace-pre-line` when expanded |
| Created | `created_at` | formatted date |

> **Colour warning — do not copy `chw.tsx:133`.** That line renders the disaster chip as
> `bg-[var(--color-critical)]/10 text-[var(--color-critical)]` — i.e. tier-red for a
> non-tier concept. That is in tension with the workspace rule ("Red means CRITICAL and
> nothing else") *and* with this repo's own documented reasoning at `StatCard.tsx:40-45`,
> where glacier status deliberately avoids tier-red precisely because red is reserved for
> CRITICAL hazard. Use a neutral or `--color-accent-soft` pill in the admin table.
> (Whether `chw.tsx:133` itself should change is out of scope — file it with §8.)

**Protocols is the CHW dosing/diagnosis lookup table.** Both `CLAUDE.md` files and PRD L134
are emphatic: dosing text comes from this table only, never generated. #8 is read-only so the
rule is trivially satisfied — but state it, because #13 adds the editor and PRD L134 requires
a hard warning banner on every edit form there. **#8 must not add that banner** (there is no
form) and must not add any AI-assist affordance.

---

## 8. Two live latent bugs — file them, do not fix them

**B1 — `listOpenAlerts()` has no status filter** (`src/lib/queries.ts:140-149`):

```sql
WHERE tier IN ('high', 'critical')
```

No `AND status = 'active'`. `src/routes/chw.tsx` renders this list under the empty-state copy
*"No active HIGH/CRITICAL alerts."* — so a **cleared** HIGH or CRITICAL alert would be shown to
a CHW as active. Invisible in dev today only because the one seeded cleared alert is `watch`
tier. This is the strongest fresh finding in #8 and it is a genuine (if latent) safety-UX bug.
**Out of scope** — `listOpenAlerts` is only consumed by `chw.tsx`, which #8 does not touch.

**B2 — cleared alerts render identically to active ones on *two* public surfaces.**

- `src/routes/alerts.tsx:102-155` (the public feed) shows every row from `listAllAlerts()`
  with a tier stripe and no cleared indicator. Live today: the Khurdopin `watch`/`cleared`
  alert appears in the public feed as if it were live.
- `src/routes/lakes.$lakeId.tsx:191` (the public lake detail) does the same with
  `listAlertsForLake()` (§3), which also omits `status`. Khurdopin's detail page shows its
  cleared alert as current.

**Out of scope per the brief** ("no changes to the public /alerts page unless truly required").
Note that if GATE picks D1 Option A, the *feed* gains the `status` field and its fix becomes
one line — but `listAlertsForLake()` would still need its own `status` column. **The follow-up
issue must name both call sites**, or someone fixes half of B2 and believes it is closed.

B1 and B2 should go in one follow-up issue. Neither blocks #8.

---

## 9. Deviations / decisions to name at GATE

**D1 (GATE decision) — where `status` + `cleared_at` come from.** This is the only real
decision in #8.

- **Option A — add two columns to `listAllAlerts()`.** Additive; the public `/alerts` page
  ignores unknown fields; one shared function, one commit, no new files, no `routeTree.gen.ts`
  churn.
  *Cost:* `/api/public/alerts` is a **documented Open Data endpoint** (`data.tsx:73` with a
  published example payload at L75-90), so this is an additive public-API change and the
  documented example goes one line stale.
  *Argument in favour beyond convenience:* **whether an alert is cleared is safety
  information** — which is precisely the category the workspace rule says must never be gated
  (*"Open Data endpoints are intentionally unauthenticated — safety info must never be
  gated"*). Publishing `status` is arguably a correction, not a leak. It is also a
  prerequisite for fixing B2.
- **Option B — new `listAllAlertsAdmin()` + a new admin-only endpoint.** Keeps the public
  payload byte-identical.
  *Cost:* a near-duplicate of a 12-line query, a new route file, `routeTree.gen.ts` churn, and
  a fresh auth-posture question (this repo has **zero gated GETs** today — `requireRole` guards
  only `POST /api/public/alerts`). It re-imports exactly the decision #7 had to make, for a
  `size:s` task, to hide two columns that are not sensitive.

**Recommendation: Option A.** Sub-decision to state explicitly: **whether updating
`data.tsx`'s example payload (L75-90) is in the same commit.** Recommendation: yes, same
commit — it is the doc for the thing being changed, and leaving it stale is exactly the kind of
drift a reviewer of that single commit should catch.

**D2 (scope guard, recommend declining) — acknowledgement *names* vs *count*.** The DoD says
"alert acknowledgements shown inline on each alert row as view-only". The plain reading —
a **count** — is fully served by the existing ungated `/api/public/alert-acks` and the existing
`alerts.tsx:85` precedent, with zero new code. Showing *who* acknowledged would require:
(a) a `users` join — `queries.ts` has **no user-read function at all** today, only a `count(*)`
inside `getKpis`; (b) putting CHW names behind an endpoint that is currently **ungated and
undocumented**, i.e. a real privacy escalation; and (c) it overlaps "CHW profiles" /
"Users & roles", separate G3 tasks. There is a **middle option worth naming so GATE picks rather than defaults**: *count plus the
most recent `acknowledged_at`*. `listAlertAcks()` already returns that field, so it costs zero
new data access and zero privacy escalation (no name, no uuid) while being meaningfully more
audit-useful than a bare integer — which matters given PRD §5 frames these as audit surfaces.

**Recommend: count (or count + latest timestamp) in #8; defer names.** If GATE wants names,
that is scope growth *plus* an auth decision and should be re-sized.

**D3 (non-deviation, state it so nobody invents work) — no file-layout deviation.** #6 and #7
each needed a GATE-flagged deviation because the DoD named `admin.X.tsx` while the table
belonged in `admin.X.index.tsx`. **That does not recur here.** `admin.alerts.tsx` and
`admin.protocols.tsx` are flat leaf routes on disk, the DoD names them correctly, and both nav
entries already exist. No sidebar work, no `Outlet` parents, no `.index` files.

**D4 (non-deviation) — no `isTier` guard.** `alerts.tier` is a DB enum (§5). #7's D4 does not
recur. Adding the guard would be dead code.

---

## 10. Draft plan steps

Loop budget **3** (fix loop). Escalation: if a step's verification still fails after 3 fix
attempts, stop and escalate rather than widening scope.

Baseline for every step: `bunx tsc --noEmit && bun run lint`. **That command passes on the
current placeholders**, so on its own it fails rubric item 2. Each step below pairs it with a
check that can fail *today*.

**Rollback for every step:** `git revert <sha>`. Steps 2 and 3 touch one leaf route each and
fall back to `AdminPlaceholder`; nothing imports them. Step 1 is additive to one shared query.

Mechanical no-affordance check (the DoD's "no create/edit/delete yet"):

```bash
grep -nE "<button|onClick|<form|Trash|Pencil|Edit|Delete|useMutation" \
  src/routes/admin.alerts.tsx src/routes/admin.protocols.tsx
```

> There are no Tabs on either page, so unlike #7 there is **no `TabsTrigger` exemption**.
> The only permitted matches are `onClick` handlers belonging to **read-only UI controls**:
> filter pills, a search input's clear button, and a `<details>`-style body expander. Search
> boxes and filter `<select>`s are read-only view state, **not** edit affordances — a build
> agent must not strip them to make this grep clean. `useMutation` must have **zero** matches.

---

### Step 0 — pre-flight (no commit)

Confirm, do not assume:
- **Establish the baseline green state first:** `bunx tsc --noEmit && bun run lint` passes on
  `HEAD` *before any edit*. Every step below pairs that command with a real check precisely
  because it is expected to pass throughout — so a **pre-existing** failure must be identified
  now, not attributed to Step 1 and burned against the fix-loop budget.
- `bun dev` is up; read the origin off the dev-server banner. **Vite's default is
  `http://localhost:5173`** (`vite.config.ts` sets no `server.port`). **`localhost:3000` is
  CryoHealth-api — a different service. Do not curl it.**
- Postgres on `DB_PORT=5433`, seed has run.
- `/admin/alerts` and `/admin/protocols` currently render `AdminPlaceholder` (proves routing +
  the `admin.tsx` role gate work before any change).
- `AdminShell.tsx:35-36` already has both nav entries → **no sidebar work**.
- Re-confirm `CryoHealth-api/src/alerts/alerts.service.ts:167` is still the only `cleared`
  writer (the empty/edge-case copy leans on it).

*Verification:*

```bash
curl -s "$DEV_URL/api/public/alerts"     | jq '.alerts | length'                  # ≥ 3 (4 in this dev DB)
curl -s "$DEV_URL/api/public/alert-acks" | jq '.acks | length'                    # 1
curl -s "$DEV_URL/api/public/protocols"  | jq '.protocols | map(.slug)'           # glof-evacuation-checklist first
```

---

### Step 1 — `listAllAlerts()` returns `status` + `cleared_at`

`src/lib/queries.ts:126-138`: add `a.status::text AS status, a."clearedAt" AS cleared_at` to
the SELECT. **`::text` on the enum, double quotes on `"clearedAt"`.** Nothing else changes —
no `WHERE`, no `ORDER BY` change. Per D1, update `src/routes/data.tsx`'s example payload
(L75-90) in the same commit if GATE approves Option A.

*Blast radius:* shared. `listAllAlerts()` backs the **public** `/alerts` page and the
**documented Open Data** `GET /api/public/alerts`. Kept in its own commit for exactly that
reason.

*Verification:* `bunx tsc --noEmit && bun run lint`, plus a check that **fails today** (both
keys are currently absent from the response):

```bash
curl -s "$DEV_URL/api/public/alerts" | jq '.alerts[] | {title, status, cleared_at}'
# → exactly one row with status "cleared" and a non-null cleared_at (Khurdopin drainage slowing)
# → the rest "active" with cleared_at null
```

Load-bearing assertion: **HTTP 200, both keys present, never a 500.** A 500 means the enum cast
was written as `upper(a.status)` (§5). Then reload the public `/alerts` page and confirm it is
visually unchanged — extra JSON fields must not break it.

---

### Step 2 — `admin.alerts.tsx`: real table

Replace the placeholder. Two `useQuery`s (`["admin-alerts"] → /api/public/alerts`,
`["admin-alert-acks"] → /api/public/alert-acks`), plain `fetch` with
`if (!res.ok) throw new Error(...)`. `ackCount` per `alerts.tsx:85` — **copy the `ackCount` filter expression only, not
`alerts.tsx:55-63`'s query options.** That query carries `enabled: !!user` and
`queryKey: ["alert-acks", user?.id, isAdmin]`, which would drag `useAuth` into this page for no
reason: `admin.tsx:29-55` already gates the entire `/admin` subtree. Search + tier filter +
status filter (default ALL). Combined `isError` amber banner. shadcn `Table` with the house
overrides from `admin.glaciers.index.tsx`. `max-w-7xl`. Columns and cleared-row treatment per
§7. `TierBadge` bare, no `solid`, no cast, no `isTier`. Format `created_at`/`cleared_at` as
dates (#7 fix-loop `0682013`). `lake_name`/`district_name` → `?? "—"`.

*Verification:* `bunx tsc --noEmit && bun run lint`, plus manual at `/admin/alerts`:
- ≥ 4 rows; one **cleared** (Khurdopin drainage slowing, WATCH) visibly distinguished, and
  **still present with the status filter on ALL** — this is the DoD's "including cleared".
- Tier badges: CRITICAL (Shishper), HIGH (Meltwater surge), WATCH (Khurdopin), NORMAL
  (test smoke check).
- Ack column: `1` on *Meltwater surge in Hassanabad*, `0` on the others.
- `test smoke check` renders `—` for both lake and district (null-safety proof).
- Dates render as dates, not raw ISO strings. No console errors.
- Setting the status filter to `cleared` leaves exactly one row; `active` leaves the rest.
- The no-affordance grep above returns no `useMutation`, `<form>`, or edit/delete matches.

---

### Step 3 — `admin.protocols.tsx`: real table

Replace the placeholder. One `useQuery` (`["admin-protocols"] → /api/public/protocols`).
Structure copied from `admin.districts.tsx`. Columns per §7. `body` truncated with an expander
and `whitespace-pre-line`. Disaster badge in a **neutral/accent** pill, **not** tier-red
(§7 warning). Preserve the `is_disaster DESC` server order — do not re-sort client-side.

*Verification:* `bunx tsc --noEmit && bun run lint`, plus manual at `/admin/protocols`:
- 2 rows; `glof-evacuation-checklist` **first** (proves `is_disaster DESC` survived).
- The IMCI body shows its 4 `STEP N ·` lines on separate lines when expanded, and does not blow
  out the table width when collapsed.
- The disaster badge is **not** `var(--color-critical)` — grep the file for `color-critical`,
  expect zero matches.
- The no-affordance grep returns nothing beyond the body expander's `onClick`/`<details>`.

---

### Step 4 — `graphify update .` + close-out

`graphify update .` (AST-only, no API cost) so the graph reflects two real page bodies.

*Verification:* `graphify query "admin alerts acknowledgements table"` returns
`admin.alerts.tsx` with a real component node (today it resolves only to `AdminPlaceholder`).

**No cleanup step and no removal step** — nothing is superseded. The public `/alerts` page and
`chw.tsx` both stay.

---

## 11. Explicitly NOT in scope

- **No create/edit/delete on any of the three domains.** Alerts CRUD is #12; Protocols CRUD is
  #13. Alert acknowledgements are **view-only permanently** (PRD L133: *"Derived from CHW
  action, not admin-authored"*), so #8's read-only ack display is the **final** state, not a
  placeholder.
- **No `src/lib/admin-schemas.ts` changes.**
- **No new `src/routes/api/admin/` directory**, no new endpoints, no PUT/DELETE anywhere.
- **No auth changes.** All three GETs already exist ungated; #8 adds no gate and removes none.
  If D2 (ack names) were accepted this would change — another reason to decline it.
- **No changes to `src/routes/alerts.tsx`** (public feed / broadcast form), **`chw.tsx`**,
  **`admin.index.tsx`**, or **`open-alerts.ts`**. The only shared file touched is
  `queries.ts` (Step 1), plus `data.tsx`'s example payload if GATE approves D1 Option A.
- **No fixes for B1 or B2** (§8) — file a follow-up issue.
- **No widening of `StatCard.tsx`'s `STATUS_CLASSES`** with `active`/`cleared` keys (§7).
- **No `chips`/`checklist` in any SELECT** — jsonb, not needed, React-child hazard.
- **No migrations, no schema changes, no `synchronize`.** CryoHealth-api owns the schema.
- **No seeding and no cleanup of the `test smoke check` alert.**
- **No `loader:` introduction** — the repo has zero; stay on `useQuery`.
- **No `isTier` guard** and no fallback branch added to `tier.tsx`.
- **No AI-assist / "improve wording" affordance on protocols, ever** (PRD L134, both
  `CLAUDE.md`s). Trivially satisfied by read-only, but it is the domain rule this task's
  subject matter exists to protect.

---

## Risks / assumptions that change the plan if wrong

1. **D1 Option A changes a documented public Open Data payload.** If GATE decides the public
   `/api/public/alerts` response must stay byte-identical, Step 1 becomes Option B (new query +
   new endpoint) and Step 2's fetch target changes — plus a fresh auth-posture decision, since
   this repo has **zero gated GETs** today. Decide at GATE, before Step 1.
2. **`alerts.tier` and `alerts.status` are both DB enums; `upper()` on them without `::text`
   throws at parse time.** Verified live (`ERROR: function upper(tier) does not exist`).
   `listAllAlerts` already gets `tier` right; the new `status` column is where the mistake
   would land. Assert the SQL form at review, not just by a 200 response.
3. **Live dev DB has 4 alerts, not the seed's 3** — a stray `test smoke check` row with NULL
   lake *and* NULL district. Any verification asserting an exact count will fail spuriously;
   assert titles and the cleared count instead. That row is also the best null-safety test
   available, so do not delete it.
4. **`lake_name` / `district_name` are `LEFT JOIN` results and are NULL in live data.** Typing
   them as `string` (not `string | null`) will pass `tsc` — the values come from an untyped
   `res.json()` — and then render "null" or throw on `.toLowerCase()` in a search filter. Type
   them `| null` and guard.
5. **The ack count is derived client-side from the *entire* `alert_acknowledgements` table.**
   Fine at 1 row and consistent with the `alerts.tsx` precedent, but it is an unbounded
   unfiltered `SELECT *` (`queries.ts:185` — no `LIMIT`, no `WHERE`). Note it; do not optimize
   in #8. If it ever needs bounding, that is a shared-query change affecting the public page.
6. **`chw_id` is exposed as a bare uuid by an ungated, undocumented endpoint today.** #8 does
   not make this worse (it displays a count, not the uuids), but accepting D2 would. Flag as a
   privacy consideration in the follow-up issue.
7. **`protocols.body` is long multi-line text (454 chars for the IMCI protocol).** A naive
   `TableCell` renders it as one unreadable line and breaks the table layout. This is a
   guaranteed-visible defect, not a latent one.
8. **The "cleared" visual treatment must not use tier-red** (workspace CLAUDE.md: red means
   CRITICAL and nothing else). Same trap as `chw.tsx:133`'s disaster chip. A reviewer should
   grep the two new files for `color-critical` and expect zero matches.
9. **Do not curl `localhost:3000`** — that is CryoHealth-api, a different service. This
   dashboard is `bun dev` → Vite, default `:5173`. Read the origin off the dev-server banner.
10. **Blast radius:** `src/lib/queries.ts` (one SELECT, two added columns),
    `src/routes/admin.alerts.tsx`, `src/routes/admin.protocols.tsx`, and — only if GATE
    approves D1 Option A — the example payload in `src/routes/data.tsx`. **No new files**, so
    **no `routeTree.gen.ts` regeneration**, unlike #7. No migrations, no user data written,
    no auth code changed.

---

## Key file paths

- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.alerts.tsx` (9-line placeholder)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.protocols.tsx` (9-line placeholder)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.districts.tsx` (flat-page precedent)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.glaciers.index.tsx` (search/filter/error-banner precedent)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/alerts.tsx` (ack-count precedent L55-63, L85; latent bug B2)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/chw.tsx` (protocol render precedent; **L133 disaster-chip colour is the anti-precedent**)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.tsx` (role gate + AdminShell — do not duplicate per page)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/data.tsx` (Open Data catalogue; alerts example L73-90, protocols L118-120)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/api/public/alerts.ts`
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/api/public/alert-acks.ts`
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/api/public/protocols.ts`
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/queries.ts` (`listAlertsForLake` L115-124 **bug B2**, `listAllAlerts` L126-138, `listOpenAlerts` L140-149 **bug B1**, `insertAlert` L151-167, `listProtocols` L178-181, `listAlertAcks` L183-186, `insertAlertAck` L188-195)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/api/public/lakes.$lakeId.ts:11` (second B2 call site, via `listAlertsForLake`)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/lakes.$lakeId.tsx:191` (renders it)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/tier.tsx` (`TierBadge` L78; `solid` doc L72-77)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/auth-guard.ts`
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/components/cryohealth/AdminShell.tsx:31-38` (nav — already wired)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/components/cryohealth/StatCard.tsx:40-62` (`StatusPill` + the documented "red is reserved" reasoning)
- `/Users/m5/Projects/uexel/cryo/cryohealth/docs/admin-portal-prd.md` (nav L59-62, CRUD matrix L132-134, no-fabrication L209)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.lakes.$lakeId.tsx:25-28` (`isTier` — **do not copy**)
- `/Users/m5/Projects/uexel/cryo/CryoHealth-api/src/database/migrations/1785608131024-InitialSchema.ts:17,38,41` (`tier` enum, `alert_status` enum, `alerts` DDL)
- `/Users/m5/Projects/uexel/cryo/CryoHealth-api/src/database/migrations/1785700000000-WebSchema.ts:44-60` (alerts ALTERs), `:70-81` (`protocols`), `:171-179` (`alert_acknowledgements`)
- `/Users/m5/Projects/uexel/cryo/CryoHealth-api/src/database/migrations/1786204276808-AlertChipsAndChecklist.ts:14-17` (`chips`/`checklist` jsonb)
- `/Users/m5/Projects/uexel/cryo/CryoHealth-api/src/alerts/alerts.service.ts:167` (only `status='cleared'` writer)
- `/Users/m5/Projects/uexel/cryo/CryoHealth-api/scripts/seed-dev-data.ts:101-129` (protocols), `:225-305` (alerts + the one ack)
