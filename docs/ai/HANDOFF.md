# HANDOFF — cryohealth — 2026-08-09 00:41 PKT

Session: hetzner-tunnel-deploy Model: claude-sonnet-5 Branch: main Goal: none Task: none

## State

Worker (`tanstack-start-app`) is live at https://tanstack-start-app.shaan.workers.dev,
deployed manually from local (`bunx wrangler deploy` with a Cloudflare API token).
`src/lib/db.ts` now reads Postgres via the `HYPERDRIVE` binding (Cloudflare Access +
service token, over the `cryohealth-hetzner` Tunnel's `db.cryohealth.io` TCP route) when
present, falling back to discrete `DB_*` vars in local dev. `wrangler.jsonc` has the real
Hyperdrive config ID (`bd83991e0c8d4562a1ebbc217252b216`). Worker secrets `JWT_SECRET`
(byte-identical to cryohealth-api's), `JWT_EXPIRES`, `CRYOHEALTH_API_URL` are set via
`wrangler secret put`. `deploy.yml` (workflow_run on green `ci`) exists but has not yet
completed a successful run end-to-end — see Failed approaches.
`cryohealth.io` custom domain is NOT yet attached to the Worker; it's only reachable at
the workers.dev URL for now.

## Done this session

- Hyperdrive wiring + ci.yml (this repo had none) + deploy.yml (7d6fbf0)
- Real Hyperdrive config ID (2149c3b)
- Manual `wrangler deploy` succeeded locally; Worker secrets set

## Not done / deferred

- `cryohealth.io` / `www` custom domain not attached to the Worker — still needs a
  Workers custom domain route added in the Cloudflare dashboard
- `deploy.yml` GitHub Actions run not yet confirmed green (see below)
- CryoHealth-api and CryoHealth-geo deploys to the Hetzner box (`ubuntu-4gb-hel1-1`,
  204.168.190.206) are blocked on a GHCR pull PAT — asked the user for one, awaiting
  reply. `geo`'s CDSE_CLIENT_ID/SECRET on the server are still `REPLACE_ME` placeholders
  (geo container not started yet pending real Copernicus credentials)

## Next action

Once the user supplies a GHCR read:packages PAT: `docker login ghcr.io` on the Hetzner
box (see cryohealth-infra/README.md step 3a), then re-run the failed CryoHealth-api and
CryoHealth-geo `deploy` workflow runs from the GitHub Actions UI.

## Open questions for a human

- GHCR pull PAT for the deploy box — blocking: yes (blocks cryohealth-api/geo deploys)
- Real CDSE_CLIENT_ID/SECRET for geo's production Sentinel-2 source — blocking: no (geo
  falls back to Planetary Computer, and isn't started yet anyway)
- Attach cryohealth.io custom domain to the Worker now, or later? — blocking: no

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

## Loops run

- none

## Files touched

src/lib/db.ts, src/lib/cloudflare-workers.d.ts, wrangler.jsonc, .github/workflows/ci.yml,
.github/workflows/deploy.yml, tsconfig.json, bun.lock, plus incidental eslint --fix
reformatting in DemoBanner.tsx/HazardMap.tsx/SiteHeader.tsx/server.ts/
glaciers.$glacierId.tsx/lakes.$lakeId.tsx (no behavior change)

## Verification status

tests: none (repo has no test script) review: n/a qa: manual `wrangler deploy` verified working

## Resume with

/uexel:orient (then: check with user whether the GHCR PAT was provided, then finish
CryoHealth-api/geo deploys and attach the cryohealth.io custom domain to the Worker)
