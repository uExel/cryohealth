# Task #10 findings — CRUD: Districts + Glaciers

Issue: https://github.com/uExel/cryohealth/issues/10 · labels `type:task` `prio:p1` `size:m` ·
milestone "G3 — CryoHealth admin portal — sidebar CRUD + platform monitoring" · depends on #6.

## Headline

**#10 is the repo's first UPDATE, first DELETE, first zod validation, and first `audit` write —
four net-new capabilities in one task.** #6–#9 shipped read-only views; every write endpoint on
disk today (`api/public/alerts.ts` POST, `api/public/cases.ts` POST, `api/public/alert-acks.ts`
POST) is insert-only, unvalidated (`as { … }` cast), and non-audited. Everything #11–#16 does
inherits whatever shape lands here.

| Capability | State today |
| --- | --- |
| `PUT`/`DELETE` server handlers | **Zero precedent.** Every `server.handlers` block on disk is GET and/or POST. Type-level check is *useless* here — see §1 trap T1. |
| zod validation | `src/lib/admin-schemas.ts` **already exists** (commit `b85dbd6`), with `districtSchema`/`glacierSchema` as `z.object({}).strict()` stubs explicitly reserved for "#10–#19". Filling them is the intended path, not a new dependency. |
| `audit` writes | **Never written from this repo.** 1 live row, written by CryoHealth-api. `queries.ts` has no `audit` reference at all. |
| Delete safety at the DB level | **Non-existent.** Every FK into `districts` is `ON DELETE SET NULL` (5 of them) and the only FK into `glaciers` is `ON DELETE CASCADE`. The DB will *never* refuse a delete. See §4 — this is the headline trap. |
| `Dialog` / `AlertDialog` / `Form` | All three files exist in `src/components/ui/`, fully exported, and are **used by zero app code** (only `command.tsx` imports `dialog`). `react-hook-form@7.73.1`, `@hookform/resolvers@5.2.2`, `zod@3.25.76` are installed. `<Toaster richColors />` is already mounted at `src/routes/__root.tsx:154`. |
| Transactions | No `sql.begin` anywhere in `queries.ts` (278 lines of single statements). |

Five findings materially shape the task:

1. **An unguarded glacier DELETE silently destroys pipeline output the PRD forbids the portal
   from mutating.** `glacier_observations.glacier_id` is `ON DELETE CASCADE`, and
   `docs/admin-portal-prd.md:128` classifies `glacier_observations` as **"View + audit-only —
   CryoHealth-geo pipeline output — editing here would silently diverge from the Sentinel-2 run
   that produced it."** A pre-check + 409 is *forced by the PRD*, not a judgment call. §4.
2. **An unguarded district DELETE silently NULLs five tables.** `alerts.district_id`,
   `cases.district_id`, `chw_profiles.district_id`, `glaciers.district_id`, `lakes.district_id`
   are all `ON DELETE SET NULL`. Deleting a district orphans alerts and clinical cases with no
   error and no recovery path. Same forced pre-check. §4.
3. **The DoD names `admin.glaciers.tsx` as the modal host — that file is a 4-line `Outlet`
   parent.** The glaciers table lives in `admin.glaciers.index.tsx`. §1, trap T2.
4. **`tsc` cannot catch a wrong HTTP verb.** A probe against the installed
   `@tanstack/react-start` types (see §1) compiles `PUT`, `PATCH`, `DELETE` **and a garbage
   `BOGUS:` key** with zero errors — `server.handlers` is loosely typed. The DoD's
   `bunx tsc --noEmit` gives *no* signal that PUT/DELETE dispatch at runtime. Step 0 must prove
   it with a live request. Trap T1.
5. **Both admin pages use bare `fetch` and share the `["admin-districts"]` query key.**
   `admin.districts.tsx:29` and `admin.glaciers.index.tsx:47` both use `queryKey: ["admin-districts"]`.
   Writes must use `authFetch` (`src/lib/auth-client.ts:51`) and invalidate both keys. §7.

Two GATE items (§9): the `reason` policy (D1) and requiring `source` on hand-created glaciers (D2).
Role gating is **settled, not a GATE item** (§8).

---

## 1. Exact current state of the four route files

| File | Lines | State |
| --- | --- | --- |
| `src/routes/admin.districts.tsx` | 88 | **Real table, shipped in #6.** `useQuery({queryKey:["admin-districts"]})` → bare `fetch("/api/public/districts")` → `.districts ?? []`. Renders exactly **2 columns: Name, Province** (`:60-61`), `colSpan={2}` on loading/empty rows. `type DistrictRow = { id: string; name: string; province: string }` (`:19`). Header shows `{districts?.length ?? 0} districts`. No detail route, no `.index`/`.$districtId` siblings — it is a **leaf route**. |
| `src/routes/admin.glaciers.tsx` | 5 | `component: () => <Outlet />`. Nothing else. **Not the table.** |
| `src/routes/admin.glaciers.index.tsx` | 208 | **Real table + filters, shipped in #6.** Route id `"/admin/glaciers/"`. Two `useQuery`s: `["admin-districts"]` (same key as above) and `["admin-glaciers"]` → `fetch("/api/public/glaciers")`. Client-side filter state: `search` (name substring), `districtFilter`, `statusFilter` over `["ALL","stable","retreating","surging","advancing","unknown"]` (`:41-43`, `:130`). 8 columns: Glacier (a `<Link to="/admin/glaciers/$glacierId">`), District (resolved via `districtById` memo), Area km², Length km, Elev. range, Status (`<StatusPill>`), RGI ID, Observed. `colSpan={8}`. |
| `src/routes/admin.glaciers.$glacierId.tsx` | 212 | **Read-only detail page, shipped in #7.** `useQuery(["admin-glacier", glacierId])` → `fetch("/api/public/glaciers/{id}")`. Renders Metadata block (`:127-137`): GLIMS ID, Coordinates, Source, Last observed, Notes. Plus observations / associated-lakes / disaster-cases sections. |

`src/components/cryohealth/AdminShell.tsx:26-34` — the "Hazard data" nav group holds
`{to:"/admin/districts"}`, `{to:"/admin/glaciers"}`, `{to:"/admin/lakes"}` and is **`adminOnly: false`**,
i.e. visible to `facility_admin` as well as `cryohealth_admin`. `src/routes/admin.tsx:30-47` gates the
whole `/admin` subtree on `isAdmin`, which `src/lib/auth.tsx:44` defines as
`role === "cryohealth_admin" || role === "facility_admin"`.

### Trap T1 — `tsc` will not catch an unsupported HTTP verb

Probe run against the installed `@tanstack/react-start` + `@tanstack/react-router` types
(scratchpad, isolated tsconfig, `strict: true`):

```ts
import "@tanstack/react-start";           // ← required: `server` key comes from Start's augmentation,
import { createFileRoute } from "@tanstack/react-router";  //   not react-router's own route options
export const Route = createFileRoute("/api/admin/districts")({
  server: { handlers: {
    GET: …, POST: …, PUT: …, PATCH: …, DELETE: …,
    BOGUS: …,          // ← THIS ALSO COMPILES WITH ZERO ERRORS
  } },
});
```

Result: **0 errors, including for `BOGUS`.** The handlers record is loosely typed. Therefore the
DoD's `bunx tsc --noEmit` proves nothing about verb support — **a typo'd or unsupported verb key
is silently ignored at build time and simply never dispatches at runtime.** The only proof a
`DELETE:` handler works is calling a route that declares one, which first exists at Step 3.

This is a *verification-gap* finding, not a plan-shape risk. The PRD already assumes verb support:
`docs/admin-portal-prd.md:114-115` specifies `api/admin/` files "each following the exact scaffold
at `api/public/alerts.ts`" and names `lakes-admin.ts` as "GET-only today despite its name — a
natural first file to extend with **PUT/DELETE**."

> **Do not probe this with `curl -X DELETE /api/public/alerts`.** That route declares only GET and
> POST, so the response describes *unhandled-method fallback*, not handler dispatch — a
> non-signal that will read as a failure and burn a fix-loop. Test it in Step 3, against the
> district route you just wrote.

(Secondary note from the probe: omitting `import "@tanstack/react-start"` makes `server` itself an
unknown property. That import is *not* needed in real route files because the project tsconfig
pulls the augmentation in globally — do not add it.)

### Trap T2 — the DoD's filename for the glacier modals is wrong

The issue says the create/edit modals go on `admin.glaciers.tsx`. That file is a 4-line
`Outlet` parent (see table above). **Putting a component there blanks the entire `/admin/glaciers`
subtree, including the detail page.** The glacier table + modals belong in
`src/routes/admin.glaciers.index.tsx`. This is the mirror image of #9's "do not convert these
into an Outlet parent" note — here, do not *use* the Outlet parent as a page.

---

## 2. The scaffold to follow — `src/routes/api/public/alerts.ts`

Full file, 46 lines. The exact shape every `api/admin/*` handler must copy:

```ts
POST: async ({ request }) => {
  let claims;
  try {
    claims = await requireAuth(request);
    requireRole(claims, ["cryohealth_admin", "facility_admin"]);
  } catch (e) {
    if (e instanceof AuthError) return e.response;
    throw e;
  }
  const body = (await request.json()) as { … };   // ← #10 replaces this cast with a zod parse
  await insertAlert({ …, issuedById: claims.sub });
  return Response.json({ ok: true });
},
```

Note the `let claims;` **declared outside the try** — that is deliberate and required, because
`claims.sub` is needed after the block. `api/admin/cases.ts` (#9, the only file in `api/admin/`
today) declares it inside the try because it never uses the claims. #10 needs the `alerts.ts`
form, since `claims.sub` becomes `audit.actorId`.

`src/lib/auth-guard.ts`:
- `requireAuth(request): Promise<JwtPayload>` — `:17`. Reads `authorization: Bearer …`, verifies
  via `jose`. Throws `AuthError` wrapping a **401** on missing/malformed header or bad signature.
- `requireRole(claims, roles: Role[]): void` — `:33`. Throws `AuthError` wrapping a **403** if
  `claims.role` not in `roles`. Synchronous, no `await`.
- `AuthError` — `:5`, carries `.response`.
- `JwtPayload = { sub: string; role: Role; name: string }` (`src/lib/jwt.ts:4`).
  `Role = "cryohealth_admin" | "facility_admin" | "chw" | "viewer"` (`:3`).

**Validation precedent today: none.** All three existing POST handlers do a bare cast:
`api/public/alerts.ts:24`, `api/public/cases.ts:20`, `api/public/alert-acks.ts:19`. The only
hand-rolled check anywhere is `api/auth/login.ts:15-17` (`if (!identifier || !password) → 400`).
So the 400-on-invalid-body response shape is genuinely unestablished; #10 sets it.

### The existing zod file — read it before writing anything

`src/lib/admin-schemas.ts` (committed at `b85dbd6`, currently imported by nobody):

```ts
export const districtSchema = z.object({}).strict();
export type District = z.infer<typeof districtSchema>;
export const glacierSchema = z.object({}).strict();
export type Glacier = z.infer<typeof glacierSchema>;
```

Its own header comment: *"Per-resource zod schemas for the admin CRUD API (tasks #10-#19). Empty
`.strict()` stubs for now — `.strict()` rejects any payload until a CRUD task fills in real
fields."* **zod is not a new pattern to introduce and is not a size-risk** — the file, the
dependency (`zod@3.25.76`), and the intent are already in the repo. Nothing imports the inferred
types yet, so filling the stubs cannot break existing code.

> **Constraint:** `admin-schemas.ts` is imported by client-side `Form` components. It must never
> import `@/lib/db` or `@/lib/queries` — `postgres.js` needs Node's `net`/`tls` and would poison
> the client bundle (`src/lib/db.ts:3-4`, `src/lib/queries.ts:3-4`).

---

## 3. The `audit` table — exact live schema

Verified live against Postgres `:5433` (`\d audit`):

```
   Column   |           Type           | Nullable |      Default
------------+--------------------------+----------+--------------------
 id         | uuid                     | not null | uuid_generate_v4()
 actorId    | uuid                     |          |                     ← FK → users(id), NO on-delete rule
 action     | character varying        | not null |
 entityType | character varying        | not null |
 entityId   | character varying        |          |                     ← varchar, NOT uuid
 reason     | text                     |          |
 meta       | jsonb                    |          |
 createdAt  | timestamp with time zone | not null | now()
Foreign-key constraints:
    "FK_0de728fd71d24466b7b4f00f49c" FOREIGN KEY ("actorId") REFERENCES users(id)
```

- **Quoted camelCase columns.** `"actorId"`, `"entityType"`, `"entityId"`, `"createdAt"` must be
  double-quoted in raw SQL or Postgres folds them to lowercase and errors. Same hazard already
  handled in `insertAlert` (`queries.ts:165` quotes `"lakeId"`, `"issuedById"`).
- **Only `action` and `entityType` are NOT NULL.** `actorId`, `entityId`, `reason`, `meta` are all
  nullable. `id` and `createdAt` default — never supply them.
- **`actorId` FK to `users(id)` with no ON DELETE clause** ⇒ implicit `NO ACTION`. Inserting an
  audit row for a `claims.sub` that is not a live `users.id` throws `23503`. This is reachable:
  a token minted by CryoHealth-api for a since-deleted user still verifies here (shared
  `JWT_SECRET`, no request-time user lookup — workspace `CLAUDE.md` gotcha). Low probability,
  worth a comment, not worth a pre-check.
- **`entityId` is `varchar`, not `uuid`** — pass the id as a string, no cast needed.

### This repo has never written an audit row

`grep -n "audit" src/lib/queries.ts` → no matches. `src/routes/admin.audit.tsx` is a
`cryohealth_admin`-gated `<AdminPlaceholder title="Audit log" />` (14 lines) — it reads nothing.
**#10 is `cryohealth`'s first write to `audit`.**

### Naming convention — settled by the single live row, do not invent one

```
 action      | entityType | entityId  | reason
-------------+------------+-----------+---------------------------------------------------
 alert.issue | Alert      | f4438496… | Migration + column-mapping verification smoke test
```

Written by `CryoHealth-api/src/alerts/alerts.service.ts:143`. Other call sites there:
`'alert.clear'` (`:168`), `'alert.override'` with `meta: {fromTier, toTier}` (`:185`).

⇒ **`action` = `<lowercase-entity>.<verb>`, `entityType` = PascalCase singular.**
For #10: `district.create` / `district.update` / `district.delete` with `entityType: "District"`,
and `glacier.create` / `glacier.update` / `glacier.delete` with `entityType: "Glacier"`.

### Atomicity — the template-defining decision

`alerts.service.ts:161-194` wraps the mutation *and* its audit row in
`this.dataSource.transaction(async (manager) => …)`. `cryohealth`'s `queries.ts` has **no
`sql.begin` anywhere** — 278 lines of single statements. `postgres@3.4.9` supports
`sql.begin(async (sql) => { … })`, and `getDb()` (`src/lib/db.ts:60`) returns the raw `postgres`
instance, so `(await getDb()).begin(…)` is available on both the dev path (discrete `DB_*` vars)
and the Hyperdrive path.

> **Shape the helper to compose, not to self-connect.** Signature must take an existing handle:
> `writeAudit(sql, { actorId, action, entityType, entityId, reason, meta })` — **not** a function
> that calls `getDb()` itself. A self-connecting helper cannot be enrolled in the caller's
> transaction, and every task #11–#16 would inherit non-atomic audit (a delete that succeeds with
> no audit trail, or an audit row for a delete that rolled back).
>
> Hyperdrive risk: Hyperdrive pools connections. `sql.begin` pins a connection for the txn's
> duration and is supported, but this is the repo's first transaction — confirm a trivial
> `sql.begin` round-trips under `bun dev` before the pattern is baked into six functions.
>
> **Named fallback if `sql.begin` misbehaves — use this, do not invent non-atomic audit.** A
> single-statement writeable CTE is atomic by definition and needs no transaction:
> ```sql
> WITH d AS (
>   DELETE FROM districts WHERE id = ${id} RETURNING id
> )
> INSERT INTO audit ("actorId", action, "entityType", "entityId", reason, meta)
> SELECT ${actorId}, 'district.delete', 'District', d.id::text, ${reason}, ${meta}
> FROM d;
> ```
> The same shape works for `INSERT … RETURNING` and `UPDATE … RETURNING`. It costs the composable
> `writeAudit(sql, …)` helper (the audit insert becomes inline per function), so prefer
> `sql.begin`; but under time pressure this is the correct degradation, **never** "mutate, then
> audit in a second statement and hope".

---

## 4. `districts` / `glaciers` schemas and the delete problem

All verified live against Postgres `:5433`.

### `districts` — 2 live rows

```
    Column    |           Type           | Nullable |         Default
--------------+--------------------------+----------+--------------------------
 id           | uuid                     | not null | uuid_generate_v4()
 name         | text                     | not null |
 province     | text                     | not null | 'Gilgit Baltistan'::text
 population   | integer                  |          |
 centroid_lat | double precision         |          |
 centroid_lng | double precision         |          |
 created_at   | timestamp with time zone | not null | now()
Indexes:
    "PK_districts" PRIMARY KEY, btree (id)
    "UQ_districts_name" UNIQUE CONSTRAINT, btree (name)
```

- **`UQ_districts_name`** ⇒ create/rename can throw Postgres `23505`. CryoHealth-api already has
  the constant and the mapping (`alerts.service.ts:25` `POSTGRES_UNIQUE_VIOLATION = '23505'` →
  `ConflictException` at `:173-177`). Mirror it: catch `err.code === "23505"` → `409` with a
  human message ("A district named X already exists."), never a 500.
- **`population`, `centroid_lat`, `centroid_lng` are nullable and are NOT rendered by
  `admin.districts.tsx` today** (it shows only Name + Province). The form may expose them —
  optional/nullable in the schema — but the table needs new columns if it does. Cheapest correct
  scope: form collects `name`, `province`, and optionally `population`; table gains no columns.
- **No CHECK constraints on `districts`** (verified: `pg_constraint … contype='c'` → 0 rows).
  `province` is free text with a default; do **not** hard-code a province enum.

### `glaciers` — 6 live rows, all `status = 'unknown'`

```
     Column      |           Type           | Nullable |      Default
-----------------+--------------------------+----------+--------------------
 id              | uuid                     | not null | uuid_generate_v4()
 name            | text                     | not null |
 rgi_id          | text                     |          |
 glims_id        | text                     |          |
 district_id     | uuid                     |          |   ← FK → districts(id) ON DELETE SET NULL
 lat             | double precision         | not null |
 lng             | double precision         | not null |
 area_km2        | numeric                  |          |
 length_km       | numeric                  |          |
 elevation_min_m | integer                  |          |
 elevation_max_m | integer                  |          |
 status          | text                     | not null | 'unknown'::text
 terminus_type   | text                     |          |
 source          | text                     |          |
 last_observed   | text                     |          |   ← TEXT, not date
 notes           | text                     |          |
 created_at      | timestamp with time zone | not null | now()
```

- **`lat` / `lng` are `NOT NULL`** — the form must require them. **No CHECK constraints on
  `glaciers`** either, so nothing stops lat/lng from being nonsense; enforce ranges in
  `glacierSchema` (`lat` −90..90, `lng` −180..180; realistically GB is ~35–37 N, 72–78 E — a
  soft warning, not a hard bound).
- **`status` is free `text` with default `'unknown'`, no CHECK.** The UI already assumes exactly
  five values (`admin.glaciers.index.tsx:41-43`, `StatusPill`): `stable | retreating | advancing |
  surging | unknown`. `glacierSchema.status` must be `z.enum([...])` over exactly those five —
  the schema is the only thing preventing a typo from breaking `StatusPill` rendering.
- **`glims_id` and `terminus_type` are invisible today**: `listGlaciers()` (`queries.ts:11-21`)
  does not select `terminus_type`, and neither `glims_id` nor `terminus_type` is rendered in the
  index table. `glims_id` *is* rendered on the detail page (`admin.glaciers.$glacierId.tsx:129`,
  fed by `getGlacier`'s `SELECT g.*`). Decide once: either include both in the form (and extend
  `listGlaciers`' SELECT if the table should show them) or explicitly leave them out of
  `glacierSchema` and let the update preserve existing values. **Recommend: include both in the
  form as optional, do not add table columns.**
- **`last_observed` is `text`, not `date`.** Do not use a date picker or `z.coerce.date()` — keep
  it a string. Existing rows' format should be checked before choosing a format hint.

### The delete problem — the DB will never stop you

```
Referenced by districts:
  alerts.district_id       ON DELETE SET NULL
  cases.district_id        ON DELETE SET NULL
  chw_profiles.district_id ON DELETE SET NULL
  glaciers.district_id     ON DELETE SET NULL
  lakes.district_id        ON DELETE SET NULL

Referenced by glaciers:
  glacier_observations.glacier_id  ON DELETE CASCADE
```

`lakes` has **no** `glacier_id` column (verified: full `information_schema.columns` dump of
`lakes` — 23 columns, `district_id` present, no glacier reference). So glaciers' only dependent is
`glacier_observations`.

Consequences, both silent and unrecoverable:

- **`DELETE FROM districts WHERE id = …`** succeeds always, and NULLs the district off every
  alert, every clinical case, every CHW profile, every glacier and every lake in it. No error, no
  rollback, no trace beyond the audit row.
- **`DELETE FROM glaciers WHERE id = …`** succeeds always, and hard-deletes that glacier's entire
  `glacier_observations` history. `docs/admin-portal-prd.md:128` classifies `glacier_observations`
  as **"View + audit-only — CryoHealth-geo pipeline output — editing here would silently diverge
  from the Sentinel-2 run that produced it."** An unguarded glacier delete is therefore a direct
  PRD violation, not merely a UX gap.

⇒ **DELETE must pre-check dependents inside the same transaction and return 409 with counts when
any exist.** This is forced by the schema + PRD, not a design preference. Counts to check:

| Deleting | Blocking counts |
| --- | --- |
| District | `alerts`, `cases`, `chw_profiles`, `glaciers`, `lakes` where `district_id = $1` |
| Glacier | `glacier_observations` where `glacier_id = $1` |

Suggested 409 body: `{ error: "…", dependents: { lakes: 3, glaciers: 1, … } }` so the confirm
dialog can say exactly what is blocking. Live state today makes this easy to test: `districts` 2
rows, `glaciers` 6 rows, `glacier_observations` **0 rows**, `lakes` 6 rows — so a glacier delete
currently succeeds and a district delete currently blocks (glaciers/lakes reference them).
Verify **both** branches: create a throwaway district with no dependents (must delete) and try to
delete a seeded one (must 409).

---

## 5. UI primitives — all present, all unused

| File | Exports | App usage today |
| --- | --- | --- |
| `src/components/ui/dialog.tsx` | `Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription` (`:93-104`) | **None** outside `command.tsx`. |
| `src/components/ui/alert-dialog.tsx` | `AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel` (`:103-115`) | **None.** |
| `src/components/ui/form.tsx` | `useFormField, Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField` (`:162-171`). Imports `Controller, FormProvider, useFormContext` from `react-hook-form` (`:4-11`). | **None.** |

Installed (verified from `node_modules/*/package.json`): `zod@3.25.76`, `react-hook-form@7.73.1`,
`@hookform/resolvers@5.2.2`. Resolvers v5 uses Standard Schema; zod ≥3.24 implements it, so
`zodResolver(districtSchema)` from `@hookform/resolvers/zod` works with the pinned zod 3.25.
**Nothing to install.**

`<Toaster richColors position="top-right" />` is already mounted at `src/routes/__root.tsx:154`
(`sonner@2.0.7`). Use `toast.success` / `toast.error` for write feedback — do not build a new
feedback mechanism, and do not add a second `<Toaster>`.

**There is no modal anywhere in the repo to copy.** #10 writes the first one. The closest
prior art for form-ish UI is the inline filter bar at `admin.glaciers.index.tsx:110-146` (raw
`<input>`/`<select>` with `border-input bg-background` classes) — useful for styling tokens, not
for structure. Every new component must use CSS-var theme tokens (`var(--color-…)`,
`bg-card`, `border-border`), never hardcoded Tailwind palette classes — `docs/admin-portal-prd.md:210`
("Dark mode + RTL … never hardcoded hex") and #9's `StatusPill` dark-mode finding.

### The destructive-action rule the issue refers to

`docs/admin-portal-prd.md:211`:

> **Confirm before destructive actions** — matches this session's own operating rule; applies
> doubly inside the product now (delete confirmations, soft-delete on `cases`).

That is the only statement of it in the repo (`grep -rn "destructive" docs/ CLAUDE.md`). There is
**no existing confirm-dialog component or pattern** — `AlertDialog` is the shadcn primitive to
build it on, and #10 establishes the pattern for #11–#16.

---

## 6. Write-path precedent in `src/lib/queries.ts`

Two insert functions to match, exactly:

`insertAlert(input)` — `queries.ts:152-168`:
```ts
export async function insertAlert(input: { title: string; …; issuedById: string }) {
  const sql = await getDb();
  await sql`
    INSERT INTO alerts (title, body, body_en, body_ur, tier, "lakeId", district_id, …, "issuedById")
    VALUES (${input.title}, …, ${input.tier.toLowerCase()}, ${input.lakeId}, …)
  `;
}
```
`insertCase(input)` — `queries.ts:238-254`: identical shape.

House style, non-negotiable for the new functions:
- `const sql = await getDb();` then a single tagged template. **Never string-concatenate SQL.**
- Object param with an explicit inline type literal; `null` (not `undefined`) for absent values —
  every call site does `?? null` before passing (`api/public/cases.ts:31-38`).
- Quote camelCase columns; snake_case columns bare.
- Inserts return nothing today (`await sql\`…\``, then the route replies `{ ok: true }`).
  **#10 should deviate:** `INSERT … RETURNING id` / `UPDATE … RETURNING id`, because the audit row
  needs `entityId`. State this deviation explicitly — it is intentional, not drift.

Functions #10 must **not** touch: `listDistricts` (`:6-9`), `listGlaciers` (`:11-21`),
`getGlacier` (`:23-32`), `listGlacierObservations` (`:35-43`), `listDisasterCasesForDistrict`
(`:45-54`), `listLakesForAssoc` (`:56-65`). All are consumed by shipped pages (#6/#7) and by the
public `/data` explorer.

---

## 7. Client-side details a build agent will miss

1. **`admin.districts.tsx:29` and `admin.glaciers.index.tsx:47` share `queryKey: ["admin-districts"]`.**
   A district create/rename/delete must
   `queryClient.invalidateQueries({ queryKey: ["admin-districts"] })` — that single invalidation
   correctly refreshes both pages (the glaciers page's district dropdown included). A glacier
   mutation invalidates `["admin-glaciers"]`, and also `["admin-glacier", id]` if the detail page
   should refresh.
2. **Both pages currently call bare `fetch`.** Writes must go through
   `authFetch(url, { method, headers: {"content-type":"application/json"}, body })` —
   `src/lib/auth-client.ts:51`, which attaches `Authorization: Bearer <localStorage token>`.
   `authFetch` sets *only* the auth header; the caller must still set `content-type`.
   The existing **GET** calls can stay on bare `fetch` (the `/api/public/*` endpoints are ungated);
   do not churn them.
3. **Deleting the district a glacier belongs to changes that glacier's row.** After a district
   delete succeeds, `["admin-glaciers"]` is stale too. (Moot if the 409 guard blocks it, but the
   guard could be relaxed later — invalidate both.)
4. **`admin.districts.tsx` renders `colSpan={2}` and `admin.glaciers.index.tsx` renders
   `colSpan={8}`** on the loading/empty rows. Adding an "Actions" column means bumping both.
5. The error banner style is already established and identical on both pages
   (`admin.districts.tsx:41-51`, `admin.glaciers.index.tsx:88-104`) — `--color-watch` /
   `--color-watch-soft` / `--color-on-watch`. Reuse it for write errors; **never `--color-critical`
   / red**, which means CRITICAL hazard severity and nothing else (workspace `CLAUDE.md`).

---

## 8. Role gating — settled, not a GATE item

`requireRole(claims, ["cryohealth_admin", "facility_admin"])`. Four independent sources converge:

- `docs/admin-portal-prd.md:29-30` — `facility_admin` gets "Portal minus Users & Roles and System
  Health; CRUD on content domains".
- `docs/admin-portal-prd.md:126-127` — Districts and Glaciers are both "Full CRUD", and neither is
  marked `cryohealth_admin`-only (unlike Users/Audit/System health at `:104-106`).
- `AdminShell.tsx:26-34` — the "Hazard data" nav group is `adminOnly: false`.
- `src/routes/api/admin/cases.ts:9` (#9's precedent) and `api/public/alerts.ts:16` both use exactly
  `["cryohealth_admin", "facility_admin"]`.

Gating writes to `cryohealth_admin` only would contradict the nav (a `facility_admin` sees the
page and the buttons, then gets a 403). If the plan wants admin-only writes, it must *also* hide
the write affordances behind `isCryoHealthAdmin` — extra scope for no stated requirement.
`docs/admin-portal-prd.md:229-235` (open question 1) already resolves this direction: "ship
full-dataset access for both admin roles first, track facility-scoping as a fast-follow."

**Deliberately not gated:** `GET /api/public/districts` and `/api/public/glaciers` stay ungated —
they feed the public hazard map and `data.tsx`. #10 adds *write* endpoints under `api/admin/`; it
must not touch the public GETs.

---

## 9. Deviations / decisions to name at GATE

### D1 (GATE) — what goes in `audit.reason`

The DoD says every write inserts a row with `(actorId, action, entityType, entityId, reason)`.
But `audit.reason` is **nullable**, and CryoHealth-api only populates it where a human overrode a
machine decision (`alerts.service.ts:143/168/185` — all three take `dto.reason` from an explicit
human-supplied field; the DTO makes it mandatory for overrides per ARCHITECTURE.md's
"a human overriding the model must say why").

Discriminator: *does a boilerplate string add audit value?* Filling every create row with
"Created via admin portal" makes the column noise and degrades the signal that #12's mandatory
alert-clear reason depends on.

**Recommendation:**
- **Delete** → free-text `reason` is **required**, collected in the confirm dialog (`z.string().min(1)`).
  Destroying reference data that five tables point at is exactly the "say why" case.
- **Create / Update** → `reason` is `NULL`; put the substance in `meta` as a field diff, following
  the `{fromTier, toTier}` precedent at `alerts.service.ts:185`. E.g.
  `meta: { changed: { name: {from:"Ghizer", to:"Ghizar"} } }` for updates, `meta: { created: {...} }`
  for creates. Optionally allow an operator-supplied `reason` on update, unvalidated-empty → NULL.

Alternative (if the reviewer wants literal DoD compliance): require `reason` on all three verbs.
Costs an extra required field on the create/edit forms. Name the choice explicitly either way —
whatever lands here, #11–#16 copy.

### D2 (GATE) — require `source` on hand-created glaciers

`glaciers.source` is nullable in the DB, and the glaciers page header advertises provenance:
*"sourced from Randolph Glacier Inventory v7 (RGI Consortium, 2023) · GLIMS / NSIDC"*
(`admin.glaciers.index.tsx:80-83`). The user's standing rule — recorded in memory as *"no
fabricated hazard data: never invent coordinates/measurements/clinical text for this GLOF
system"* — means a glacier row typed into a form with no provenance is exactly the failure mode
that rule exists to prevent, and it will render under a header claiming RGI v7 provenance.

**Recommendation: make `source` required in `glacierSchema`** (`z.string().min(1)`) even though
the DB allows NULL, with form helper text asking for the inventory/publication the entry comes
from. Similarly, `rgi_id` / `glims_id` optional but present in the form.
Counter-argument to weigh: this makes the create form harder to use for genuinely novel field
observations. If rejected, the fallback is a required free-text `notes` on create.

### D3 (non-deviation, state it so nobody invents work) — route file layout

Recommended, symmetric, and consistent with the existing `api/public/glaciers.ts` +
`api/public/glaciers.$glacierId.ts` pair (which coexist today with no parent route file and no
`Outlet` — API routes do not need one):

| File | Handlers |
| --- | --- |
| `src/routes/api/admin/districts.ts` | `POST` (create) |
| `src/routes/api/admin/districts.$districtId.ts` | `PUT` (update), `DELETE` |
| `src/routes/api/admin/glaciers.ts` | `POST` (create) |
| `src/routes/api/admin/glaciers.$glacierId.ts` | `PUT` (update), `DELETE` |

The issue's DoD writes "`districts.ts` and `.../glaciers.ts` (+ `$glacierId.ts`)" — it names
`$glacierId.ts` only for glaciers. Treat that as shorthand, not as a directive to put district
PUT/DELETE on the flat `districts.ts` with an id in the body. Symmetry matters more than literal
DoD wording here because #11–#16 copy this layout. **Say so explicitly in PLAN.md** so it reads as
a considered deviation, not drift.

No `GET` handlers in `api/admin/*` for #10 — the pages already read from the ungated
`/api/public/districts` and `/api/public/glaciers`, and adding duplicate gated GETs is scope with
no consumer.

### D4 (non-deviation) — no changes to the public GET endpoints or their queries

`api/public/districts.ts`, `api/public/glaciers.ts`, `api/public/glaciers.$glacierId.ts`,
`listDistricts`, `listGlaciers`, `getGlacier` all stay byte-identical. They serve `data.tsx`, the
public hazard map, and the shipped detail page.

### D5 (sizing) — `size:m` is optimistic; pre-authorize the split

Inventory: 6 new write functions + 1 audit helper (7 in `queries.ts`), 2 zod schemas, 4 route
files, 2 create/edit dialog components, 2 confirm-delete components, 2 page rewires, 1 new
`Actions` column each. That is ~11 files and the repo's first transaction, first modal, first
zod usage, first PUT, first DELETE, first audit write.

**Pre-authorized split: districts end-to-end first as the proven template (queries → schema →
routes → dialogs → page), then glaciers as a second commit stream reusing it.** If the loop
budget (3) is under pressure after districts lands green, glaciers is a clean cut line and a
follow-up issue, not a failed task.

### D6 (non-deviation) — edit/delete affordances live on the list pages only

Both resources get their Actions column on `admin.districts.tsx` and
`admin.glaciers.index.tsx`. **`admin.glaciers.$glacierId.tsx` gets no Edit button in #10** — a
detail-page edit affordance is a nice-to-have that doubles the dialog wiring. Decide it here so it
does not get invented mid-build.

### D7 (non-deviation) — no migration, ever, in this repo

Workspace + repo `CLAUDE.md`: CryoHealth-api owns all migrations. `districts` and `glaciers` need
no schema change for #10 — everything the forms need already exists. If a field seems missing,
the answer is to drop the field, not to add a column.

---

## 10. Draft plan steps (one atomic commit each)

### Step 0 — pre-flight, no commit

```bash
cd /Users/m5/Projects/uexel/cryo/cryohealth
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK
bunx tsc --noEmit && bun run lint          # baseline: both currently PASS (verified)
docker ps | grep cryohealth-api-db-1       # verified up
PGPASSWORD=cryohealth-dev psql -h localhost -p 5433 -U cryohealth -d cryohealth \
  -c 'SELECT (SELECT count(*) FROM districts) d,(SELECT count(*) FROM glaciers) g,
             (SELECT count(*) FROM audit) a,(SELECT count(*) FROM glacier_observations) go;'
# expected today: d=2  g=6  a=1  go=0
```

**Then get a token — every later manual verification needs one:**

```bash
bun dev &   # note the port it prints; vite.config.ts delegates host/port/strictPort
            # to @lovable.dev/vite-tanstack-config, so it is not fixed in this repo
DEV=http://localhost:<printed-port>
curl -s -X POST $DEV/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"identifier":"admin-001","password":"1234"}'   # cryohealth_admin
# also grab facility-001/1234 (403-boundary check) and chw-001/1234 (403 check)
```

Do **not** probe verb dispatch here — there is no route with a `DELETE:` handler yet, so any
result is a non-signal (§1 T1). Verb dispatch is proven in Step 3.

Dev credentials confirmed at `CryoHealth-api/scripts/seed-users.ts:10-23`:
`chw-001 / 1234` (chw), `admin-001 / 1234` (cryohealth_admin), `facility-001 / 1234`
(facility_admin). Login takes `{identifier, password}` where identifier matches `users."lhwId"` or
`users.phone` (`src/routes/api/auth/login.ts:22-25`).

### Step 1 — `districtSchema` + `glacierSchema` in `src/lib/admin-schemas.ts`
Replace the two `.strict()` stubs with real shapes (create + update variants, e.g. via `.partial()`).
`glacierSchema.status` = `z.enum(["stable","retreating","advancing","surging","unknown"])`.
`lat`/`lng` required with range bounds. No `db`/`queries` import.
Verify: `bunx tsc --noEmit && bun run lint`.

### Step 2 — `writeAudit(sql, {...})` helper **plus** the three district write functions, one commit
`writeAudit` alone has no runnable verification — it takes an existing `sql` handle by design (§3)
and cannot be exercised standalone. Ship it together with its first callers rather than leaving a
step with no check.

- `writeAudit(sql, { actorId, action, entityType, entityId, reason, meta })` — quoted camelCase
  columns, takes the handle, never calls `getDb()`.
- `createDistrict` / `updateDistrict` / `deleteDistrict`, each `sql.begin(...)`-wrapped around the
  mutation + its `writeAudit` call. `RETURNING id` feeds `entityId`.
- `deleteDistrict` runs the 5-table dependent count **inside the same transaction** before the
  DELETE and throws a typed `HasDependentsError` carrying the counts.

Verify: `bunx tsc --noEmit && bun run lint`. Behavioural proof (rows in `districts` + `audit`,
atomicity) lands in Step 4 — say so; do not leave this step reading as "no check needed".

### Step 3 — `api/admin/districts.ts` (POST) + `api/admin/districts.$districtId.ts` (PUT/DELETE)
`requireAuth` → `requireRole(["cryohealth_admin","facility_admin"])` → `schema.safeParse` → 400 on
failure → query fn → `Response.json`. `23505` → 409. Dependents → 409 with counts.

**This step also discharges §1 T1** — it is the first route in the repo declaring `PUT:`/`DELETE:`.

Verify: `bunx tsc --noEmit && bun run lint && bun run build`, then against `bun dev` with the
Step-0 token:
```bash
curl -i -X POST   $DEV/api/admin/districts -H "authorization: Bearer $TOK" \
  -H 'content-type: application/json' -d '{"name":"ZZ Test","province":"Gilgit Baltistan"}'
curl -i -X PUT    $DEV/api/admin/districts/<id> -H "authorization: Bearer $TOK" \
  -H 'content-type: application/json' -d '{"name":"ZZ Test 2"}'   # ← proves PUT dispatches
curl -i -X DELETE $DEV/api/admin/districts/<id> -H "authorization: Bearer $TOK" \
  -H 'content-type: application/json' -d '{"reason":"cleanup"}'    # ← proves DELETE dispatches
curl -i -X DELETE $DEV/api/admin/districts/<seeded-id> -H "authorization: Bearer $TOK" \
  -H 'content-type: application/json' -d '{"reason":"x"}'          # ← must be 409 with counts
curl -i -X POST   $DEV/api/admin/districts                          # ← must be 401
curl -i -X POST   $DEV/api/admin/districts -H "authorization: Bearer $CHW_TOK" …  # ← must be 403
curl -i -X POST   $DEV/api/admin/districts -H "authorization: Bearer $TOK" \
  -H 'content-type: application/json' -d '{"name":""}'              # ← must be 400 (zod)
```
plus `psql` checks of `districts` and `audit` (an `action='district.create'` row with the right
`entityId`, and **no** audit row for the 409'd delete — that proves the transaction).

If PUT or DELETE returns the SSR HTML shell instead of JSON here, the layout must fall back to
POST-with-an-action-field on the flat files — re-gate at that point, not before.

### Step 4 — `admin.districts.tsx`: Actions column, create/edit Dialog + Form, delete AlertDialog
`colSpan` 2 → 3. `authFetch`. `invalidateQueries(["admin-districts"])`. `toast` feedback.
Verify: build + manual create/edit/delete, reload persistence, audit row present.

### Steps 5–7 — the same three steps for glaciers
(query fns → `api/admin/glaciers.ts` + `glaciers.$glacierId.ts` → `admin.glaciers.index.tsx`
**not** `admin.glaciers.tsx`). `colSpan` 8 → 9. Invalidate `["admin-glaciers"]`.

### Step 8 — `graphify update .` + close-out.

Full DoD verification command:
```bash
bunx tsc --noEmit && bun run lint && bun run build
```
plus manual: create/edit/delete a district and a glacier, reload to confirm persistence, and
```bash
PGPASSWORD=cryohealth-dev psql -h localhost -p 5433 -U cryohealth -d cryohealth \
  -c 'SELECT action, "entityType", "entityId", reason, meta FROM audit ORDER BY "createdAt" DESC LIMIT 10;'
```

---

## 11. Risks / assumptions that would change the plan if wrong

| # | Assumption | If wrong |
| --- | --- | --- |
| R1 | TanStack Start dispatches `PUT`/`DELETE` server handlers. Strongly implied by `docs/admin-portal-prd.md:114-115`; **`tsc` cannot confirm it (§1 T1) — a bad verb key compiles clean and silently never fires.** | Not a plan-shape risk, a verification-gap risk. Proven or disproven by Step 3's `curl -X PUT`/`-X DELETE` against the route that declares them. Only if *that* fails does the layout fall back to POST-with-action-field. |
| R2 | `sql.begin` works through `getDb()` on both dev and Hyperdrive paths. Repo's first transaction. | Fall back to the writeable-CTE form spelled out in §3 — atomic without a transaction. **Never** degrade to mutate-then-audit-separately. |
| R3 | `claims.sub` is always a live `users.id`. | `23503` on the audit insert. Only reachable with a stale cross-service token. |
| R4 | `facility_admin` should get district/glacier writes. | Writes narrow to `cryohealth_admin` **and** the affordances must hide behind `isCryoHealthAdmin` — scope grows. Evidence is strongly against (§8). |
| R5 | Delete should hard-block on dependents (409). | Alternative is cascade-with-explicit-consent ("this will orphan 3 lakes — type DELETE to confirm"). Materially more UI. Recommend the 409 for #10 and revisit. |
| R6 | `glacier_observations` has 0 rows, so the glacier-delete guard is untestable against real data today. | Must insert a throwaway observation row via psql to exercise the 409 branch, or the guard ships unverified. |
| R7 | `size:m` holds. | See D5 — districts-first split is pre-authorized. |
| R8 | `@hookform/resolvers@5` + `zod@3.25` interop via Standard Schema. | If `zodResolver` mistypes, fall back to a manual `resolver` wrapper around `schema.safeParse` — no dependency change. |

---

## 12. Key file paths

Read first:
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/api/public/alerts.ts` — the scaffold
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/auth-guard.ts`
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/admin-schemas.ts` — the zod stubs to fill
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/queries.ts` (`:152-168`, `:238-254`)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/auth-client.ts` (`:51` `authFetch`)

Modify:
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/admin-schemas.ts`
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/lib/queries.ts`
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.districts.tsx`
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.glaciers.index.tsx` ← **not** `admin.glaciers.tsx`

Create:
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/api/admin/districts.ts`
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/api/admin/districts.$districtId.ts`
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/api/admin/glaciers.ts`
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/api/admin/glaciers.$glacierId.ts`
- dialog components (co-located in the route files, or `src/components/cryohealth/`)

Do not touch:
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/admin.glaciers.tsx` (4-line Outlet parent)
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routes/api/public/districts.ts`, `.../glaciers.ts`, `.../glaciers.$glacierId.ts`
- `/Users/m5/Projects/uexel/cryo/cryohealth/src/routeTree.gen.ts` (generated)
- any migration, in any repo

Reference:
- `/Users/m5/Projects/uexel/cryo/cryohealth/docs/admin-portal-prd.md` (`:126-128` CRUD matrix, `:206-212` NFRs, `:229-235` role scope)
- `/Users/m5/Projects/uexel/cryo/CryoHealth-api/src/alerts/alerts.service.ts` (`:25` 23505 constant, `:143/:168/:185` audit calls, `:161-194` transaction)
- `/Users/m5/Projects/uexel/cryo/CryoHealth-api/scripts/seed-users.ts` (`:10-23` dev credentials)
