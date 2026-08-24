# HANDOFF — cryohealth — 2026-08-24 PKT

Session: task-system-health Model: claude-opus-4-8 Branch: Shoaib
Goal: System health admin page (CryoHealth-api + CryoHealth-geo live status, admin-only run
triggers). Parent: #3 (admin portal). The issue paste referenced "#18" as a related item —
that is the audit-log task, not this one; this issue's own number was not given.

## State

Implemented, **not yet build-verified** (the dev VM/toolchain reported "VM service not running"
this whole session, so `bunx tsc --noEmit && bun run lint && bun run build` was NOT executed and
`src/routeTree.gen.ts` was NOT regenerated). All Definition-of-Done code is written and passed a
static self-review (imports resolve against real files, types check against existing patterns,
Prettier alignment reasoned by hand). One build is required before `tsc` can pass — see "Resume
with" (three NEW server routes are absent from the generated route tree until then).

Prior task, for context: the audit-log page (#18) code is complete; its build-verification is
likewise the human's to confirm — nothing in this repo was executed through the agent toolchain
this session. (This supersedes any earlier wording that implied the #18 verify command had run.)

## Done this session

- `.env.example` (modified): added `CRYOHEALTH_GEO_URL=http://localhost:8000` with a comment
  explaining it's server-side only (geo has no CORS and no inbound auth of its own), mirroring
  the existing `CRYOHEALTH_API_URL` entry.
- `src/lib/cryohealth-api.ts` (modified): added `ApiHealth` type (`{ status, database }`) and
  `fetchApiHealth()` — a server-side probe of CryoHealth-api `GET /health` (public on the API
  side). Reuses the existing `apiBaseUrl()` helper; throws on non-2xx so the caller can present
  the service as unreachable rather than 500.
- `src/lib/cryohealth-geo.ts` (new): parallels cryohealth-api.ts. `geoBaseUrl()` reads
  `import.meta.env.VITE_CRYOHEALTH_GEO_URL || process.env.CRYOHEALTH_GEO_URL` (same dual-read as
  the api helper). Exports `GeoHealth` (`{ status, scheduler_running }`), `fetchGeoHealth()`,
  `triggerGeoRun()` (POST /run), `triggerGeoHazard()` (POST /run-hazard). Geo takes no request
  body and needs no auth header; the functions throw on non-2xx.
- `src/routes/api/admin/system-health.ts` (new): GET, `cryohealth_admin` via
  `requireAuth`/`requireRole` (the exact try/catch the guard's doc comment prescribes). Probes
  both services in parallel via a local `probe()` helper that returns a discriminated union
  `{ reachable: true, data } | { reachable: false, error }` — one service down never fails the
  page. Returns `{ api, geo, checkedAt }`.
- `src/routes/api/admin/system-health.run.ts` (new): POST, `cryohealth_admin` only, proxies to
  CryoHealth-geo `POST /run`. A facility_admin token gets a 403 from requireRole here directly
  (the DoD's "not merely a hidden button" requirement). Geo failure → 502.
- `src/routes/api/admin/system-health.run-hazard.ts` (new): same as run.ts, proxies `POST
  /run-hazard`.
- `src/routes/admin.system-health.tsx` (replaced placeholder): polls
  `/api/admin/system-health` via `authFetch` on a 10s `refetchInterval` (+ `enabled:
  isCryoHealthAdmin` so no poll fires for a non-admin). Renders two status cards (api: status +
  database; geo: status + scheduler running/stopped) with a health Badge and an inline error for
  an unreachable service. "Run now" / "Run hazard pass now" buttons open a confirm AlertDialog,
  then POST via `authFetch`; success/error surface as a toast and the health query is
  invalidated. Client gate `if (!isCryoHealthAdmin) return <CryoHealthAdminOnly />` after all
  hooks. The nav entry (AdminShell "Platform" group, `adminOnly: true`) and the client route
  already existed as a placeholder — untouched except for the component body.

## Next action

1. Run `bun run build` (or start `bun run dev`) ONCE to regenerate `src/routeTree.gen.ts` with
   the three new `/api/admin/system-health*` server routes. Without this, step 2's `tsc` fails on
   those new route paths (a codegen-ordering artifact, not a defect — the client route
   `/admin/system-health` already exists in the tree and is fine).
2. Run the DoD verification: `bunx tsc --noEmit && bun run lint && bun run build`. If lint reports
   only `prettier/prettier`, run `bun run format` (expected — some prose wrapping in the .tsx was
   hand-aligned and may differ slightly; it's a formatting diff, not a logic issue).
3. Manual round-trip with both services running (checklist below), including the facility_admin
   403-via-curl check the DoD calls out specifically.
4. Commit (include the regenerated `routeTree.gen.ts`), push, fill in commit hash, check CI.

## Open questions for a human

- Should triggering a run/run-hazard be written to the `audit` log? Left OUT deliberately: the
  DoD doesn't ask for it, geo takes no actor context, and a "requested a run" entry without the
  run's outcome (which lives in geo/api) could mislead. Easy to add via `writeAudit` if wanted.
- Polling interval is 10s (`POLL_INTERVAL_MS`). Adjust if that's too chatty against two upstream
  services in production.
- For a real Cloudflare Workers deploy, `CRYOHEALTH_GEO_URL` rides on `process.env` /
  `import.meta.env` exactly like `CRYOHEALTH_API_URL` does today (neither is in `wrangler.jsonc`
  `vars` — only the `HYPERDRIVE` binding is). If the API URL is set as a Workers secret/var in
  prod, set the geo URL the same way. No new binding was added, to match existing treatment.

## Failed approaches (do not retry)

- Do NOT hand-edit `src/routeTree.gen.ts` to add the new server routes — the router plugin
  regenerates it on dev/build and overwrites the edit; a blind hand-edit also risks breaking the
  whole file's typecheck. Regenerate via the plugin (step 1 above).
- Do NOT call CryoHealth-geo from the browser. It has no CORS headers and no inbound auth; the
  whole point of the server routes is to proxy same-origin and gate on cryohealth_admin first.

## Loops run

- None. No `/uexel:build` / `/uexel:verify` loop — toolchain unavailable (VM down). The issue's
  fix-loop budget of 3 is untouched and available once verification can run.

## Files touched

`.env.example` (modified), `src/lib/cryohealth-api.ts` (modified), `src/lib/cryohealth-geo.ts`
(new), `src/routes/api/admin/system-health.ts` (new), `src/routes/api/admin/system-health.run.ts`
(new), `src/routes/api/admin/system-health.run-hazard.ts` (new), `src/routes/admin.system-health.tsx`
(replaced placeholder). `src/routeTree.gen.ts` will change on the next build (adds the three new
server routes) — include it in the commit. This file.

## Verification status

- **tests**: n/a (no test script in this repo).
- **review**: static self-review only — imports resolved (auth-guard exports, the new lib
  helpers, AlertDialog/Badge/Button vs admin.users.tsx, useAuth().isCryoHealthAdmin); the
  `Probe<T>` discriminated union narrows correctly in both the route and the badge; Prettier
  structure hand-checked (JSX tag breaking, object-type literals, no fragile nested ternaries).
  No `/uexel:verify` pass.
- **qa**: `tsc`/`lint`/`build` NOT run (VM down). Must regenerate the route tree first.
- **API gating**: `requireRole(["cryohealth_admin"])` on all three server handlers; client gate +
  `enabled:false` on the poll. Runtime 403 for facility_admin not yet confirmed by execution —
  the DoD's explicit curl check is in the manual checklist below.

## Resume with

1. `bun run build` (regenerates `routeTree.gen.ts` → adds the three `/api/admin/system-health*`
   routes).
2. `bunx tsc --noEmit && bun run lint && bun run build` (run `bun run format` if lint flags only
   formatting).
3. Manual checklist below, then commit (with regenerated tree), push, fill in commit hash.

---

## Manual Testing Checklist

### Setup

```bash
# CryoHealth-api on :3000 and CryoHealth-geo on :8000 must both be running.
# In cryohealth/.env set CRYOHEALTH_API_URL / CRYOHEALTH_GEO_URL to match.
bun run dev
# Dev server on http://localhost:8080
```

### Sign in (cryohealth_admin)

- http://localhost:8080/login — LHW ID: `admin-001`, PIN: `1234`.

### System health page (live status)

- Sidebar → **Platform → System health** (admin-only group).
- ✓ CryoHealth-api card shows Status `ok` and Database `up` (Healthy badge) when the API is up.
- ✓ CryoHealth-geo card shows Status `ok` and Scheduler `Running`/`Stopped` (Healthy badge).
- ✓ Page auto-refreshes (~10s); "Last checked HH:MM:SS" updates.
- ✓ Stop one service → within ~10s its card flips to **Unreachable** with the error text; the
  other card is unaffected and the page does not error out.

### Run triggers

- Click **Run now** → confirm dialog → confirm → toast "Pipeline run started"; geo receives
  `POST /run`. Then **Run hazard pass now** → toast "Hazard pass started"; geo receives
  `POST /run-hazard`.
- With geo stopped, confirming a run → error toast (502 surfaced), dialog stays put until settled.

### facility_admin is blocked (DoD requirement)

- Sign out; sign in as facility_admin — LHW ID: `facility-001`, PIN: `1234`.
- ✓ **System health** link does NOT appear in the sidebar (Platform group is adminOnly).
- ✓ Visiting http://localhost:8080/admin/system-health directly shows the "cryohealth_admin
  required" gate, not the page.
- ✓ Direct API hits return 403 — the endpoint gates, not just the button:
  ```bash
  TOKEN=<facility_admin token from localStorage key `cryohealth_token`>
  curl -i -X POST "http://localhost:8080/api/admin/system-health/run" \
    -H "Authorization: Bearer $TOKEN"
  # → HTTP 403
  curl -i -X POST "http://localhost:8080/api/admin/system-health/run-hazard" \
    -H "Authorization: Bearer $TOKEN"
  # → HTTP 403
  curl -i "http://localhost:8080/api/admin/system-health" \
    -H "Authorization: Bearer $TOKEN"
  # → HTTP 403
  ```

### Test complete ✓

Live status renders for both services, one-service-down degrades gracefully, run triggers proxy
to geo, and facility_admin is blocked on nav, page, and all three API endpoints.
