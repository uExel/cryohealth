# Task #11 findings — CRUD: Lakes (tier/risk-score columns locked)

Issue: [#11](https://github.com/uExel/cryohealth/issues/11) · Goal: #3 · Depends on: #7 ·
Model task: #10 (`9cb0a3a..76157bb`, closed) · Size: m · Prio: p1 · Loop budget: 3

Written by the planner agent, 2026-08-16. Everything below was checked against the live
tree and the running docker Postgres (`cryohealth-api-db-1`, port 5433), not inferred
from #10's docs. Live probes are marked **[probed]**.

---

## 0. Headline — what is actually different from #10

#10 gave us the whole scaffold (zod `.strict()` schemas, `writeAudit()`, `sql.begin`
transactions, dependent-count delete guard, `api-errors.ts`, Dialog/Form/AlertDialog UI).
#11 copies all of it. Four things are genuinely new and are where this task will break if
copied blindly:

1. **`lakes.geom` is `geometry(Point,4326) NOT NULL`** — `lat`/`lng` are *not* columns.
   `sql(patch)` cannot express `ST_SetSRID(ST_MakePoint(...),4326)`. Districts/glaciers
   had plain `lat`/`lng` `double precision` columns; lakes do not. **[probed]** solution
   in §5.
2. **Five NOT-NULL-no-default columns on create**: `name`, `valley`, `district` (varchar,
   legacy, still live-consumed), `slug` (UNIQUE), `source`, plus `geom`. #10's create
   paths had at most two.
3. **Two locked columns** (`currentTier`, `current_risk_score`) that must appear in the
   GET/read type and the edit UI but be structurally unwritable. §6.
4. **`lakes."updatedAt"` exists and has no DB trigger** **[probed]** — districts/glaciers
   have no `updatedAt` at all, so #10 never had to think about it. The admin list renders
   it as the "Updated" column; a write that doesn't bump it makes that column lie. §5.

---

## 1. Current state of the lake API surface

### There is no `src/routes/api/admin/lakes*.ts` — the DoD's filenames don't exist yet

```
src/routes/api/admin/
  cases.ts
  districts.$districtId.ts
  districts.ts
  glaciers.$glacierId.ts
  glaciers.ts
```

The DoD says "`src/routes/api/admin/lakes.$lakeId.ts` adds PUT/DELETE (POST already
partially covered by `listLakesAdmin`'s sibling file, extend it)". `listLakesAdmin`'s
sibling file is `src/routes/api/public/lakes-admin.ts` — 10 lines, **GET-only and
ungated**:

`src/routes/api/public/lakes-admin.ts:1-10`
```ts
export const Route = createFileRoute("/api/public/lakes-admin")({
  server: { handlers: { GET: async () => Response.json({ lakes: await listLakesAdmin() }) } },
});
```

`docs/admin-portal-prd.md:112-113` says the same thing ("GET-only today despite its name
— a natural first file to extend with PUT/DELETE rather than duplicating into
`api/admin/`").

**Recommended deviation (name it explicitly in PLAN, like #10 named the
`admin.glaciers.tsx` vs `.index.tsx` one):** create net-new
`src/routes/api/admin/lakes.ts` (POST) + `src/routes/api/admin/lakes.$lakeId.ts`
(PUT/DELETE) and leave `api/public/lakes-admin.ts` byte-identical. Reasons:
- #10 settled "route symmetry across resources beats literal DoD wording"
  (`docs/ai/PLAN.md`, "Settled, not GATE items").
- `api/public/*` is the *ungated* namespace; every file there is deliberately
  unauthenticated. Putting a role-gated PUT in it makes the directory's one invariant
  ("no auth in api/public") false, and `admin.lakes.index.tsx:54` + `alerts.tsx:181`
  both consume the public GET as an anonymous fetch today.
- `api/admin/lakes.$lakeId.ts` is literally the path the DoD names.

### Other lake endpoints (all read-only, all stay untouched)

| File | Verb | Query fn | Consumed by |
| --- | --- | --- | --- |
| `src/routes/api/public/lakes-admin.ts:7` | GET | `listLakesAdmin()` | `admin.lakes.index.tsx:54`, `alerts.tsx:181` |
| `src/routes/api/public/lakes.$lakeId.ts:7-16` | GET | `getLakeDetail()` + 3 more | `admin.lakes.$lakeId.tsx:73`, `lakes.$lakeId.tsx` |
| `src/routes/api/public/lakes.ts` | GET | `fetchLakesFromApi()` (HTTP → CryoHealth-api) | public hazard map |
| `src/routes/api/public/hot-lakes.ts` | GET | `listHotLakes()` | dashboard |
| `src/routes/api/public/hazard-scores.$lakeId.ts` | GET (gated) | `listHazardScores()` | `admin.lakes.$lakeId.tsx:87` |

---

## 2. `lakes` schema — authoritative, from `\d lakes` on the live DB

```
 Column                | Type                     | Null | Default
-----------------------+--------------------------+------+---------------------
 id                    | uuid                     | NO   | uuid_generate_v4()
 name                  | character varying        | NO   |
 nameUr                | character varying        | YES  |
 valley                | character varying        | NO   |
 district              | character varying        | NO   |          <- legacy TEXT, not the FK
 damType               | dam_type (enum)          | NO   | 'unknown'
 glacierContact        | boolean                  | NO   | false
 icimodId              | character varying        | YES  |           UNIQUE
 geom                  | geometry(Point,4326)     | NO   |           <- lat/lng live here
 boundary              | geometry(Polygon,4326)   | YES  |
 elevationM            | integer                  | YES  |
 historicalGlof        | boolean                  | NO   | false
 currentTier           | tier (enum)              | NO   | 'normal'  <- LOCKED
 stale                 | boolean                  | NO   | false
 createdAt             | timestamptz              | NO   | now()
 updatedAt             | timestamptz              | NO   | now()     <- no trigger
 slug                  | character varying        | NO   |           UNIQUE
 source                | text                     | NO   |
 sourceUrl             | character varying        | YES  |
 district_id           | uuid                     | YES  |           FK -> districts(id) ON DELETE SET NULL
 current_risk_score    | numeric                  | NO   | 0         <- LOCKED
 downstream_population | integer                  | NO   | 0
 area_km2              | numeric                  | YES  |
```

Enums **[probed]**: `tier = normal,watch,high,critical` · `dam_type = moraine,bedrock,ice,unknown`
(both lowercase in the DB; the UI's `Tier` type in `src/lib/tier.tsx:3` is UPPERCASE —
that's what all the `upper(l."currentTier"::text)` aliasing in `queries.ts` is for).

**Exact column names to answer the question directly:** `"currentTier"` (quoted
camelCase, enum `tier`) and `current_risk_score` (snake_case, `numeric`). Both are
NOT NULL with defaults, so neither ever needs to appear in a create payload.

Triggers on `lakes` **[probed]**: **none** (`SELECT ... FROM pg_trigger` → 0 rows).
`updatedAt` is a TypeORM `@UpdateDateColumn`, i.e. app-level; direct SQL from this repo
will not bump it.

### Mixed naming is not a mistake — it must be preserved verbatim in the write schema

`src/lib/db.ts:47-54` constructs `postgres({host,port,username,password,database,max:5})`
with **no `transform` option** **[probed by reading db.ts]** → postgres.js does not
camel/snake-convert anything. `sql(patch)` quotes every key with
`escapeIdentifier` (`node_modules/postgres/src/types.js:216`, `'"' + str.replace(...) + '"'`),
so `{ damType: "moraine" }` emits `"damType"=$1` and works. **[probed]** — a
`Parse`-only `.describe()` of `UPDATE lakes SET ${sql({name,damType,downstream_population,updatedAt})} ...`
parsed cleanly against the live server.

⇒ **zod write-schema keys must be the DB column names exactly**: `nameUr`, `damType`,
`glacierContact`, `icimodId`, `elevationM`, `historicalGlof`, `sourceUrl` (camel) next to
`district_id`, `downstream_population`, `area_km2` (snake). Put a comment saying so; it
reads as a style bug otherwise.

### The `district` varchar vs `district_id` uuid trap

`lakes.district` is NOT NULL varchar and **is still live-consumed**:
`src/lib/cryohealth-api.ts:53` maps CryoHealth-api's lake payload with
`district_id: l.district` — i.e. the public hazard map's "district_id" is really this
*text* column, coming over HTTP from CryoHealth-api. Meanwhile this repo's own admin list
(`listLakesAdmin`, `queries.ts:74`) returns the real `district_id` uuid, which
`admin.lakes.index.tsx:68` and `alerts.tsx:204` filter on.

⇒ Two consumers, two different columns, same conceptual field. If an admin edits
`district_id` and the text column isn't updated in the same statement, the admin table
and the public map disagree about which district a lake is in. **Decide and write it
down:** recommended — whenever `district_id` is in the patch, derive `district` inside
the same transaction (`SELECT name FROM districts WHERE id = $1`) and set both. On
create, require `district_id` and derive `district` the same way (precedent: #10 GATE
decision 2 made `glaciers.source` required though the column is nullable).

### `slug` is curated, not derived

Live values **[probed]**: `badswat`, `batura`, `ghulkin`, `khurdopin`, `passu`,
`shishper` — short handles, *not* slugifications of `name` ("Badswat glacial lake",
"Batura glacier snout ponds"). Auto-slugifying would produce data inconsistent with
every existing row. ⇒ **required free-text form field on create, and create-only (not editable).**
**[probed]** the reason it must not be editable: `CryoHealth-api/scripts/seed-lakes.ts:18-20`
upserts lakes with `INSERT ... ON CONFLICT (slug) DO UPDATE`, and
`scripts/seed-dev-data.ts:216,219` resolves lakes by `slug = 'shishper'` / `'khurdopin'`
to attach alerts. Renaming a slug here means the next seeder run **inserts a duplicate
lake** and the dev-data script silently attaches nothing. (Nothing routes by lake slug —
`grep -rn slug` in this repo returns only `protocols`/`chw` hits — so the only cost of
locking it is a rename nobody needs.)

Enforce with `lakeUpdateSchema = lakeCreateSchema.omit({ slug: true }).partial()`.
**[probed]** in zod 3.25.76: `.omit().partial()` preserves `.strict()` — an update body
containing `slug` gets `unrecognized_keys`, and so does one containing `currentTier`.

---

## 3. Postgres type → zod coercion table (the #10 F1/N1 lesson, applied to lakes)

The rule established by #10's verify loop: **`.coerce` only on Postgres `numeric`
columns** (postgres.js returns those as JS *strings* to avoid float precision loss, and
the edit dialog's `defaultValues` come straight from the GET payload). Never on
`integer`/`double precision`/required fields — `Number(null)`, `Number("")`, `Number([])`
are all `0`, which silently fabricates a value instead of 400ing (finding N1,
`src/lib/admin-schemas.ts:41-47` carries the comment).

**[probed]** actual JS types returned by postgres.js for a real lake row:

| Column | PG type | postgres.js returns | zod |
| --- | --- | --- | --- |
| `current_risk_score` | `numeric` | **string** (`"0"`) | n/a — LOCKED, never in a schema |
| `area_km2` | `numeric` | **string** \| null | `z.coerce.number().positive().nullable().optional()` ← the **only** writable field needing `.coerce` |
| `downstream_population` | `integer` | number (`0`) | `z.number().int().nonnegative()` — **NOT NULL, so no `.nullable()`** |
| `elevationM` | `integer` | number \| null | `z.number().int().nullable().optional()` |
| lat/lng (`ST_Y/ST_X(geom)`) | `double precision` (computed) | number | `z.number().min(-90).max(90)` / `.min(-180).max(180)` — **plain, never `.coerce`** (N1 verbatim; this is the no-fabricated-coordinates system) |
| `glacierContact`, `historicalGlof` | `boolean` | boolean | `z.boolean()` (NOT NULL, defaults exist) |
| `damType` | enum | string | `z.enum(["moraine","bedrock","ice","unknown"])` |
| `name`, `valley`, `slug`, `source` | varchar/text NOT NULL | string | `z.string().min(1)` |
| `nameUr`, `icimodId`, `sourceUrl` | varchar NULL | string \| null | `z.string().min(1).nullable().optional()` |
| `district_id` | uuid NULL | string \| null | `z.string().uuid()` (required on create per §2) |

Note `downstream_population` differs from #10's `districts.population` (nullable) — do
not copy `.nullable().optional()` across.

`z.enum(...).default(...)` is banned: #10 hit a zod↔`@hookform/resolvers` interop bug and
dropped `.default()` from `glacierSchema.status` (`docs/ai/TODO.md`, steps 5-7). Use the
form's `defaultValues` + the DB default instead.

---

## 4. The #10 pattern, file by file (what to copy)

### `src/lib/admin-schemas.ts`

- `districtCreateSchema` at `:10-22`, `districtUpdateSchema = districtCreateSchema.partial()` at `:25`.
- `glacierCreateSchema` at `:31-70`, `glacierUpdateSchema` at `:73`.
- `deleteReasonSchema` at `:77-79` — `z.object({ reason: z.string().trim().min(1) }).strict()`
  (the `.trim()` was finding N6: a whitespace-only reason satisfied `.min(1)` and would be
  written into a human-auditable audit row). **Reuse as-is — do not fork it.**
- The stub to replace, `src/lib/admin-schemas.ts:81-84`:
  ```ts
  /** currentTier and current_risk_score must never appear here — that's tier-policy
   *  output owned by CryoHealth-api's alert service, not an admin-editable field. */
  export const lakeSchema = z.object({}).strict();
  export type Lake = z.infer<typeof lakeSchema>;
  ```
  Replace with `lakeCreateSchema` / `lakeUpdateSchema` / `LakeCreate` / `LakeUpdate`
  (the `lakeSchema`/`Lake` names have zero importers today — **[probed]** `grep -rn
  "lakeSchema" src` → only this file — so renaming to match the district/glacier
  convention is free). Keep that comment and expand it.

### `src/lib/queries.ts`

- `writeAudit(sql, {actorId, action, entityType, entityId, reason?, meta?})` at
  `:295-310` — module-private (not exported), takes an existing `sql` handle so the audit
  INSERT enrolls in the caller's transaction. `audit.entityId` is `varchar` not uuid; pass
  strings.
- `createDistrict` `:312-337` — `db.begin(async sql => { INSERT ... RETURNING; writeAudit; })`.
- `updateDistrict` `:339-380` — SELECT `before` → `if (!before) return null` (that's the
  404 signal) → `UPDATE ... SET ${sql(patch)} ... RETURNING` → build a `changed` diff over
  `Object.keys(patch)` → `writeAudit(..., meta: {changed})`.
- `deleteDistrict` `:382-414` / `deleteGlacier` `:515-537` — count dependents in parallel
  inside the transaction, `throw new HasDependentsError(dependents)` if any > 0, then
  DELETE, `if (!rows[0]) return null`, then `writeAudit(..., reason)`.
- `HasDependentsError` is defined just above `writeAudit` (~`:280-289`) and exported.

### Route files

`src/routes/api/admin/districts.ts:10-52` (POST) and
`districts.$districtId.ts:10-49` (PUT) / `:50-86` (DELETE) are the template. The exact
sequence, in order, is: `requireAuth` → `requireRole(claims, ["cryohealth_admin","facility_admin"])`
in one try/catch returning `e.response` → `parseJsonBody` → `schema.safeParse` → 400 with
`parsed.error.issues` → (PUT only) `if (Object.keys(parsed.data).length === 0)` 400 "No
fields to update" → call the query fn → `if (!x) return 404` → try/catch with the inline
23505 branch → `mapDbError(err)` → rethrow.

### UI: `src/routes/admin.districts.tsx` (385 lines) — the canonical shape

- `DialogState = {mode:"create"} | {mode:"edit"; district: DistrictRow} | null` at `:60`.
- `dependentsMessage()` helper `:62-68` turning the 409 body's `dependents` map into
  "Cannot delete: still referenced by 3 alerts, 1 cases."
- three `useMutation`s `:88-149`, all using `authFetch` from `src/lib/auth-client.ts`,
  all `toast.success/error` + `qc.invalidateQueries`.
- Actions column `:204-217` (Edit / Delete `Button variant="outline" size="sm"`).
- `<DistrictFormDialog key={...id : "create"} .../>` at `:224-238` — the `key` forces a
  remount so `defaultValues` re-seed.
- `DeleteDistrictDialog` `:337-385` — AlertDialog + required reason `Input`, confirm
  disabled while `reason.trim().length === 0`.

`src/routes/admin.glaciers.index.tsx` is the richer form model (15 fields): `Select` for
the enum (`:~500`), the `NO_DISTRICT = "__none__"` sentinel for a nullable FK select
(`:~385`), and the number-input idiom that came out of findings F2/F3:
```tsx
value={field.value ?? ""}
onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
```
(`null`, not `undefined` — `JSON.stringify` drops `undefined`, so clearing a field would
silently no-op instead of clearing it.)

---

## 5. The geom problem — decide this before writing anything else

`sql(patch)` builds `"col"=$n` pairs only; it cannot emit
`geom = ST_SetSRID(ST_MakePoint($lng,$lat),4326)`. And `geom` is NOT NULL, so **create
cannot dodge it** — the INSERT must build the point explicitly.

**[probed]** against the live server with `.describe()` (Parse only — no rows touched):

| Probe | Result |
| --- | --- |
| `UPDATE lakes SET ${sql(patch)}, geom = ST_SetSRID(ST_MakePoint(${lng},${lat}),4326) WHERE id=${id} RETURNING id,name` | **PARSE-OK**, 7 params |
| `UPDATE lakes SET ${sql(patch)}${sql\`, geom = ...\`} WHERE ...` (nested fragment present) | **PARSE-OK**, 7 params |
| `UPDATE lakes SET ${sql(patch)}${sql\`\`} WHERE ...` (nested **empty** fragment) | **PARSE-OK**, 5 params |
| `UPDATE lakes SET ${sql({})}, geom = ... WHERE ...` (empty patch) | **PARSE-ERR: syntax error at or near ","** |
| `UPDATE lakes SET geom = ..., "updatedAt" = now() WHERE ...` (split statement) | PARSE-OK |
| `UPDATE lakes SET ${sql({damType:"moraine"})} WHERE ...` (enum via dynamic helper) | PARSE-OK |

**Recommended shape** — one statement, conditional nested fragment, and inject
`updatedAt` so the scalar patch is *never* empty (which makes the one failing case above
structurally unreachable):

```ts
const { lat, lng, ...cols } = patch;                    // lat/lng are not columns
const scalar = { ...cols, updatedAt: new Date() };      // always ≥1 key ⇒ sql(scalar) never empty
const geomFrag =
  lat !== undefined || lng !== undefined
    ? sql`, geom = ST_SetSRID(ST_MakePoint(${lng ?? before.lng}, ${lat ?? before.lat}), 4326)`
    : sql``;
const rows = await sql`
  UPDATE lakes SET ${sql(scalar)}${geomFrag}
  WHERE id = ${id}
  RETURNING id, name, ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lng, ...`;
```
`before` is already SELECTed for the audit diff in #10's `updateDistrict`/`updateGlacier`
shape — extend that SELECT with `ST_Y/ST_X(geom::geometry)` so a one-sided coordinate
edit can't half-move a lake. (Alternative, also fine and arguably stricter: a
`.refine()` on the update schema requiring `lat` and `lng` to be present or absent
together. Note `.refine()` returns a `ZodEffects`, so it must be applied *after*
`.partial()`, and it makes the update schema non-chainable afterwards.)

Audit diff caveats — three, all from #10's loop shape (`queries.ts:500-503`):
- Build `changed` over **`Object.keys(patch)` (the original), not `scalar`** — otherwise
  every audit row reports a bogus `updatedAt` change.
- `lat`/`lng` aren't in `Object.keys(patch)`-as-columns either, so add them to the diff
  explicitly; otherwise the audit row says "nothing changed" for the single most
  safety-relevant edit in this system.
- The `before` SELECT must cover **all 14 writable columns plus `ST_Y/ST_X(geom)`**, not
  #10's shorter hand-written list, or `before[key]` is `undefined` for any column the
  SELECT missed and the diff reports a phantom change on it.

`ST_MakePoint` argument order is **(lng, lat)** — `queries.ts:72` reads
`ST_Y(...) AS lat, ST_X(...) AS lng`, i.e. Y=lat, X=lng. Getting this backwards puts
Gilgit-Baltistan lakes in the Indian Ocean and nothing type-checks it.

---

## 6. The field lock — how to structurally exclude `currentTier` / `current_risk_score`

### Is there an existing "in the read type, out of the write schema" precedent?

Sort of, and it's weaker than #11 needs. `glacierCreateSchema` simply omits `id` and any
server-managed column; there is no `.pick()`/`.omit()` anywhere in the repo
(**[probed]** `grep -rn "\.omit(\|\.pick(" src` → no matches). The read types are
hand-written per page (`GlacierRow` in `admin.glaciers.index.tsx`, `LakeRow` at
`admin.lakes.$lakeId.tsx:29-46`) and are *unrelated* to the zod schemas. So the
established pattern is already "separate write schema, hand-written read type" — which is
exactly what #11 wants. **Do not** introduce a shared schema + `.omit()`; that creates a
type-level link where today there is none and makes it easy for a later `.omit()` removal
to reopen the hole.

### Layer 1 — `.strict()` gives a hard 400, and it survives `.partial()`

**[probed]** with the repo's own zod (3.25.76):
```
base   = z.object({name:z.string()}).strict()
partial= base.partial()
base.safeParse({name:'a',currentTier:'critical'})    -> success: false
partial.safeParse({name:'a',currentTier:'critical'}) -> success: false
issues: [{code:"unrecognized_keys", keys:["currentTier"], message:"Unrecognized key(s) in object: 'currentTier'"}]
```
So `lakeUpdateSchema = lakeCreateSchema.omit({slug:true}).partial()` (with `.strict()` on the base and
neither locked key present) already rejects `{"currentTier":"critical"}` with a 400
before any SQL is built. This is the DoD's requirement, satisfied.

**Choose 400, not silent-drop, and say so in PLAN.** The DoD accepts "rejected *or*
silently ignored"; 400 is strictly better (the caller learns the write didn't happen) and
it's what `.strict()` already does. Writing the choice down stops a later reviewer
"fixing" it into a `.strip()`.

### Layer 2 — an allowlist in `queries.ts`, because the DoD calls this security-critical

A schema-only defense means someone dropping `.strict()` in six months silently reopens
mass-assignment onto policy columns. Add, next to `updateLake`:

```ts
/** The ONLY columns an admin write may touch. currentTier and current_risk_score are
 *  absent by design — they are tier-policy output owned by CryoHealth-api's alert
 *  service (alerts.service.ts:103,141,183 are the only writers in the system). Nothing
 *  in this repo may SET them. */
const LAKE_WRITABLE_COLUMNS = ["name","nameUr","valley","district","district_id","damType",
  "glacierContact","icimodId","elevationM","historicalGlof","source","sourceUrl",
  "downstream_population","area_km2"] as const;
```
and filter `patch` through it before it reaches `sql(patch)`. Cheap, and it's the
difference between "validated" and "structurally cannot write".

Ownership is confirmed upstream **[probed]**: `currentTier` is written in exactly three
places, all in `CryoHealth-api/src/alerts/alerts.service.ts` (`:103`, `:141`, `:183`),
each alongside an audit/alert record. `current_risk_score` has **no writer anywhere** in
CryoHealth-api (it's a web-schema column added by `1785700000000-WebSchema.ts:33`) —
worth saying out loud in the UI note: it is currently `0` on all 6 lakes and will be
populated by the alert service, not by anyone here.

### Layer 0 (the one that will actually bite) — the form must not *send* the locked fields

react-hook-form's `handleSubmit` passes **the whole values object, i.e. every key present
in `defaultValues`**, regardless of whether an input is bound to it. `readOnly` /
`disabled` on an `<Input>` inside a `FormField` does **not** remove the key from the
submitted payload. So the obvious implementation of the DoD — "seed `defaultValues` from
the GET row so the read-only tier/risk-score render" — makes **every PUT 400** with
`unrecognized_keys`. That is the exact shape of #10's blocking finding F1 (edit broken by
a field the user never touched), and it would be found by the same kind of manual test
that missed F1.

**Rule to carry into Step 4, and to verify:** *the edit form's submitted key set must
equal `lakeUpdateSchema`'s key set, exactly.*
- `currentTier` / `current_risk_score`: render read-only straight off `bundle.lake` in
  plain JSX (`<TierBadge tier={lake.current_tier} />`, a `<div>` for the score) — never
  in `useForm`'s `defaultValues`, never a `FormField`.
- `slug`: in `defaultValues` for the **create** dialog only (it's create-only, §2). With
  a shared dialog component, build `defaultValues` conditionally
  (`...(initial ? {} : { slug: "" })`) and register the `slug` `FormField` only when
  `initial === null` — or ship two thin wrappers over a shared field set, which is
  harder to get wrong.
- Everything else: exactly the 14 writable keys.

### The definitive three-way field split (so `.strict()` doesn't 400 on something intended)

- **Writable (14):** `name`, `nameUr`, `valley`, `district_id` (+ derived `district`),
  `damType`, `glacierContact`, `icimodId`, `elevationM`, `historicalGlof`, `source`,
  `sourceUrl`, `downstream_population`, `area_km2`, `lat`/`lng` → `geom`.
- **Locked (2, the DoD's subject):** `currentTier`, `current_risk_score`.
- **Create-only:** `slug` (see §2).
- **Deliberately not offered (name them so they aren't re-litigated mid-build):**
  `stale` (boolean flag with no writer anywhere — **[probed]**, only declared at
  `CryoHealth-api/src/lakes/entities/lake.entity.ts:53`; a lake that is stale-or-not is
  an observation-freshness fact, not admin input), `boundary` (Polygon geometry — no
  editor exists and hand-typing WKT is not a form), `id`, `createdAt`, `updatedAt`
  (server-set, §5).

---

## 7. Delete: dependents, and the one FK Postgres will actually enforce

FKs referencing `lakes` (from `\d lakes`):

| Table | Column | ON DELETE | Live rows **[probed]** |
| --- | --- | --- | --- |
| `observations` | `"lakeId"` | CASCADE | 0 |
| `hazard_scores` | `"lakeId"` | CASCADE | 0 |
| `lake_risk_scores` | `lake_id` | CASCADE | 0 |
| `alerts` | `"lakeId"` | SET NULL | **3** (of 4 alerts) |
| `facilities` | `"lakeId"` | **NO ACTION** | 0 |

Two things follow:

1. **The 409 branch is live-testable without inserting anything** — unlike #10, which had
   to hand-insert a `glacier_observations` row. **[probed]** distribution:
   `shishper` (2 alerts), `khurdopin` (1), and `batura`/`badswat`/`passu`/`ghulkin` (0).
   So: delete `passu` → 200 happy path; delete `shishper` → 409 with `{alerts: 2}`.
   (Then restore `passu` — the seed rows are cited-source hazard data, see
   `no fabricated hazard data` rule; recreating it must reuse the exact original values.
   Safer: snapshot the row with psql before the test, or run the 200-path delete against
   a lake *you created* in the same session and only ever exercise 409 against seeded ones.)
2. **`facilities` is `NO ACTION`** — the first FK in this project where Postgres itself
   will refuse the DELETE (everything in #10 was SET NULL/CASCADE). The pre-check still
   runs first and returns the friendly 409, but note that `mapDbError`'s 23503 text
   (`src/lib/api-errors.ts:22`, "Invalid reference: the related record does not exist")
   is create/update-shaped and reads backwards if a 23503 ever surfaces on the DELETE
   path. Either widen that message or catch 23503 separately in the DELETE handler.

Guard all five counts anyway: `observations`/`hazard_scores`/`lake_risk_scores` cascade,
and silently destroying CryoHealth-geo pipeline output is exactly what
`docs/admin-portal-prd.md:130-131` classifies as view+audit-only.

---

## 8. Unique constraints — #10's single hardcoded 23505 message is not enough

`lakes` has **two** unique constraints: `UQ_3e4dcf48c0eeef0d135932dd36d` on `slug` and
`UQ_725a4ca381cc90f5d6822852184` on `"icimodId"`. `districts.ts:42-47` hardcodes a
name-collision message for any 23505; copying that verbatim gives a user who typed a
duplicate ICIMOD ID a message about the lake's name.

postgres.js exposes the constraint name as `err.constraint_name`
(`node_modules/postgres/src/connection.js:46`, field code 110). Branch on it, and keep
the `?.` null-guard finding N2 added (`(err as {code?:string})?.code`).

---

## 9. The UI — what exists and what changes

### `src/routes/admin.lakes.tsx` (5 lines) — Outlet parent, do not touch
```tsx
export const Route = createFileRoute("/admin/lakes")({ component: () => <Outlet /> });
```
Exactly the `admin.glaciers.tsx` situation #10's plan flagged. The list page is
`admin.lakes.index.tsx`.

### `src/routes/admin.lakes.index.tsx` (195 lines) — list, needs create + delete
Today: `useQuery(["admin-districts"])` `:39-46` and `useQuery(["admin-lakes"])` `:47-58`
(fetching `/api/public/lakes-admin`), tier/district/search filters `:66-71`, and a
6-column table `:134-191` with **no Actions column**. Header copy at `:77-80` already
says "tier and risk score are policy output … not editable here".
Add: "New lake" button + create Dialog, Actions column (Edit → link/dialog, Delete →
AlertDialog with required reason), `dependentsMessage()`, three `useMutation`s. `colSpan`
6 → 7 at `:150` and `:157`.

### `src/routes/admin.lakes.$lakeId.tsx` (308 lines) — detail, gets the edit form per the DoD
Today: `useQuery(["admin-lake", lakeId])` `:71-78` → `/api/public/lakes/${lakeId}`;
Tabs Overview/Risk scores/Hazard scores `:123-296`; `<Meta>` helper `:301-308`.

Where the two locked fields render today:
- `TierBadge` in the page header — `:120`
  `<TierBadge tier={lake.current_tier} solid={lake.current_tier === "CRITICAL"} />`
- Risk score `StatCard` — `:132-137`
  `value={lake.current_risk_score != null ? Number(lake.current_risk_score).toFixed(0) : "—"}`
  (the `Number(...)` is there precisely because it's `numeric`-as-string).

Changes needed:
- Add an "Edit lake" button (header) opening the same `LakeFormDialog` the list uses.
- Inside the dialog, render tier + risk score as **disabled/read-only** fields with the
  note. Reuse `TierBadge` (`src/lib/tier.tsx:78`) rather than re-deriving colors — that's
  the repo's single source of truth for tier styling. Suggested note text: *"Tier and risk
  score are set by CryoHealth-api's alert service from hazard-score runs. They're
  read-only here by design — this form will not send them, and the API rejects them if
  they're sent."*
- **`LakeRow` at `:29-46` is missing fields the form needs as `defaultValues`:** `slug`,
  `nameUr`, `district_id`, `lat`, `lng`, `downstream_population` is there, `area_km2` is
  there. `getLakeDetail` selects `l.*` plus `lat`/`lng`/`current_tier`/`elevation_m`
  aliases (`queries.ts:82-91`) so they're **already in the payload** — only the TS type
  needs extending, no query change.
- The detail page **does not fetch districts** — the district `Select` needs a
  `useQuery(["admin-districts"])`, same 8 lines as `admin.lakes.index.tsx:39-46` (the
  query key matches, so react-query dedupes).
- Note `getLakeDetail`'s `l.*` also returns raw `currentTier` (lowercase `'watch'`) next
  to the uppercase `current_tier` alias. Use the alias; ignore the raw one.

**UI placement summary (this inverts #10):** edit form on the **detail** page (DoD, and
it's where the locked fields + their explanation naturally live); create + delete on the
**list** page. Extracting `LakeFormDialog` into a shared component used by both pages is
the clean move; a second copy is the cheap one — name the choice in PLAN.

---

## 10. Other #10 findings that carry over

- **`tsc --noEmit` cannot verify HTTP verb dispatch.** #10 probed the installed
  `@tanstack/react-start` types and a garbage `BOGUS:` handler key compiled clean.
  `server.handlers` is loosely typed. The DoD's verification command proves nothing about
  PUT/DELETE actually firing — only live curl does.
- **`src/lib/api-errors.ts`** (`parseJsonBody` `:4-12`, `mapDbError` `:18-30`) exists
  because F4/F5/F6 found malformed JSON / bad FK / bad UUID path params all 500'd with an
  HTML page. Wire both into all three new handlers from the start.
- **GATE decision 1 (#10, approved):** `audit.reason` is **required on DELETE only**;
  create/update leave `reason` NULL and record substance in `meta` as a field diff
  (`meta: {changed: {name: {from, to}}}`). #11 inherits this verbatim — don't re-litigate.
  Audit naming: action `lake.create` / `lake.update` / `lake.delete`, entityType `Lake`.
- **Finding N1 (must not be re-broken):** `.coerce` only on `numeric` columns. For lakes
  that's `area_km2` and nothing else writable.
- **Finding N6:** `deleteReasonSchema` already `.trim()`s — reuse it, don't re-declare.
- **Open follow-ups from #10, still open, do not re-fix here:** #34 (delete-guard TOCTOU
  — count-then-delete isn't serializable), #35 (districts table doesn't show population),
  #36 (DELETE-with-a-JSON-body as the reason transport). #11 inherits #34 and #36 by
  construction; say so rather than silently diverging.
- **Role gating:** `["cryohealth_admin", "facility_admin"]` on every write endpoint
  (settled in #10, four converging sources).
- **No migrations in this repo, ever** — every column #11 needs already exists.
- Local branch `main` is ahead of `origin/main` by many commits (unpushed since task #9);
  unrelated to this task, but don't be surprised.

---

## 11. Proposed plan steps (one atomic commit each, with a verification command)

Pre-flight (no commit): `bunx tsc --noEmit && bun run lint` green;
`docker ps | grep cryohealth-api-db-1`; snapshot row counts
(`lakes=6, alerts=4 (3 with lakeId), audit=54, districts=2`); `bun dev`; obtain tokens
for `cryohealth_admin`, `facility_admin`, `chw` (login is this repo's own
`POST /api/auth/login`, body `{identifier, password}` where `identifier` matches
`users."lhwId"` OR `users.phone` — `src/routes/api/auth/login.ts:10,24`; there is no
`email` column. #10 used `admin-001`/`1234`, `facility-001`/`1234`, `chw-001`/`1234`).
*Verify:* baseline green, three tokens in hand, counts match.

**Step 1 — `src/lib/admin-schemas.ts`: replace the `lakeSchema` stub with
`lakeCreateSchema`/`lakeUpdateSchema`.** Keys = DB column names verbatim; `.strict()`;
`.coerce` only on `area_km2`; `district_id` + `slug` + `source` required on create;
`lakeUpdateSchema = lakeCreateSchema.omit({slug:true}).partial()`; the two locked columns absent, with an expanded comment saying why and citing
`alerts.service.ts:103,141,183`.
*Verify:* `bunx tsc --noEmit` + a scratch node script asserting all four:
`lakeUpdateSchema.safeParse({currentTier:"critical"}).success === false` (issue code
`unrecognized_keys`); same for `{current_risk_score: 99}` and `{slug: "x"}`; a valid full
create payload parses; and — the one that catches the §6 Layer-0 trap — **the exact object
the edit form will submit** (copy it out of the Step 4 `defaultValues`) parses
successfully, including `area_km2` arriving as the string postgres.js returns.

**Step 2 — `src/lib/queries.ts`: `createLake`/`updateLake`/`deleteLake` +
`LAKE_WRITABLE_COLUMNS`.** Transactional; geom built with `ST_SetSRID(ST_MakePoint(lng,lat),4326)`;
`updatedAt` injected into every patch; `district` text derived from `district_id` in the
same transaction; delete guard counts all five dependent tables; audit written inside the
transaction.
*Verify:* `bunx tsc --noEmit`; then a scratch node script (not committed) that
`.describe()`s the composed UPDATE (Parse-only, no writes) for the four shapes: scalars
only, scalars+coords, coords only, empty-after-filter.

**Step 3 — `src/routes/api/admin/lakes.ts` (POST) + `lakes.$lakeId.ts` (PUT/DELETE).**
Copy the districts handler sequence exactly; 23505 branched on `err.constraint_name`
(slug vs icimodId).
*Verify (this is the DoD's real test, `tsc` proves nothing here):*
```
# lock — all three must be 400, and #3 must leave `name` unchanged
curl -X PUT .../api/admin/lakes/$ID -H "Authorization: Bearer $ADMIN" \
  -d '{"currentTier":"critical"}'                       # -> 400 unrecognized_keys
curl -X PUT ... -d '{"current_risk_score":99}'           # -> 400
curl -X PUT ... -d '{"name":"LOCK TEST","currentTier":"critical"}'  # -> 400 AND name NOT applied
psql: SELECT name,"currentTier",current_risk_score FROM lakes WHERE id='$ID';  # unchanged
psql: SELECT count(*) FROM audit WHERE "entityId"='$ID';                       # unchanged (rollback proof)
# matrix: 401 no token, 403 chw token, 400 empty body, 400 bad UUID param,
#         200 update (psql confirms updatedAt bumped, currentTier untouched, audit row present),
#         409 delete on 'shishper' (2 alerts) with counts, 200 delete on a lake created in this session
```

**Step 4 — `admin.lakes.$lakeId.tsx`: edit Dialog with the two locked fields read-only +
note.** Extend `LakeRow`, add the districts query, add the "Edit lake" button.
*Verify:* `bunx tsc --noEmit && bun run lint`; in the browser, edit a lake, confirm the
tier/risk-score values render read-only with the note; **confirm in the Network tab that
the PUT body contains neither locked key nor `slug`** (§6 Layer 0 — this is the check that
would have caught #10's F1 class of bug); confirm the edit succeeds on a lake with a
non-null `area_km2` (numeric-as-string round-trip, F1 proper); confirm page and psql both
reflect the change and `currentTier`/`current_risk_score` are byte-identical after.

**Step 5 — `admin.lakes.index.tsx`: Actions column + create Dialog + delete AlertDialog.**
*Verify:* `bunx tsc --noEmit && bun run lint`; create a lake end-to-end (all NOT NULL
fields), delete it, delete `shishper` → friendly "still referenced by 2 alerts";
`SELECT action,"entityType",reason FROM audit ORDER BY "createdAt" DESC LIMIT 5` shows
`lake.create`/`lake.update`/`lake.delete` with reason only on delete.

**Step 6 — cleanup: `graphify update .`, TODO.md, final DoD command.**
*Verify:* `bunx tsc --noEmit && bun run lint && bun run build` clean; row counts back to
baseline (lakes=6); no seeded lake mutated (diff a psql dump of all 6 rows against the
pre-flight snapshot).

---

## 12. Risks / assumptions that would change this plan if wrong

1. **`sql(patch)` + nested fragment composition for `geom`.** Parse-verified, not
   execute-verified — a Parse-clean statement can still misbehave on binding. Step 2 must
   live-probe an actual round-trip inside a transaction before the shape is committed
   (#10 did the same for `sql.begin` + dynamic SET). *If wrong:* fall back to two
   statements inside the one `db.begin` (probe E parsed fine), or drop lat/lng from
   UPDATE for this task and ship coordinate edits as a follow-up.
2. **`damType` enum through the dynamic helper.** Parsed fine, but this repo has a
   recorded enum-cast footgun (the `upper(tier)` bug in auto-memory). *If wrong:* pass
   `damType` outside `sql(patch)` with an explicit `::dam_type` cast.
3. **`district` text sync.** Assumes admins pick a district from the FK dropdown. If the
   text column is meant to hold something the districts table doesn't have (a sub-valley
   name), deriving it is wrong and it needs its own form field. Two seeded lakes have
   `district` values ("Ghizer", "Hunza") that do match district names — assumption looks
   safe, but it is an assumption.
4. **Create is genuinely risky data-entry** under the no-fabricated-hazard-data rule: a
   hand-typed lake carries coordinates and a source string. `source` is already NOT NULL
   in the DB (unlike glaciers, where #10 had to add the requirement), so the rule is
   enforced by the schema — but the form helper text should say what a good `source`
   looks like, mirroring `admin-schemas.ts:60-62`.
5. **`slug` create-only** — if a reviewer wants it editable, `UQ` collisions and any
   external consumer of the slug (CryoHealth-api's lake routes use it) come into scope.
6. **The 200-path delete test destroys real seeded hazard data** unless it's run against
   a lake created during the session. Plan it that way, and snapshot all 6 rows before
   any write. **If POST is cut (risk 7), that lake doesn't exist** — fall back to
   inserting a throwaway lake directly via psql (`INSERT INTO lakes (slug,name,valley,
   district,"damType",source,geom) VALUES (...)`, the column list
   `CryoHealth-api/scripts/seed-lakes.ts:18` uses), exactly as #10 hand-inserted a
   `glacier_observations` row to exercise its 409 branch. Never test the 200 path against
   `shishper`/`khurdopin`/`badswat`/`passu`/`ghulkin`/`batura`.
7. **`size:m` is optimistic again** (#10's own sizing note said so and it ran long). Cut
   line, pre-authorized: ship PUT/DELETE + the locked-field UI (the DoD's actual subject)
   first; POST/create — which carries the five NOT NULL columns, slug, and the
   district-text derivation — becomes a same-priority follow-up if the loop budget is
   under pressure. The DoD itself calls POST "already partially covered", so it is the
   softest part of the scope.
