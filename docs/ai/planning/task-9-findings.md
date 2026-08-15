# Task #9 findings — read-only admin views: Facilities, CHW profiles, Cases

## Headline

**#9 is the most expensive of the four read-only tasks, and the only one with a real privacy
decision in it.** #8 needed zero new queries and zero new endpoints. #9 needs **three new query
functions and two new endpoints**, and one of those endpoints publishes patient-adjacent
clinical records — in a repo where *every single GET is currently ungated*.

| Need | State today |
| --- | --- |
| Facilities list | `listFacilities()` + `GET /api/public/facilities` exist — **but the query filters `WHERE geom IS NOT NULL` and the only seeded facility has NULL geom, so it returns `[]`.** New admin query + endpoint required. |
| CHW profiles | **Nothing.** No query, no endpoint. The `chw_profiles` table has **0 rows and zero references anywhere in the entire workspace** except the migration that creates it and the one that drops it. |
| Cases | `insertCase()` + `POST /api/public/cases` exist (write path only). **No list query, no GET.** New query + new *gated* endpoint required. |

Five findings materially shape the task:

1. **The facilities endpoint returns an empty array today.** `listFacilities()` (`queries.ts:170-177`)
   ends `WHERE geom IS NOT NULL`; live `facilities` has exactly 1 row with `geom IS NULL`.
   Reusing the existing endpoint ships an admin page that renders "No facilities" against a
   non-empty table. The filter is load-bearing (`lakes.tsx:103` → `HazardMap` needs lat/lng) and
   documented (`data.tsx:109`: *"Health facilities **with a mapped location**"*), so it must not
   be removed — a separate `listFacilitiesAdmin()` is forced, not a judgment call. See §3/§6/§8.
2. **`GET /api/public/cases` does not exist, and creating it ungated would be a real privacy
   escalation.** `cases` holds `patient_age`, `patient_sex`, `symptoms`, `diagnosis`,
   `treatment`, `outcome`. This is **the headline GATE item** (§9 D1) — a build agent following
   the repo's existing pattern would default to ungated, which does actual harm.
3. **`chw_profiles` is a schema-ahead-of-implementation table with no writer anywhere.**
   Stronger than #7's `lake_risk_scores` finding: `grep -rn "chw_profiles"` across all four repos
   returns only `WebSchema.ts:133` (create) and `:203` (drop). 0 rows live. GATE item §9 D2.
4. **The `is_disaster_related` colour question is *not* open — precedent settles it.**
   `admin.protocols.tsx:101` (shipped in #8, this same goal) already renders the identical
   `is_disaster` concept as `bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]`.
   Match it exactly. Stated interpretation, not a GATE decision. See §5.
5. **`facilities.district` is a bare `character varying`, not a `district_id` FK.** Unlike every
   WebSchema table. It cannot join to `districts`. Render the string. See §2.

Two traps and one latent inconsistency found (§8).

---

## 1. Exact current state of the three route files

All three exist. All three are flat 9-line placeholders. **There is no route triple and there
must not be one.**

| File | Lines | State |
| --- | --- | --- |
| `src/routes/admin.facilities.tsx` | 9 | `AdminPlaceholder title="Facilities"`, route id `"/admin/facilities"`, `head` with `noindex` already set. |
| `src/routes/admin.chw-profiles.tsx` | 9 | `AdminPlaceholder title="CHW profiles"`, route id `"/admin/chw-profiles"`, `noindex` set. |
| `src/routes/admin.cases.tsx` | 9 | `AdminPlaceholder title="Cases"`, route id `"/admin/cases"`, `noindex` set. |

No `.index` / `.$id` siblings for any of the three — confirmed by `ls src/routes/`. The DoD's
naming (`admin.facilities.tsx`, `admin.chw-profiles.tsx`, `admin.cases.tsx`) is **literally
correct** and matches what is on disk.

> **Negative constraint for the build agent:** do **not** convert any of these into an `Outlet`
> parent. Unlike `admin.lakes.tsx` / `admin.glaciers.tsx`, these are leaf routes. Adding
> `component: () => <Outlet />` would blank the page. There are no detail views in #9.

**Sidebar: no work needed.** `src/components/cryohealth/AdminShell.tsx:39-47` already has the
"Health workforce" group with all three entries, in this order:

```
{ to: "/admin/chw-profiles", label: "CHW profiles", exact: false },
{ to: "/admin/cases",        label: "Cases",        exact: false },
{ to: "/admin/facilities",   label: "Facilities",   exact: false },
```

`adminOnly: false` on that group → **`facility_admin` sees all three**, including Cases. That is
relevant to the D1 gate decision: whatever role check goes on the cases endpoint should admit
both admin roles, or the nav lies to `facility_admin`.

**Shell + role gate: no work needed.** `src/routes/admin.tsx` renders
`<AdminShell><Outlet/></AdminShell>` behind an `isAdmin` check. Every `admin.*` child inherits
it. **Do not add a per-page role check in the component.** (Client-side route gating is *not*
the same as gating the endpoint — see §9 D1.)

**`DemoBanner` is global** (`src/routes/__root.tsx:151`) and already reads, in EN and UR:
*"Hazard data on this site is live. **Case and health records shown are sample data.** CryoHealth
is in field testing and not yet approved for clinical use."* (`src/lib/i18n.tsx:18`, `:34`).
So the "these are demo patients" disclosure already exists on `/admin/cases` for free. **Do not
add a second banner** and do not duplicate that copy in the page header.

**Precedent to model on, file-for-file:**

- Simple flat table, no filters → `src/routes/admin.districts.tsx` (89 lines). Shape:
  `main.mx-auto.max-w-5xl.px-4.py-6`, `<header>` with `h1` + count subtitle, `isError` amber
  banner styled with `var(--color-watch)` / `var(--color-watch-soft)` / `var(--color-on-watch)`,
  a `div.rounded-xl.border.border-border.bg-card` wrapping the shadcn `Table`, header
  `TableRow className="border-border bg-secondary/50 hover:bg-secondary/50"`,
  `TableHead className="text-xs uppercase text-muted-foreground"`,
  `TableBody className="divide-y divide-border"`, explicit loading row and empty row with
  `colSpan`. **Right template for `admin.facilities.tsx` and `admin.chw-profiles.tsx`.**
- Table + badge column + `<details>` expander → `src/routes/admin.protocols.tsx` (130 lines,
  shipped in #8). **Right template for `admin.cases.tsx`** — it is the closest structural match
  (badge column + long free-text column) and its disaster badge is the exact markup to reuse.
- Filter bar → `src/routes/admin.alerts.tsx:101-132` (search input + pill-row `<button>` filters
  inside `div.flex.flex-wrap.items-center.gap-2.border-b.border-border.p-3`, above the `Table`).
  Only needed for cases **if** the row count justifies it — at 4 live rows it does not (§6).

No `loader:` anywhere in `src/routes/` — data fetching is uniformly `useQuery` + `fetch`.
Do not introduce loaders.

---

## 2. Exact schemas (read from CryoHealth-api migrations, verified live against Postgres :5433)

**No postgres.js `transform` is configured** (`src/lib/db.ts`) — column names arrive exactly as
the SQL emits them, which is why `queries.ts` hand-aliases `"createdAt" AS created_at`.

### `facilities` — `1785608131024-InitialSchema.ts:29`, extended twice

Verified live with `\d facilities`:

```
id            uuid                     NOT NULL DEFAULT uuid_generate_v4()  PK
name          character varying        NOT NULL
type          character varying        NOT NULL DEFAULT 'bhu'
district      character varying        NOT NULL          -- ⚠ plain varchar, NOT a FK
geom          geometry(Point,4326)     NULL
contact       character varying        NULL
"createdAt"   timestamptz              NOT NULL DEFAULT now()
"lakeId"      uuid                     NULL  → FK lakes(id)     -- added 1785659144273
vulnerability text                     NOT NULL DEFAULT 'low'  -- added 1785700000000-WebSchema.ts:65
-- Referenced by: users."facilityId" → facilities(id)
```

Three things to notice:

- **`district` is a `character varying`, not `district_id uuid`.** Live value is the literal
  string `'Hunza'`. It happens to match `districts.name`, but there is **no FK, no index, and no
  guarantee**. Render the string directly. **Do not write a join to `districts`**, and do not
  "fix" this — schema changes belong in CryoHealth-api.
- **Mixed casing:** `"createdAt"` and `"lakeId"` are camelCase (need double quotes in SQL);
  everything else is lowercase. Same trap as `alerts`.
- `type` and `vulnerability` are **free text**, not enums — `'bhu'` and `'high'` live. `upper()`
  on them is safe (no enum-cast trap here), but there is no DB-level constraint, so do **not**
  type them as a narrow union in TypeScript without a fallback.

### `chw_profiles` — `1785700000000-WebSchema.ts:132-143`

```
"id"          uuid        NOT NULL DEFAULT uuid_generate_v4()  PK
"user_id"     uuid        NULL  → FK users(id)     ON DELETE CASCADE
"full_name"   text        NOT NULL DEFAULT 'Community Health Worker'
"district_id" uuid        NULL  → FK districts(id) ON DELETE SET NULL
"phone"       text        NULL
"language"    text        NOT NULL DEFAULT 'ur'
"created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
```

All snake_case, no quoting needed. `user_id` and `district_id` are both **nullable FKs** → any
join is a `LEFT JOIN` and both joined names are `| null`. **0 rows live.** See §6 and §9 D2.

### `cases` — `1785700000000-WebSchema.ts:146-167`

```
"id"                  uuid        NOT NULL DEFAULT uuid_generate_v4()  PK
"chw_id"              uuid        NOT NULL  → FK users(id)     ON DELETE RESTRICT
"district_id"         uuid        NULL      → FK districts(id) ON DELETE SET NULL
"patient_age"         integer     NULL
"patient_sex"         text        NULL
"symptoms"            text        NOT NULL
"diagnosis"           text        NULL
"treatment"           text        NULL
"outcome"             text        NULL
"is_disaster_related" boolean     NOT NULL DEFAULT false
"created_at"          TIMESTAMPTZ NOT NULL DEFAULT now()
-- INDEX idx_cases_chw      ("chw_id",      "created_at" DESC)
-- INDEX idx_cases_district ("district_id", "created_at" DESC)
```

- **No `deleted_at`.** PRD §10 open question 2 flags that a soft-delete migration is needed
  before *Cases CRUD* ships. **#9 is read-only, so that migration is not a #9 dependency** — say
  so explicitly so nobody blocks on it, and do not add a "deleted" column/filter.
- **Six of eleven columns are nullable** — `diagnosis`, `treatment`, `outcome` are NULL on live
  rows. Type them `| null` and render `—`.
- `is_disaster_related` is a real `boolean` → a real JS boolean, no `Number()`/string coercion.
- `patient_age` is `integer`, not `numeric` → a real JS number. **No numeric-as-string trap in
  #9** (contrast #6/#7). Grep confirms: zero `numeric` columns across all three tables.
- Both indexes are `(fk, created_at DESC)` → `ORDER BY created_at DESC` is the index-aligned
  default sort.

### `users` — `1785608131024-InitialSchema.ts:35` (only relevant via joins)

```
"id"           uuid              NOT NULL DEFAULT uuid_generate_v4()  PK
"role"         "public"."role"   NOT NULL            -- ENUM
"name"         character varying NOT NULL
"phone"        character varying NULL  UNIQUE
"lhwId"        character varying NULL  UNIQUE
"passwordHash" character varying NOT NULL            -- ⚠ NEVER SELECT
"facilityId"   uuid              NULL  → FK facilities(id)
"active"       boolean           NOT NULL DEFAULT true
"createdAt"    timestamptz       NOT NULL DEFAULT now()
```

> **Hard rule for every step in #9: `passwordHash` must never appear in any SELECT, any row
> type, any JSON response, regardless of which option wins D2.** `SELECT u.*` is banned in this
> task. Enumerate columns. (`getKpis()` at `queries.ts:216-228` is the only current `users`
> access and it is a bare `count(*)` — there is **no user-read function in `queries.ts` today**,
> so #9 would be introducing the first one.)

`role` is a **DB enum** (`public.role`) → `upper(role)` throws at parse time
(`ERROR: function upper(role) does not exist`); use `role::text` if any text function is applied.
Filtering with `WHERE role = 'chw'` is fine and is what `getKpis()` already does.

---

## 3. Existing data access — exactly what exists and what is missing

### `listFacilities()` — `src/lib/queries.ts:170-177` — **exists but is wrong for this page**

```sql
SELECT id, name, ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lng, type, vulnerability
FROM facilities
WHERE geom IS NOT NULL
```

Consumers: `GET /api/public/facilities` → `src/routes/lakes.tsx:41-46` → `HazardMap`
(`lakes.tsx:103`), and it is a **documented Open Data endpoint** (`data.tsx:108-110`, description
literally *"Health facilities **with a mapped location**"*).

**Returns `[]` today** — 1 facility row, `geom IS NULL`. It also omits `district`, `contact`,
`lakeId` and `createdAt`, all of which an admin roster wants.

> **Forced conclusion, not a judgment call: add `listFacilitiesAdmin()`; do not touch
> `listFacilities()`.** Removing the `WHERE` would feed NULL lat/lng markers to Leaflet and
> contradict the published Open Data description. Widening the SELECT would change a documented
> public payload for no public benefit.

Proposed new function (no geom filter, geom presence exposed as a boolean rather than as
coordinates so the admin table can show *why* a facility is missing from the map):

```sql
SELECT id, name, type, district, vulnerability, contact,
       ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lng,
       (geom IS NOT NULL) AS has_geom,
       "lakeId" AS lake_id, "createdAt" AS created_at
FROM facilities
ORDER BY name
```

`ST_Y`/`ST_X` on a NULL geom return NULL and **do not throw** — verified live:
`select ST_Y(geom::geometry) as lat, (geom is not null) as has_geom from facilities;` → `NULL | f`.
Type `lat`/`lng` as `number | null`.

### `listDisasterCasesForDistrict(districtId)` — `src/lib/queries.ts:45-54` — **exists, unusable for #9**

```sql
SELECT id, symptoms, diagnosis, outcome, is_disaster_related, created_at
FROM cases
WHERE district_id = ${districtId} AND is_disaster_related = true
ORDER BY created_at DESC
LIMIT 10
```

Doubly scoped — one district **and** disaster-only — and it drops `chw_id`, `patient_age`,
`patient_sex`, `treatment`. It cannot back an admin cases table. **Do not modify it** (it backs
an existing consumer); add a new `listCasesAdmin(limit = 200)`.

Proposed new function:

```sql
SELECT c.id, c.chw_id, c.district_id, c.patient_age, c.patient_sex,
       c.symptoms, c.diagnosis, c.treatment, c.outcome,
       c.is_disaster_related, c.created_at,
       u.name AS chw_name, u."lhwId" AS chw_lhw_id,   -- see D1b before including chw_name
       d.name AS district_name
FROM cases c
LEFT JOIN users u     ON u.id = c.chw_id
LEFT JOIN districts d ON d.id = c.district_id
ORDER BY c.created_at DESC
LIMIT ${limit}
```

`chw_id` is `NOT NULL` with `ON DELETE RESTRICT`, so `u` can never actually be missing — a plain
`JOIN` would be equally correct; `LEFT JOIN` is the defensive/house style. `district_id` is
nullable → `district_name` is genuinely `| null`. **`u."lhwId"` needs double quotes.**
**`passwordHash` is not in this SELECT and must not be added.**

### CHW profiles — **nothing exists.** No query, no endpoint, no type, no reference.

`chwProfileSchema` in `src/lib/admin-schemas.ts:33` is an empty `.strict()` stub for the future
CRUD task; **#9 must not fill it in** (out of scope per the brief).

If D2 resolves to "read `chw_profiles`", the query is:

```sql
SELECT p.id, p.user_id, p.full_name, p.district_id, p.phone, p.language, p.created_at,
       d.name AS district_name, u.name AS user_name, u."lhwId" AS user_lhw_id, u.active
FROM chw_profiles p
LEFT JOIN districts d ON d.id = p.district_id
LEFT JOIN users u     ON u.id = p.user_id
ORDER BY p.full_name
```

Both joins are on nullable FKs → all four joined columns are `| null`. **This returns 0 rows
today** and will until something writes the table.

### Functions #9 must not touch

`insertCase()` (`queries.ts:198-214`) is the write path — do not call it, do not extend it.
`getKpis()` (`:216-228`) already counts `cases` (7-day) and active CHWs; `admin.index.tsx`
consumes it. #9 does not change it.

---

## 4. Existing API routes — one usable, one wrong-shaped, one missing

| Route file | Handlers today | Auth today |
| --- | --- | --- |
| `src/routes/api/public/facilities.ts` | `GET` → `{ facilities }` from `listFacilities()` | **ungated** |
| `src/routes/api/public/cases.ts` | **`POST` only** → `insertCase(... chwId: claims.sub)` | `requireAuth` (no role check) |
| chw-profiles | **does not exist** | — |

`src/routes/api/public/cases.ts` is worth reading in full before writing the GET: it is the
`requireAuth` + `AuthError` pattern this repo uses (`try { claims = await requireAuth(request) }
catch (e) { if (e instanceof AuthError) return e.response; throw e }`), and it takes `chwId` from
the token, never from the body.

**Auth posture across the whole repo, verified:** *every* GET handler is ungated, including
`/api/public/lakes-admin`. The only guarded handlers are `POST /api/public/alerts`
(`requireAuth` then `requireRole(claims, ["cryohealth_admin","facility_admin"])`) and `POST /api/public/cases`
(`requireAuth`). **There is no `src/routes/api/admin/` directory yet** — PRD §7/§10 anticipates
one, but nothing has created it. So a gated GET for cases would be the **first gated GET in the
repo**, which is precisely why it is a GATE item and not a default (§9 D1).

**Which endpoints are documented Open Data** (`src/routes/data.tsx`): `/api/public/facilities`
**is** (L108-110, with a published example payload). `/api/public/cases` is **not** listed
(only its POST exists). Any new endpoint added by #9 should **not** be added to `data.tsx` —
these are admin surfaces, and the cases one is explicitly not public data.

---

## 5. `is_disaster_related` flagging — settled interpretation, not an open question

The DoD reads: *"Cases table flags `is_disaster_related` rows visibly, reusing the existing
tier/critical color convention, **not a new ad hoc red**."*

**Interpretation (stated, with citations; GATE can override in one line):**
"Reusing the existing colour convention" means **use the design-system token machinery**, not a
hand-mixed colour. "Not a new ad hoc red" is the same instruction in its prohibitive form: no
`bg-red-100`, no raw hex, no `text-red-600`. It does **not** mean "paint the row CRITICAL red."

Three citations settle it:

1. **`src/routes/admin.protocols.tsx:101` — shipped in #8, same goal, same portal — already
   renders the identical concept.** `protocols.is_disaster` → a "Disaster" badge:
   ```
   className="inline-flex w-fit rounded bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-accent-ink)]"
   ```
   **Match this exactly** — same classes, same "Disaster" label text. Two admin pages rendering
   the same disaster concept in two different colours is a worse outcome than either colour alone.
2. **`src/styles.css:14`** (design-system header comment): *"Red (`--color-critical`) means
   CRITICAL and nothing else — never a form error, never a delete action, never a brand accent."*
   Reinforced by workspace `CLAUDE.md` (*"'Red' alert severity means CRITICAL and nothing else in
   the app UI — never repurpose it"*). A disaster-related **case** is not a hazard **tier**.
3. **`src/lib/tier.tsx:72-77`**: *"Colour is never the only signal for a hazard tier."*
   → "visibly" is **not** satisfied by colour alone. The accent pill carries the literal word
   "Disaster", which satisfies it. **Do not** reduce it to a coloured dot or a bare row tint.

**Anti-precedent, do not copy:** `src/routes/chw.tsx:133` renders the protocol disaster chip as
`bg-[var(--color-critical)]/10 text-[var(--color-critical)]` with a
`border-[var(--color-critical)]/30` card border (`:131`). That is tier-red for a non-tier concept
and #8 already flagged it as the thing not to imitate. It remains unfixed; #9 does not fix it
(§8 B3).

**Concrete recommendation for the cases table:** a `Disaster` column rendering the
`admin.protocols.tsx:101` pill on `true` and `—` on `false`. Optionally *also* a subtle row
emphasis (`bg-[var(--color-accent-soft)]/30` on the `TableRow`) — but the badge alone satisfies
"visibly", and the row tint is the part most likely to be argued about. Recommend badge-only.

**Reviewer check:** `grep -n "color-critical\|bg-red\|text-red" src/routes/admin.cases.tsx`
→ expect **zero** matches.

---

## 6. Live seeded state (verified against Postgres :5433, not inferred)

**`facilities` — 1 row, `geom IS NULL`:**

| name | type | district | vulnerability | contact | geom | lakeId | createdAt |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Hassanabad BHU | `bhu` | `Hunza` (string) | `high` | NULL | **NULL** | NULL | 2026-08-09 |

`SELECT count(*) total, count(geom) with_geom FROM facilities` → `1 | 0`.
So **`GET /api/public/facilities` returns `{"facilities":[]}` right now.** This is deliberate and
documented, not a bug: `CryoHealth-api/scripts/seed-dev-data.ts:31-33` says *"No cited coordinate
for this seed, so `geom` is left NULL — it will not appear on the hazard-map facility layer
(`listFacilities` filters `WHERE geom IS NOT NULL`) until a real surveyed point is added."*
That is the workspace's no-fabricated-coordinates rule working as intended. **#9 must not seed a
coordinate to make the map look better.** The admin table is the correct place to make this
visible — a "Mapped" / `has_geom` column that reads "No location" is *honest product surface*,
arguably the single most useful thing this page does.

**`chw_profiles` — 0 rows.** And zero code references workspace-wide:

```
$ grep -rn "chw_profiles" --include="*.ts" --include="*.tsx" --include="*.py" (all four repos)
CryoHealth-api/src/database/migrations/1785700000000-WebSchema.ts:133   CREATE TABLE
CryoHealth-api/src/database/migrations/1785700000000-WebSchema.ts:203   DROP TABLE
```

No entity, no service, no seed, no reader, no writer, in any repo. This is a stronger version of
#7's `lake_risk_scores` provenance finding. See §9 D2.

**`users` — 3 rows** (the CHW roster is exactly one person):

| name | role | lhwId | phone | facilityId | active |
| --- | --- | --- | --- | --- | --- |
| Amina Baig | `chw` | `chw-001` | NULL | NULL | true |
| Cryo Admin | `cryohealth_admin` | `admin-001` | NULL | NULL | true |
| Facility Admin | `facility_admin` | `facility-001` | NULL | NULL | true |

Note `phone` and `facilityId` are NULL on every row — so even the `users`-backed variant of the
CHW page would render mostly `—`.

**`cases` — 4 rows, all by Amina Baig, all in Hunza, exactly one disaster-related:**

| age | sex | symptoms | diagnosis | treatment | outcome | disaster |
| --- | --- | --- | --- | --- | --- | --- |
| 45 | F | Minor lacerations during evacuation from Hassanabad nala | Superficial wound | Cleaned and dressed | Discharged | **true** |
| 5 | M | Fever 3 days | **NULL** | **NULL** | Referred | false |
| 34 | F | Watery diarrhoea, 3 days | **NULL** | ORS, continued feeding | Improving, follow-up in 2 days | false |
| 2 | M | Child breathing fast, age 2 years | Fast breathing — pneumonia (IMCI classification) | Amoxicillin per IMCI dose row; continue feeding and fluids | Referred to Hassanabad BHU for follow-up | false |

Consequences for the build:
- **Exactly one disaster row** — perfect for verifying the badge renders on `true` and `—` on
  `false`, in one screenshot.
- **NULL `diagnosis` on two rows, NULL `treatment` on one** — guaranteed-visible null handling.
  Render `—`, do not render "null".
- All four share one `chw_id` and one `district_id` → the CHW/district columns prove the joins
  work but cannot prove they *discriminate*. Do not write a verification that depends on two
  distinct CHWs.
- **4 rows does not justify a filter bar.** Recommend no search/filter on `admin.cases.tsx`
  (contrast the brief's guess); a `Disaster` badge column plus `ORDER BY created_at DESC` is
  enough. If GATE wants a disaster-only toggle it is cheap to add, but it is not DoD.
- Provenance is honest: `seed-dev-data.ts:35-37` — *"cases: synthetic demo patient records.
  Explicitly the safe kind of fake — the dashboard already banners 'Case and health records shown
  are sample data', and no real patient is represented."*

**Writers, per table (for honest empty-state copy):**

| Table | Writer(s) |
| --- | --- |
| `facilities` | `CryoHealth-api/scripts/seed-dev-data.ts:199-211` (upsert by name) only. No runtime writer in any repo. |
| `cases` | this repo's `insertCase()` via `POST /api/public/cases` (the CHW workspace at `src/routes/chw.tsx`), plus the seed script `:358` |
| `chw_profiles` | **nothing, anywhere** |

---

## 7. What each page should show

### `admin.facilities.tsx` — model on `admin.districts.tsx`

| Column | Source | Notes |
| --- | --- | --- |
| Name | `name` | `font-semibold text-foreground` |
| Type | `type` | free text (`bhu`); `text-muted-foreground`, consider `uppercase` |
| District | `district` | **the varchar, not a join** (§2) |
| Vulnerability | `vulnerability` | free text (`high`/`low`). **Do not use `TierBadge`** — this is not a hazard tier and `'high'` here is a facility exposure rating, not `HIGH` tier. A neutral `bg-secondary` pill or plain text. |
| Mapped | `has_geom` | `Yes` / **`No location`** — the honest surfacing of the NULL-geom fact (§6) |
| Lat / Lng | `lat`, `lng` | `| null` → `—`; optional, `font-mono text-xs` |
| Contact | `contact ?? "—"` | mild PII (a phone number); NULL today |
| Added | `created_at` | **format it** — `new Date(x).toLocaleDateString()`, never the raw ISO string (#7's fix-loop commit `0682013` was exactly this bug) |

Header subtitle should state the count **and** the unmapped count, e.g.
`1 facility · 1 with no mapped location (hidden from the hazard map)`.

### `admin.chw-profiles.tsx` — depends on D2 (§9)

If **D2-A (recommended)**, read `chw_profiles`: columns `full_name`, `district_name`, `phone`,
`language`, linked `user_name` / `user_lhw_id` / `active`, `created_at` — and the page will
render its **empty state**, which is then the most important string on the page:

> *No CHW profiles yet. The `chw_profiles` table exists in the shared schema but no service
> writes to it — the CHW roster currently lives in Users & roles. Profile creation ships with
> the CHW profiles CRUD task.*

If **D2-B**, read `users WHERE role = 'chw'`: `name`, `lhwId`, `phone`, `active`, `createdAt`,
plus `facilityId` → facility name. **`passwordHash` never.**

### `admin.cases.tsx` — model on `admin.protocols.tsx`

| Column | Source | Notes |
| --- | --- | --- |
| Logged | `created_at` | formatted date/time; server already sorts DESC |
| Disaster | `is_disaster_related` | **the `admin.protocols.tsx:101` accent pill labelled "Disaster", `—` when false** (§5) |
| Patient | `patient_age`, `patient_sex` | combine, e.g. `45 · F`; both nullable → `—` |
| Symptoms | `symptoms` | `NOT NULL`; the longest live value is 56 chars so a plain cell is fine, but a `<details>` expander (`admin.protocols.tsx:113-118`) is the safer default for free text |
| Diagnosis | `diagnosis ?? "—"` | **display only — see the rule note below** |
| Treatment | `treatment ?? "—"` | contains dosing text (`"Amoxicillin per IMCI dose row"`) |
| Outcome | `outcome ?? "—"` | |
| District | `district_name ?? "—"` | LEFT JOIN, nullable |
| CHW | per D1b | `chw_name` or `chw_lhw_id` — decide at GATE |

> **Domain rule note (satisfied trivially, but state it):** both `CLAUDE.md` files and PRD L134
> require that dosing/diagnosis text come from the `protocols` lookup table and **never** be
> generated. #9 renders `cases.diagnosis` / `cases.treatment` **verbatim from the database**.
> No summarisation, no "clean up this text", no AI-assist affordance, ever. Read-only makes this
> automatic — do not introduce any transform on those two fields beyond `?? "—"`.

---

## 8. Live traps and latent bugs

**T1 — `/api/public/facilities` returns `[]` (§3/§6).** Not a bug in the query; a trap for anyone
who reuses it. Already covered by Step 2's new query. Mentioned here so the build agent does not
spend fix-loop budget debugging "why is my table empty".

**T2 — `facilities.district` is a varchar and looks like it should be a FK.** A build agent
pattern-matching on `glaciers.district_id` / `cases.district_id` will write a broken join
(`LEFT JOIN districts d ON d.id = f.district` → `ERROR: operator does not exist: uuid = character varying`).
**This will throw at query time, i.e. a 500 on the endpoint.** Render the string.

**B3 (latent, out of scope) — `chw.tsx:131,133` uses tier-red for the protocol disaster chip.**
`border-[var(--color-critical)]/30` + `bg-[var(--color-critical)]/10 text-[var(--color-critical)]`
for a non-tier concept, contradicting `styles.css:14` and the workspace red rule. #8 flagged it
and did not fix it; #9 renders the *cases* disaster flag correctly but must not touch `chw.tsx`.
Roll this into the same follow-up issue as #8's B1/B2 if one is still open.

**B4 (latent, out of scope) — `data.tsx:110`'s facilities example payload is fabricated-looking.**
It shows `"Gilgit District Hospital", lat 35.92, lng 74.31` — an example, not real seeded data,
and the endpoint currently returns `[]`. Not #9's problem (the brief excludes `data.tsx`), but
worth a note in the follow-up given the workspace's no-fabricated-coordinates rule applies to
documentation examples too.

---

## 9. Deviations / decisions to name at GATE

### D1 (GATE — the headline decision) — auth posture for the cases GET

`cases` holds `patient_age`, `patient_sex`, `symptoms`, `diagnosis`, `treatment`, `outcome`.
Every GET in this repo is ungated. A build agent following the local pattern will produce an
**unauthenticated public endpoint serving patient-adjacent clinical records**. The workspace rule
that justifies ungated Open Data is scoped precisely — *"Open Data endpoints are intentionally
unauthenticated (**safety info** must never be gated)"* — and patient records are the opposite
category. PRD §5 L137 calls `cases` "clinical-adjacent … Demo/real patient-adjacent records".

**Recommendation: the cases GET must be gated.** Both roles, because `AdminShell.tsx:39-47`
puts Cases in a group with `adminOnly: false` — gating to `cryohealth_admin` only would make the
sidebar lie to `facility_admin`.

**Exact API, read from `src/lib/auth-guard.ts` (do not guess the arity):**

```ts
export async function requireAuth(request: Request): Promise<JwtPayload>   // L17, throws AuthError(401)
export function requireRole(claims: JwtPayload, roles: Role[]): void       // L33, throws AuthError(403)
```

`requireRole` takes **two** arguments — `claims` first — and returns `void`; it does not return a
boolean and it is **not** `requireRole(roles)`. Copy the call site verbatim from
`src/routes/api/public/alerts.ts:12-20`, which is the only existing `requireRole` consumer:

```ts
let claims;
try {
  claims = await requireAuth(request);
  requireRole(claims, ["cryohealth_admin", "facility_admin"]);
} catch (e) {
  if (e instanceof AuthError) return e.response;
  throw e;
}
```

Note the two distinct status codes this produces: **401** for missing/invalid token
(`requireAuth`), **403** for a valid token with the wrong role (`requireRole`). Step 3's
verification asserts the 401; a 403 check needs a CHW token and is optional.

**Sub-decision D1a — where the handler lives:**
- **Option A: add a `GET` to the existing `src/routes/api/public/cases.ts`.** No new file, **no
  `routeTree.gen.ts` churn**, and the file already imports `requireAuth`/`AuthError`. Cost: a
  gated GET sitting under a path segment named `public`, which is misleading.
- **Option B: new `src/routes/api/admin/cases.ts`** — first file in the `api/admin/` directory
  PRD §7/§10 anticipates. Honest path naming. Cost: new file → `routeTree.gen.ts` regenerates
  (mechanical, but a diff a reviewer must scan), and it establishes a directory convention that
  the rest of G3 then has to follow consistently.

**Recommend Option B** for cases specifically — the path name is doing safety-relevant
communication here, and G3 will need `api/admin/` anyway. **If GATE prefers minimal churn,
Option A is defensible**; what is *not* defensible is an ungated GET.

**Sub-decision D1b — CHW name vs `lhwId` on the cases table.** Options: `u.name` ("Amina Baig")
or `u."lhwId"` ("chw-001"). Note honestly: with **one CHW in the system**, `lhwId` pseudonymises
nobody — it is a stable identifier trivially resolvable via the Users page. So choose on grounds
of consistency, not protection:
- **Show `chw_name`:** behind the D1 gate, knowing which CHW logged a case *is* the supervisory
  purpose of this view. Recommended if D1 lands as a gated endpoint.
- **Show `chw_lhw_id`:** consistent with #8's D2 posture (which declined to surface CHW names on
  an ungated endpoint). Justified *only* by that consistency, not by privacy benefit — and #8's
  reasoning turned on the endpoint being **ungated**, which D1 changes.

**Recommend `chw_name`, conditional on D1 landing gated.** If GATE chooses an ungated endpoint
(not recommended), then `chw_lhw_id` at most, and arguably neither.

### D2 (GATE) — what "CHW profiles" reads from

- **Option A (recommended): read `chw_profiles`.** Matches PRD §5 L136 exactly (`CHW profiles` →
  `chw_profiles`). Zero PII escalation. Ships a page that renders an **honest empty state**
  naming that no system writes this table yet (§7 copy). Precedent exists in this codebase for
  exactly this posture: PRD §6 commits to an honest empty state for the sync page rather than
  fabricating activity.
  *Cost:* a permanently-empty page in the demo until CHW-profiles CRUD ships.
- **Option B: read `users WHERE role = 'chw'`.** Shows one real row.
  *Cost:* it makes `/admin/chw-profiles` a **duplicate of #11's Users & roles page** filtered by
  role, pulls `users` PII (`phone`, `lhwId`, `active`, `facilityId`) into a page the PRD scoped
  to a different table, and creates a second de-facto users view whose behaviour will diverge
  when the real CHW-profiles CRUD lands. And the payoff is one row where `phone` and
  `facilityId` are both NULL — mostly `—` anyway.
- **Option C (compromise, name it so GATE picks rather than defaults):** read `chw_profiles` as
  the table, and render the empty state with a **`<Link to="/admin/users">` to Users & roles**
  plus the live count of `role='chw'` users. Costs nothing extra (`getKpis()` already returns
  `chws`), gives the demo something true to look at, and does not duplicate the users table.

**Recommend A, or C if GATE wants the page to feel less dead.** Either way **`passwordHash`
never appears in a SELECT**.

**Auth posture for the chw-profiles endpoint: leave it ungated**, mirroring
`src/routes/api/public/lakes-admin.ts`. Rationale, and why it differs from cases: under D2-A the
table has **zero rows**, therefore zero PII to protect today; and gating it would manufacture a
*second* first-gated-GET decision inside a `size:s` task. The two cases are not symmetric —
`cases` contains live clinical records right now, `chw_profiles` contains nothing. If D2-B wins
(read `users`), that flips: roster PII becomes real and the endpoint **must** be gated exactly
like cases, which is a further argument against Option B.

### D3 (non-deviation, state it so nobody invents work) — no file-layout deviation

#6 and #7 each needed a GATE-flagged deviation because the DoD named `admin.X.tsx` while the
table belonged in `admin.X.index.tsx`. **That does not recur.** All three files are flat leaf
routes on disk, the DoD names them correctly, and all three nav entries already exist
(`AdminShell.tsx:39-47`). No sidebar work, no `Outlet` parents, no `.index` files.

### D4 (non-deviation) — no `TierBadge`, no `isTier`, no tier concept anywhere in #9

None of the three tables has a `tier` column. `facilities.vulnerability` is free text
(`'high'`/`'low'`) and is **not** a hazard tier — do not route it through `TierBadge`, do not
import `Tier`. #7's `isTier` guard and #8's `TierBadge` usage both fail to apply here.

### D6 (sizing) — the `size:s` label may be optimistic; name the separable piece now

#9 is labelled `size:s` ("one session"), like #7 and #8. But #8 needed **zero** new queries and
**zero** new endpoints, while #9 needs **three new query functions, one or two new endpoints,
three new pages, and the repo's first gated GET** — seven commits in §10 versus #8's four.

**Do not silently re-scope**, but name it at GATE: if the session runs long, the separable piece
is **Cases** (Steps 1c / 3 / 6) — it is the only part carrying the auth decision, and Facilities
+ CHW profiles (Steps 1a/1b / 2 / 4 / 5) stand alone as a coherent smaller commit set. Splitting
the other way (deferring Facilities) does not work, because Facilities is where the live T1 trap
lives and it is the cheapest real value in the task.

### D5 (non-blocker, state it so nobody blocks) — the `cases` soft-delete migration is not a #9 dependency

PRD §10 open question 2 requires a `deleted_at` migration in CryoHealth-api **before Cases CRUD
ships**. #9 is read-only. Do not add a migration, do not add a `deleted_at` filter, do not block.

---

## 10. Draft plan steps

Loop budget **3** (fix loop). Escalation: budget exhausted, or two identical failure signatures →
label `agent:needs-human`, comment the trail, stop. Do not widen scope to escape a failing step.

Baseline for every step: `bunx tsc --noEmit && bun run lint`. **That passes on the current
placeholders**, so on its own it fails rubric item 2 — each step below pairs it with a check that
**fails today**.

**Rollback for every step:** `git revert <sha>`. Steps 2-5 touch one leaf route or one new file
each; nothing imports them. Steps 1a/1b/1c are purely additive new functions in `queries.ts`
(no existing function's text changes), so a revert cannot break an existing consumer.

Mechanical no-affordance check (the DoD's "view-only"):

```bash
grep -nE "<form|useMutation|Trash|Pencil|Edit|Delete|method=\"post\"" \
  src/routes/admin.facilities.tsx src/routes/admin.chw-profiles.tsx src/routes/admin.cases.tsx
```

> `useMutation` and `<form>` must have **zero** matches. Permitted `onClick`/`<details>` usages
> are read-only view state only (a body expander). There are no Tabs on these pages, so unlike
> #7 there is no `TabsTrigger` exemption.

---

### Step 0 — pre-flight (no commit)

Confirm, do not assume:
- **Establish the baseline green state first:** `bunx tsc --noEmit && bun run lint` passes on
  `HEAD` *before any edit*. A pre-existing failure must be identified now, not attributed to
  Step 1 and charged to the fix-loop budget.
- `bun dev` is up; read the origin off the dev-server banner. **Vite's default is
  `http://localhost:5173`** (`vite.config.ts` sets no `server.port`). **`localhost:3000` is
  CryoHealth-api — a different service. Do not curl it.**
- Postgres on `DB_PORT=5433`; seed has run.
- `/admin/facilities`, `/admin/chw-profiles`, `/admin/cases` currently render `AdminPlaceholder`
  (proves routing + the `admin.tsx` role gate work before any change).
- `AdminShell.tsx:39-47` already has all three nav entries → **no sidebar work**.

*Verification (all three are the "before" state the later steps must change):*

```bash
curl -s "$DEV_URL/api/public/facilities" | jq '.facilities | length'   # 0  ← the T1 trap, live
curl -s "$DEV_URL/api/public/cases"      | jq .                        # 405/404 — no GET handler
psql -h localhost -p 5433 -U cryohealth -d cryohealth \
  -c "select count(*) from facilities;" -c "select count(*) from cases;" \
  -c "select count(*) from chw_profiles;"                              # 1, 4, 0
```

---

### Step 1 — three new read functions in `src/lib/queries.ts`

Add `listFacilitiesAdmin()`, `listCasesAdmin(limit = 200)`, and (per D2) `listChwProfiles()`,
using the SQL in §3 verbatim. **Do not modify `listFacilities()` or
`listDisasterCasesForDistrict()`.** Double-quote `"createdAt"`, `"lakeId"`, `"lhwId"`.
**No `SELECT *` and no `passwordHash` anywhere.**

*Blast radius:* additive only — three new exported functions, no existing function's body
changes, no consumer affected. Server-only module; never imported from client code.

*Verification:* `bunx tsc --noEmit && bun run lint`, plus a direct DB check of each new query's
exact SQL (fails today because the functions don't exist; catches the T2 join trap and any
enum/quoting error at parse time rather than as a 500 later):

```bash
psql -h localhost -p 5433 -U cryohealth -d cryohealth -c "<paste each SELECT verbatim>"
# facilities: 1 row, has_geom = f, district = 'Hunza', lat/lng NULL
# cases:      4 rows, exactly one is_disaster_related = t, chw_name = 'Amina Baig' on all 4
# chw_profiles: 0 rows, no error
```

Splitting this into 1a/1b/1c (one function per commit) is acceptable and arguably better for
atomicity; keep it as one commit only if the reviewer is comfortable with three SELECTs in a diff.

---

### Step 2 — `GET /api/public/facilities-admin` (new endpoint)

New route file returning `{ facilities: await listFacilitiesAdmin() }`. Mirror
`src/routes/api/public/lakes-admin.ts` exactly — that is the established "admin variant of a
public dataset" precedent (10 lines, ungated). Facilities are infrastructure reference data, not
PII, so **ungated is consistent** with `lakes-admin`; flag `contact` (nullable, NULL today) as
the only mildly-personal field. **Do not add this endpoint to `data.tsx`'s Open Data catalogue.**

*Blast radius:* new file → `routeTree.gen.ts` regenerates. Nothing else changes.

*Verification:* `bunx tsc --noEmit && bun run lint`, plus a check that **404s today**:

```bash
curl -s "$DEV_URL/api/public/facilities-admin" | jq '.facilities | length'   # 1
curl -s "$DEV_URL/api/public/facilities"       | jq '.facilities | length'   # still 0 — unchanged
```

The second line is the load-bearing one: it proves the public/map payload was not disturbed.

---

### Step 3 — the cases GET, **gated** (per D1)

Per D1/D1a: either a `GET` added to `src/routes/api/public/cases.ts`, or a new
`src/routes/api/admin/cases.ts`. Either way: `claims = await requireAuth(request)` then
`requireRole(claims, ["cryohealth_admin", "facility_admin"])` — **two arguments, `claims` first**
(§9 D1 has the verified signatures and the verbatim call site) — inside the `AuthError` catch
pattern already in `cases.ts`. Returns
`{ cases: await listCasesAdmin() }`. **Do not touch the existing POST handler.**
**Do not add this endpoint to `data.tsx`.**

*Blast radius:* **auth-relevant and user-data-relevant — flag at review.** This is the first
gated GET in the repo. If it lands in a new `api/admin/` file, `routeTree.gen.ts` regenerates.

*Getting an admin token first* — the file's other curl checks need no auth, this one does.
This dashboard mints its own JWTs (`src/routes/api/auth/login.ts`); the dev credentials are
`lhwId` + PIN from `CryoHealth-api/scripts/seed-users.ts:10-23` (**all three dev users share PIN
`1234`**; `admin-001` = Cryo Admin = `cryohealth_admin`). Note the response field is
**`accessToken`**, not `token`:

```bash
ADMIN_JWT=$(curl -s -X POST "$DEV_URL/api/auth/login" \
  -H 'content-type: application/json' \
  -d '{"identifier":"admin-001","password":"1234"}' | jq -r .accessToken)
test -n "$ADMIN_JWT" && test "$ADMIN_JWT" != null   # if this fails, JWT_SECRET/DB are misconfigured, not the new endpoint
```

*Verification:* `bunx tsc --noEmit && bun run lint`, plus the check that proves the gate exists
(every line fails today — no handler at all):

```bash
curl -s -o /dev/null -w '%{http_code}\n' "$DEV_URL/<cases-endpoint>"                 # 401
curl -s -H "Authorization: Bearer $ADMIN_JWT" "$DEV_URL/<cases-endpoint>" | jq '.cases | length'   # 4
curl -s -H "Authorization: Bearer $ADMIN_JWT" "$DEV_URL/<cases-endpoint>" \
  | jq '[.cases[] | select(.is_disaster_related)] | length'                          # 1
curl -s -H "Authorization: Bearer $ADMIN_JWT" "$DEV_URL/<cases-endpoint>" \
  | jq '[.cases[] | has("passwordHash")] | any'                                      # false
```

The **401** assertion is the one a build agent would otherwise skip, and it is the whole point of
the step. The `passwordHash` assertion is cheap insurance.

**No Step 3b.** Per D2 the chw-profiles endpoint stays ungated, so it needs no token and no
401 check — it is covered by Step 5.

---

### Step 4 — `admin.facilities.tsx`: real table

Replace the placeholder. One `useQuery` (`["admin-facilities"] → /api/public/facilities-admin`),
plain `fetch` with `if (!res.ok) throw new Error(...)`. Structure copied from
`admin.districts.tsx`. Columns per §7. **No `TierBadge`** (D4). Format `created_at` as a date.
`lat`/`lng`/`contact` are `| null` → `—`.

*Verification:* `bunx tsc --noEmit && bun run lint`, plus manual at `/admin/facilities`:
- 1 row: `Hassanabad BHU`, type `bhu`, district `Hunza`, vulnerability `high`.
- The **Mapped** column reads `No location` (proves the geom-null path and that the page is not
  reusing the old `[]`-returning endpoint).
- Contact renders `—`, not `null`. Date renders as a date, not a raw ISO string.
- Header subtitle names the unmapped count.
- No console errors. No-affordance grep clean.

---

### Step 5 — `admin.chw-profiles.tsx`: real table (per D2)

Replace the placeholder. One `useQuery` with **plain `fetch`** — per D2 this endpoint is
ungated, so `authFetch` is not needed here (contrast Step 6). Structure copied from
`admin.districts.tsx` (whose `queryFn` at L27-31 is the exact shape, including the
`if (!res.ok) throw` and the `?? []` fallback). If D2-B wins instead, this endpoint is gated and
this step must switch to `authFetch` — flag that dependency before starting.
Under D2-A/C the page renders its empty state — **that empty-state copy is the deliverable**, and
it must name the fact that no service writes `chw_profiles` (§7). Do not fabricate rows, do not
fall back to `users` silently.

*Verification:* `bunx tsc --noEmit && bun run lint`, plus manual at `/admin/chw-profiles`:
- Renders the honest empty state (not "Loading…" forever, not an error banner) — this is the
  distinguish-empty-from-error check that #6's fix loop existed for.
- Devtools Network shows HTTP **200** with `{"profiles":[]}`, not a 4xx/5xx.
- `grep -n "passwordHash" src/lib/queries.ts src/routes/admin.chw-profiles.tsx` → zero matches.
- No-affordance grep clean.

---

### Step 6 — `admin.cases.tsx`: real table with the disaster flag

Replace the placeholder. One `useQuery` against the gated endpoint — **use `authFetch`
(`src/lib/auth-client.ts:51`), not bare `fetch`**, since this endpoint requires a token. This is
the one place in #9 where the #8 guidance ("plain `fetch`, all GETs are ungated") **does not
carry over.** Structure copied from `admin.protocols.tsx`. Columns per §7. Disaster badge is the
`admin.protocols.tsx:101` accent pill labelled "Disaster" (§5). Preserve the server's
`created_at DESC` order — do not re-sort client-side. No filter bar (§6). Nullable fields → `—`.

*Verification:* `bunx tsc --noEmit && bun run lint`, plus manual at `/admin/cases`:
- 4 rows, newest first (`Minor lacerations…` at the top).
- **Exactly one** row carries the `Disaster` badge (the lacerations/evacuation row); the other
  three show `—`.
- `grep -nE "color-critical|bg-red|text-red" src/routes/admin.cases.tsx` → **zero matches**
  (the DoD's "not a new ad hoc red", mechanically checked).
- The badge markup matches `admin.protocols.tsx:101` (same classes) — visually identical pill on
  `/admin/protocols` and `/admin/cases`.
- NULL `diagnosis`/`treatment` render `—`, not "null".
- Dates render as dates. Diagnosis/treatment text is byte-identical to the DB values (no
  truncation that changes meaning; if truncated, an expander shows the full text).
- The global `DemoBanner` ("Case and health records shown are sample data") is visible — no
  second banner added.
- **Sign out and reload `/admin/cases`** → redirected/blocked, and the endpoint returns 401 in
  Network. Proves the gate is server-side, not just the client route guard.
- No-affordance grep clean.

---

### Step 7 — `graphify update .` + close-out

`graphify update .` (AST-only, no API cost) so the graph reflects three real page bodies, three
new query functions and the new endpoint(s).

*Verification:* `graphify query "admin cases disaster related table"` returns `admin.cases.tsx`
with a real component node (today it resolves only to `AdminPlaceholder`).

**No cleanup step and no removal step** — nothing is superseded. `listFacilities()`,
`listDisasterCasesForDistrict()`, the public `/api/public/facilities` endpoint and `chw.tsx` all
stay exactly as they are.

---

## 11. Explicitly NOT in scope

- **No create / edit / delete on Facilities, CHW profiles or Cases.** Those are separate G3 CRUD
  tasks. No forms, no `useMutation`, no PUT/PATCH/DELETE handlers.
- **No `src/lib/admin-schemas.ts` changes** — `facilitySchema`, `chwProfileSchema` and
  `caseSchema` stay empty `.strict()` stubs.
- **No migrations, no schema changes, no `synchronize`.** CryoHealth-api owns the schema
  (workspace `CLAUDE.md`). In particular **do not add `cases.deleted_at`** (D5) and **do not
  convert `facilities.district` into a FK** (T2).
- **No seeding, no fabricated data.** Specifically: **do not invent a coordinate for Hassanabad
  BHU** to make the facilities/map data look complete — `seed-dev-data.ts:31-33` left it NULL
  deliberately, and the project-memory rule ("no fabricated hazard data") governs it. Do not add
  `chw_profiles` rows to make that page non-empty.
- **No changes to `listFacilities()`, `listDisasterCasesForDistrict()`, `insertCase()`, or
  `getKpis()`.**
- **No changes to `src/routes/lakes.tsx`, `HazardMap.tsx`, `chw.tsx`, `admin.index.tsx`, or
  `src/routes/data.tsx`** — including *not* adding the two new admin endpoints to the Open Data
  catalogue.
- **No fix for B3** (`chw.tsx:133` tier-red disaster chip) or **B4** (`data.tsx:110` example
  payload) — file them with #8's existing follow-up.
- **No auth changes beyond the new endpoints' own guards.** No change to `auth-guard.ts`,
  `jwt.ts`, `RolesGuard` semantics, or `admin.tsx`'s client-side gate. The one genuinely new
  auth posture (first gated GET) is D1 and needs a GATE decision, not a default.
- **No `loader:` introduction** — the repo has zero; stay on `useQuery`.
- **No `TierBadge` / `Tier` / `isTier`** anywhere in #9 (D4).
- **No transform on `cases.diagnosis` / `cases.treatment`** beyond `?? "—"` — no summarisation,
  no AI-assist, ever (workspace + repo `CLAUDE.md`, PRD L134/§8).
- **No `SELECT *` and no `passwordHash`** in any query added by #9.

---

## Risks / assumptions that change the plan if wrong

1. **D1 is the plan-shaping decision.** If GATE decides the cases GET should be ungated like
   every other GET, Step 3 loses its 401 assertion, Step 6 uses plain `fetch` instead of
   `authFetch`, and D1b should flip to `chw_lhw_id` (or omit the CHW column). Decide **before**
   Step 3. If GATE picks D1a Option B (`api/admin/cases.ts`), a `routeTree.gen.ts` diff appears
   that Option A avoids.
2. **D2 changes Step 1's third function and Step 5 entirely.** Under Option B the page reads
   `users` and gains real PII; under A/C it ships an empty state. Decide before Step 1.
3. **`GET /api/public/facilities` returns `[]` today** because the only facility has NULL geom.
   Any plan that reuses that endpoint for the admin page ships a table that looks broken.
   Verified live: `count(*)=1, count(geom)=0`.
4. **`facilities.district` is `character varying`, not a uuid FK.** A pattern-matched
   `LEFT JOIN districts ON d.id = f.district` throws `operator does not exist: uuid = character varying`
   → a 500 on the endpoint. Render the string.
5. **`chw_profiles` has 0 rows and no writer in any repo.** If someone later discovers a writer
   this finding is wrong and D2 changes — but `grep -rn "chw_profiles"` across all four repos
   returns only the create and drop statements in `WebSchema.ts`.
6. **Mixed column casing across the three tables.** `facilities` uses `"createdAt"`/`"lakeId"`
   (camelCase, must be double-quoted) while `cases` and `chw_profiles` are fully snake_case, and
   `users` mixes both (`"lhwId"`, `"facilityId"`, `"createdAt"` quoted; `name`, `role`, `active`
   not). An unquoted camelCase identifier fails at parse time.
7. **`users.role` is a DB enum** — `upper(role)` throws (`function upper(role) does not exist`,
   the project-memory bug class). `WHERE role = 'chw'` is fine; any text function needs `::text`.
   Only relevant under D2 Option B.
8. **Six of eleven `cases` columns are nullable and three are NULL in live data.** Typing them as
   `string` (not `string | null`) passes `tsc` — values come from an untyped `res.json()` — then
   renders "null" or throws on `.toLowerCase()`. Type them `| null` and guard.
9. **The disaster badge must not be red.** Both the mechanical grep
   (`color-critical|bg-red|text-red` → zero matches in `admin.cases.tsx`) and the visual match
   against `admin.protocols.tsx:101` should be checked at review. If GATE overrides §5 and wants
   tier-red, that contradicts `styles.css:14` and workspace `CLAUDE.md` and should be recorded as
   an explicit override, not a silent choice.
10. **Empty must be distinguishable from error** on `/admin/chw-profiles` (0 rows by design) and
    on `/admin/facilities` if the wrong endpoint is used. This exact bug consumed #6's fix loop
    (commit `28a0f77`, "distinguish fetch errors from empty/not-found").
11. **Blast radius:** `src/lib/queries.ts` (three added functions, no existing function changed),
    one or two new API route files, three leaf routes, and a regenerated `routeTree.gen.ts`.
    **Auth and user data are both touched** (a new gated endpoint serving patient-adjacent
    records) — flag at review per plan-quality rubric item 4. No migrations, no writes to any
    table, no changes to any public/Open Data payload.
12. **Do not curl `localhost:3000`** — that is CryoHealth-api, a different service. This dashboard
    is `bun dev` → Vite, default `:5173`. Read the origin off the dev-server banner.

---

## Key file paths

- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.facilities.tsx` (9-line placeholder)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.chw-profiles.tsx` (9-line placeholder)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.cases.tsx` (9-line placeholder)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.districts.tsx` (flat-table precedent)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.protocols.tsx` (**L101 = the disaster-badge markup to copy**; `<details>` expander L113-118)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.alerts.tsx` (filter-bar precedent L101-132, if ever needed)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.tsx` (role gate + AdminShell — do not duplicate per page)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/chw.tsx` (**L131,133 tier-red disaster chip = anti-precedent, bug B3**)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/lakes.tsx:41-46,103` (the `/api/public/facilities` consumer that the geom filter protects)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/data.tsx:108-110` (facilities Open Data entry — "with a mapped location"; bug B4)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/__root.tsx:151` (`DemoBanner`, global)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/api/public/facilities.ts` (ungated GET, returns `[]` today)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/api/public/cases.ts` (**POST only**, `requireAuth` + `AuthError` pattern to copy)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/api/public/lakes-admin.ts` (10-line "admin variant" endpoint precedent)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/api/public/alerts.ts:12-20` (`requireAuth` + `requireRole` pattern)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/queries.ts` (`listDisasterCasesForDistrict` L45-54, `listFacilities` **L170-177 the geom filter**, `insertCase` L198-214, `getKpis` L216-228)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/auth-guard.ts` — `AuthError` L5, `requireAuth(request)` L17, **`requireRole(claims, roles)` L33 (two args, returns void, throws 403)**
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/auth-client.ts` — `getToken` L8, `login(identifier, password)` L32 (stores `body.accessToken`), **`authFetch` L51** (needed by `admin.cases.tsx`)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/api/auth/login.ts` (`{identifier, password}` in → `{accessToken, role, name}` out; matches on `"lhwId"` OR `phone`)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/admin-schemas.ts:31-37` (`facilitySchema`, `chwProfileSchema`, `caseSchema` — leave as stubs)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/tier.tsx:72-77` ("Colour is never the only signal" — the "visibly" rule)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/i18n.tsx:18,34` (`demoBanner` EN/UR copy)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/styles.css:14` (**"Red means CRITICAL and nothing else"**)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/components/cryohealth/AdminShell.tsx:39-47` (Health workforce nav — already wired, `adminOnly: false`)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/components/cryohealth/DemoBanner.tsx`
- `/Users/m5/Projects/uexel/cryo/cryohealth/docs/admin-portal-prd.md` (CRUD matrix L124-141; Facilities L135, CHW profiles L136, **Cases L137 "clinical-adjacent"**; §7 component reuse L171-199; §10 open questions L227-247)
- `/Users/m5/Projects/uexel/cryo/cryohealth/docs/ai/planning/task-8-findings.md` (shape precedent; its §7 colour warning is the direct ancestor of §5 here)
- `/Users/m5/Projects/uexel/cryo/CryoHealth-api/src/database/migrations/1785608131024-InitialSchema.ts:29` (`facilities` DDL), `:35` (`users` DDL)
- `/Users/m5/Projects/uexel/cryo/CryoHealth-api/src/database/migrations/1785659144273-AlertDedupeAndFacilityLake.ts:11` (`facilities."lakeId"`)
- `/Users/m5/Projects/uexel/cryo/CryoHealth-api/src/database/migrations/1785700000000-WebSchema.ts:65` (`facilities.vulnerability`), `:132-143` (`chw_profiles`), `:146-167` (`cases`)
- `/Users/m5/Projects/uexel/cryo/CryoHealth-api/scripts/seed-users.ts:10-23` (**dev logins: `admin-001` / `1234`, `chw-001` / `1234`, `facility-001` / `1234`**)
- `/Users/m5/Projects/uexel/cryo/CryoHealth-api/scripts/seed-dev-data.ts:31-37` (facilities-geom-NULL and cases-are-synthetic provenance notes), `:199-211` (facilities upsert), `:313-375` (cases seed)
