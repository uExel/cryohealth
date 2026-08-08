# HANDOFF — cryohealth — 2026-08-09 01:25 PKT
Session: hetzner-tunnel-deploy  Model: claude-sonnet-5  Branch: main  Goal: none  Task: none

## State
Fully deployed and live. `https://cryohealth.io` and `https://www.cryohealth.io` both
serve the real app (200, correct page content — verified past the status code). CD
pipeline (`deploy.yml`, workflow_run on green `ci`) confirmed working end-to-end
(`deploy #4`). `src/lib/db.ts` reads Postgres via the `HYPERDRIVE` binding (Cloudflare
Access + service token, over the `cryohealth-hetzner` Tunnel's `db.cryohealth.io` TCP
route), confirmed bound in the dashboard. Worker secrets `JWT_SECRET` (byte-identical to
cryohealth-api's), `JWT_EXPIRES`, `CRYOHEALTH_API_URL` are set. Custom domains
`cryohealth.io` and `www.cryohealth.io` are attached to the `tanstack-start-app` Worker.

## Done this session
- Hyperdrive wiring + ci.yml (this repo had none) + deploy.yml (7d6fbf0)
- Real Hyperdrive config ID (2149c3b)
- Fixed CD pipeline: `deploy.yml` never ran `bun run build` before `wrangler deploy` —
  worked locally only because the build had already happened earlier in the same shell
  session. Without it, `wrangler deploy` in CI can't resolve TanStack Start's virtual
  entry-point imports (`#tanstack-router-entry` etc.), which only exist after the Vite
  build generates `dist/server/wrangler.json` (c11fb0c)
- Cloudflare API token: original token scoped to only `Workers Scripts:Edit` wasn't
  enough (`wrangler deploy` also needs `Account Settings:Read`); replaced with a
  correctly-scoped token, `CLOUDFLARE_API_TOKEN` GitHub secret updated to match
- Custom domains `cryohealth.io` + `www.cryohealth.io` attached to the Worker in the
  Cloudflare dashboard
- End-to-end verification: both domains return 200 with real rendered page content

## Not done / deferred
- No test script in this repo (pre-existing, not this session's gap)
- Hasn't been exercised by a real user session yet (login, CHW flow, admin) — only
  verified the SSR shell renders and returns real content

## Next action
None blocking. If picking this back up: do a real click-through (login, dashboard, a CHW
case) against the production Hyperdrive-backed DB to confirm the full data path works,
not just that the shell renders.

## Open questions for a human
- none blocking

## Failed approaches (do not retry)
- Cloudflare API token scoped to only `Workers Scripts:Edit` — `wrangler deploy` needs
  `Account Settings:Read` too (wrangler does a "Getting User settings" self-check even
  for non-interactive token auth); without it: "Authentication error [code: 10000]"
- Editing an existing Cloudflare API token's permissions in the dashboard invalidates the
  token's secret value immediately (confirmed via `/user/tokens/verify` → "Invalid API
  Token" right after an in-place edit) — create a new token instead of editing one that's
  already in use anywhere
- `/user/tokens/verify` is for user-owned tokens only; it returns "Invalid API Token" for
  valid account-owned tokens too — don't use it to sanity-check an account token, test
  against the real endpoint (e.g. `wrangler deploy`) instead
- GitHub Actions "Re-run failed jobs" from the `...` menu without confirming the modal
  that appears does nothing silently — always screenshot after clicking to confirm the
  "Re-run jobs" dialog actually appeared and was confirmed
- `deploy.yml` running `bunx wrangler deploy` without a prior `bun run build` step —
  works if you happen to have built locally in the same session, fails in a clean CI
  runner with unresolvable TanStack Start virtual imports

## Loops run
- none

## Files touched
src/lib/db.ts, src/lib/cloudflare-workers.d.ts, wrangler.jsonc, .github/workflows/ci.yml,
.github/workflows/deploy.yml, tsconfig.json, bun.lock, plus incidental eslint --fix
reformatting in DemoBanner.tsx/HazardMap.tsx/SiteHeader.tsx/server.ts/
glaciers.$glacierId.tsx/lakes.$lakeId.tsx (no behavior change)

## Verification status
tests: none (repo has no test script)  review: n/a
deploy: **live** — https://cryohealth.io and https://www.cryohealth.io both return 200
with real rendered content; Hyperdrive binding confirmed in the dashboard

## Resume with
/uexel:orient
