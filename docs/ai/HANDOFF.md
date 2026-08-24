# HANDOFF — cryohealth — 2026-08-24 PKT

Session: task-sync-activity Model: claude-opus-4-8 Branch: Shoaib
Goal: #19 — Sync activity page with an honest empty state (no CryoHealth-api sync endpoint
exists yet). Parent: #3 (admin portal).

## State

Implemented, **not yet build-verified** (the dev VM/toolchain reported "VM service not running"
again this session, so `bunx tsc --noEmit && bun run lint && bun run build` was NOT executed and
`src/routeTree.gen.ts` was NOT regenerated). All Definition-of-Done code is written and passed a
static self-review (every import traced to a real export, Prettier alignment reasoned by hand).

**Two** new routes need a route-tree regen this time — both the client route `/admin/sync` and
the server route `/api/admin/sync` are new (unlike the system-health task, where the client
route already existed as a placeholder). `tsc` will fail on both until one build runs.

Prior tasks for context: #18 (audit log) and the system-health page are both code-complete and
likewise await the same execution-gated verification. Nothing in this repo has been run through
the agent toolchain across these sessions.

## Decisions taken this session (user-confirmed)

- **Separate `/admin/sync` page**, not a tab inside System Health. The DoD allowed either; a
  separate page matches every other admin page and leaves System Health focused on liveness.
- **`cryohealth_admin` only.** `sync_log` rows tie named staff to device IDs, so it is gated
  exactly like the audit log, and the nav entry sits in the adminOnly "Platform" group.

## Correction to the PRD (important, verified)

The admin PRD §5 table (line 141) says `chw_cases` has "no API writer yet". **That is out of
date.** `CryoHealth-api/src/cases/cases.controller.ts` exposes `POST /cases` (`@Roles('chw')`)
which calls `CasesService.create()` → `this.cases.save(...)`, an idempotent upsert keyed on
`clientCaseId`. So:

- `sync_log` — **no writer anywhere.** Grepped all of `CryoHealth-api/src` on 2026-08-24: only
  the entity, the InitialSchema migration and `all-entities.ts` reference it. The issue's claim
  is correct for this table.
- `chw_cases` — **has a live writer.** Empty means "no device has synced a case yet", NOT "the
  feature is missing".

The page therefore gives each table its **own** empty state. Reusing "CryoHealth-api's sync
endpoint is not built" for `chw_cases` would have been a fabrication of the opposite kind — the
exact failure mode #19 is guarding against. Worth fixing the PRD line in a follow-up.

## Done this session

- `src/lib/queries.ts` (modified): appended read-only `listSyncLog(limit)` and
  `listChwCases(limit)` after `listAuditEntityTypes()`. Both follow `listAudit`'s shape — one
  rows query plus an unfiltered `count(*)::int` in a single `Promise.all`, so the page can tell
  "genuinely empty" from "the LIMIT trimmed it". LEFT JOIN `users` (not INNER) so a row survives
  a since-removed user. Both tables use **quoted camelCase** identifiers (`s."startedAt"`,
  `c."capturedAt"`) matching CryoHealth-api's TypeORM naming — like `audit`, unlike the
  snake_case `cases`/`districts` tables. `chw_cases.syncState` is a Postgres enum, cast
  `::text`. **`chw_cases.payload` is deliberately NOT selected** — it holds clinical case
  content and this page only needs delivery metadata (data minimisation).
- `src/routes/api/admin/sync.ts` (new): GET only, `cryohealth_admin` via
  `requireAuth`/`requireRole` (the exact try/catch the guard's doc comment prescribes). Reads
  both tables in one round-trip and returns
  `{ syncLog: {rows,total}, chwCases: {rows,total}, limit }`. No POST/PUT/DELETE — both tables
  are owned and written by CryoHealth-api. A DB error propagates as a 500 rather than being
  flattened into an empty result.
- `src/routes/admin.sync.tsx` (new): `cryohealth_admin` gate via `CryoHealthAdminOnly` after all
  hooks, `useQuery` + `authFetch` against the route above. Two sections ("Device sync log",
  "Offline cases synced"), each rendering real rows when present and its own `EmptyNotice` when
  not. The required copy is present verbatim: **"No sync data yet — CryoHealth-api's sync
  endpoint is not built"**, followed by an explanation of why (schema exists, no writer does)
  and that building it is a separate out-of-scope CryoHealth-api goal.
- `src/components/cryohealth/AdminShell.tsx` (modified): added
  `{ to: "/admin/sync", label: "Sync activity", exact: false }` to the adminOnly "Platform"
  group, next to System health.

## The honesty invariant (the point of this issue)

Loading, error and empty are three **distinct** states and are never conflated:

- `settled = !isLoading && !isError` — an empty state renders **only** when the request actually
  succeeded and returned zero rows.
- On failure the tables show "Unknown — the request failed." plus a banner saying explicitly
  that this is a request failure, not an empty result. Misreporting an outage as "feature not
  built yet" would be the subtler version of the same lie.
- There are **no** mock, sample, seeded or placeholder rows anywhere in the page. Every row is
  `syncRows.map` / `caseRows.map` over server data. The only literals are column headers, the
  empty-state copy, and `"—"` / `"In progress"` fallbacks for genuinely null columns.

## Next action

1. Run `bun run build` (or start `bun run dev`) ONCE to regenerate `src/routeTree.gen.ts` with
   **both** new routes (`/admin/sync` and `/api/admin/sync`). Without this, step 2's `tsc` fails
   on both — a codegen-ordering artifact, not a defect.
2. Run the DoD verification: `bunx tsc --noEmit && bun run lint && bun run build`. If lint
   reports only `prettier/prettier`, run `bun run format` (a formatting diff, not a logic issue).
3. Manual checklist below.
4. Commit (include the regenerated `routeTree.gen.ts`), push, fill in commit hash, check CI.

## Open questions / actions for a human

- **File the CryoHealth-api sync-endpoint goal.** The DoD says building it is out of scope here
  and "should be filed as a separate `CryoHealth-api` goal if not already". I do not access
  GitHub in this workflow (the issue text is pasted in by hand), so **this filing has not been
  done and needs a human.** Suggested scope: a sync endpoint that writes `sync_log` rows
  (userId, deviceId, startedAt/finishedAt, itemCount, status, detail) — the page then populates
  with no further change here.
- **Fix admin PRD §5 line 141**, which wrongly lists `chw_cases` as writer-less (see the
  correction section above).
- Row cap is 200 per table (`SYNC_PAGE_LIMIT`), unpaginated — fine while both tables are empty
  or tiny. Add a pager (the audit page has one to copy) if `chw_cases` grows.
- `sync_log.detail` (jsonb) renders as raw `JSON.stringify`. No shape is known yet because
  nothing writes it; revisit once the endpoint exists and the shape is real.

## Failed approaches (do not retry)

- Do NOT hand-edit `src/routeTree.gen.ts` — the router plugin regenerates it on dev/build and
  overwrites the edit; a blind hand-edit also risks breaking the whole file's typecheck.
- Do NOT give `chw_cases` the "sync endpoint is not built" empty state. It has a live writer
  (`POST /cases`); that copy would be false there. Keep the two messages distinct.
- Do NOT show an empty state while `isLoading` or `isError`. That reports an outage as an
  unbuilt feature and is precisely what #19 forbids.

## Loops run

- None. No `/uexel:build` / `/uexel:verify` loop — toolchain unavailable (VM down, same
  "VM service not running" signature as the previous two sessions). The issue's fix-loop budget
  of 3 is untouched and available once verification can run.

## Files touched

`src/lib/queries.ts` (modified), `src/routes/api/admin/sync.ts` (new),
`src/routes/admin.sync.tsx` (new), `src/components/cryohealth/AdminShell.tsx` (modified).
`src/routeTree.gen.ts` will change on the next build (adds both new routes) — include it in the
commit. This file.

## Verification status

- **tests**: n/a (no test script in this repo).
- **review**: static self-review only — imports traced to real exports (`CryoHealthAdminOnly` at
  AdminPlaceholder.tsx:10, `useAuth().isCryoHealthAdmin` at auth.tsx:9/47, all six `Table*`
  primitives at table.tsx:94, the two new query functions); column names checked against the
  InitialSchema migration character by character (quoted camelCase); Prettier structure
  hand-checked (the `meta` array is exactly 100 cols so it stays on one line; `<TableHead>` rows
  with labels of 8+ chars are pre-broken because they would exceed 100 at this nesting depth).
- **qa**: `tsc`/`lint`/`build` NOT run (VM down). Must regenerate the route tree first.
- **API gating**: `requireRole(["cryohealth_admin"])` on the server handler; client gate plus
  `enabled: isCryoHealthAdmin` on the query. Runtime 403 for facility_admin not yet confirmed by
  execution — curl check in the checklist below.

## Resume with

1. `bun run build` (regenerates `routeTree.gen.ts` → adds `/admin/sync` + `/api/admin/sync`).
2. `bunx tsc --noEmit && bun run lint && bun run build` (`bun run format` if lint flags only
   formatting).
3. Manual checklist below, then commit (with regenerated tree), push, fill in commit hash.

---

## Manual Testing Checklist

### Setup

```bash
# Postgres must be up (the shared docker-compose db on :5433 — same DB CryoHealth-api uses).
# CryoHealth-api/-geo are NOT needed for this page: it reads the database directly.
bun run dev
# Dev server on http://localhost:8080
```

### Sign in (cryohealth_admin)

- http://localhost:8080/login — LHW ID: `admin-001`, PIN: `1234`.

### The honest empty state (the DoD requirement)

- Sidebar → **Platform → Sync activity**.
- ✓ "Device sync log" shows the explicit notice, not a generic "no results":
  **"No sync data yet — CryoHealth-api's sync endpoint is not built"** plus the explanation.
- ✓ **No fake rows anywhere** — no sample device IDs, no invented timestamps, no greyed
  placeholder rows.
- ✓ "Offline cases synced" shows **its own** message ("No offline cases have synced yet") if
  `chw_cases` is empty, *or* real rows if your DB has any. Confirm with:
  ```bash
  psql -h localhost -p 5433 -U cryohealth -d cryohealth \
    -c 'SELECT count(*) FROM sync_log; SELECT count(*) FROM chw_cases;'
  ```
  Whatever those counts say must match the page — including the "N total" figures.

### Real rows render (optional, proves it is not hardcoded-empty)

`sync_log` has no writer, so the only way to see a populated table is to insert a row by hand.
Insert it, confirm the table replaces the empty notice with that row, then delete it:

```sql
INSERT INTO sync_log ("userId", "deviceId", "startedAt", "finishedAt", "itemCount", status)
SELECT id, 'test-device-1', now() - interval '2 minutes', now(), 3, 'ok'
FROM users LIMIT 1;
-- check the page, then:
DELETE FROM sync_log WHERE "deviceId" = 'test-device-1';
```

- ✓ With the row present the table renders it (device `test-device-1`, 3 items, status `ok`) and
  the empty notice disappears; "1 total".
- ✓ After the delete, the honest empty state returns.

### Error is not reported as empty

- Stop Postgres (or break `DB_PORT` in `.env`) and reload.
- ✓ The page shows the amber "this is a request failure, not an empty result" banner and
  "Unknown — the request failed." in the tables — **not** the "endpoint is not built" copy.

### facility_admin is blocked

- Sign out; sign in as facility_admin — LHW ID: `facility-001`, PIN: `1234`.
- ✓ **Sync activity** does NOT appear in the sidebar (Platform group is adminOnly).
- ✓ Visiting http://localhost:8080/admin/sync directly shows the "cryohealth_admin required"
  gate, not the page.
- ✓ The endpoint itself gates, not just the nav:
  ```bash
  TOKEN=<facility_admin token from localStorage key `cryohealth_token`>
  curl -i "http://localhost:8080/api/admin/sync" -H "Authorization: Bearer $TOKEN"
  # → HTTP 403
  curl -i "http://localhost:8080/api/admin/sync"
  # → HTTP 401 (no token at all — requireAuth, not requireRole)
  ```

### Test complete ✓

The page renders exactly what the two tables contain, states plainly and specifically why
`sync_log` is empty, distinguishes that from `chw_cases` being merely unused, never fabricates a
row, never reports a failure as an empty result, and blocks facility_admin at the API.
