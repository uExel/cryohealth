# cryohealth

TanStack Start web dashboard: public GLOF hazard map, alert log/broadcast console, CHW
web companion (triage + case logging), facility admin views, and an Open Data page —
deployed as a Cloudflare Worker. Started as a Lovable Cloud prototype
(`.lovable/plan.md` — historical scope doc, not current architecture) and has since been
rewired onto the shared CryoHealth-api/Postgres stack; see Gotchas below for what that
migration left in place.

## Commands (`bun`)

```bash
bun install
bun dev               # vite dev
bun run build         # vite build
bun run lint          # eslint .
bun run format        # prettier --write .
```

No test script defined in this repo. Deploys as a Cloudflare Worker (`wrangler.jsonc`,
`main: src/server.ts`).

## Map

<!-- One line per top-level folder whose purpose a newcomer can't infer from its name.
     Delete rows that are obvious — every line here loads in every session. -->

- `src/routes/` — file-based TanStack routes: `dashboard.tsx`/`lakes.tsx`/`lakes.$lakeId.tsx`
  (public hazard map), `alerts.tsx` (feed + broadcast), `chw.tsx` (CHW workspace),
  `admin.tsx`, `data.tsx` (Open Data page), `login.tsx`.
- `src/routes/api/` — server route handlers backing the above: `api/auth/login.ts` is
  this dashboard's _own_ login endpoint (see Gotchas); `api/public/*` are the JSON/CSV
  endpoints behind `data.tsx`, almost all reading the shared DB directly via
  `src/lib/queries.ts`.
- `src/lib/db.ts` — server-only `postgres` client for the **same PostGIS instance
  CryoHealth-api uses** (docker-compose `db` service, port 5433). Never import from
  client code — `postgres.js` needs Node's `net`/`tls`.
- `src/lib/queries.ts` — nearly every server route's data access (districts, glaciers,
  alerts, facilities, protocols, cases, KPIs) goes through here as direct SQL against the
  shared DB, not through CryoHealth-api.
- `src/lib/cryohealth-api.ts` — the one exception: the public lakes list/detail is
  fetched from CryoHealth-api's HTTP API (`CRYOHEALTH_API_URL`), not read from the DB
  directly, so it reflects that service's live tier state.
- `src/lib/jwt.ts` / `auth-guard.ts` — mints and verifies JWTs against `JWT_SECRET`,
  deliberately mirroring CryoHealth-api's `AuthService` payload shape so a token issued
  by either service is valid on the other.
- `src/lib/tier.ts` — the single source of truth for hazard-tier colors/labels
  (NORMAL/WATCH/HIGH/CRITICAL); reuse it rather than re-deriving tier styling.
- `src/components/cryohealth/` — app-specific components (`HazardMap`, `PipelineDiagram`,
  `SiteHeader`, `DemoBanner`); `src/components/ui/` is generic shadcn primitives.

## Gotchas

<!-- Only repo-wide traps that bite in ANY directory. Local conventions and test/lint
     commands go in that directory's own CLAUDE.md. Date rules that exist to work around
     a current limitation: "added YYYY-MM for <x> — re-evaluate on next model release". -->

- **This dashboard is not a pure CryoHealth-api client.** It has its own server-side
  Postgres connection (`src/lib/db.ts`) to the _same_ database CryoHealth-api owns, and
  its own `/api/auth/login` that queries the `users` table directly and mints a JWT
  itself — it does not proxy login to CryoHealth-api. The two services only agree via a
  shared `JWT_SECRET` and shared schema; neither enforces the other's request-time logic
  (e.g. `RolesGuard`) on the other's directly-issued tokens.
- **`api/public/*` is a path prefix, not a security boundary — do not read it as "no auth".**
  Four routes on it are gated: `hazard-scores.$lakeId` (GET, `requireAuth` +
  `requireRole(cryohealth_admin|facility_admin)`) and the POST handlers of `alerts.ts`
  (same roles), `alert-acks.ts` and `cases.ts` (`requireAuth`). Inversely, the two
  `*-admin.ts` routes (`lakes-admin.ts`, `facilities-admin.ts`) are deliberately
  **un**authenticated despite the name. CryoHealth-api's CLAUDE.md rule ("Open Data
  endpoints are unauthenticated by design... every other route requires a JWT") describes
  *that service's* endpoints and does not carry over to this prefix. Consequences:
  (a) never write an edge-cache/CDN rule against `/api/public/*` — `hazard-scores.$lakeId`
  is a cacheable authenticated GET whose body carries `runId`/`components` pipeline
  internals, so a prefix-wide cache rule would serve one role's data to another. It sends
  `Cache-Control: private, no-store` for exactly this reason (issue #29); any future gated
  GET added here must do the same. (b) Prefer `src/routes/api/admin/` for new
  authenticated endpoints — PRD §4 anticipated it and it now holds the admin CRUD API.
- **CryoHealth-api still owns migrations.** Never add a migration or `synchronize`-style
  schema change here — schema changes belong in CryoHealth-api even though this repo
  reads/writes the same tables.
- **`JWT_SECRET` and `DB_PORT` (5433) must exactly match CryoHealth-api's `.env`** — a
  mismatch produces silent auth failures (tokens rejected) or a "wrong" empty dataset
  (connected to a different Postgres) rather than a startup error.
- **`.lovable/plan.md` describes the original scope**, including Lovable Cloud auth/RLS
  and an AI symptom-checker that were not carried over as designed — don't treat it as
  current architecture; it predates the CryoHealth-api integration.
- Dosing/diagnosis text in the CHW flow must come from the `protocols` lookup table only,
  never be generated — mirrors the same rule in CryoHealth-app.

## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
>
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
>
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing.
Use ~/.claude/skills/gstack/... for gstack file paths (the global path).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
