# LEARNINGS

Team-shared lessons, maintained by /uexel:learn via uexel-scribe. Dated one-liners with
the why. Only lessons a teammate benefits from — personal notes belong to auto-memory.

- 2026-08-09: `deploy.yml` ran `bunx wrangler deploy` right after `bun install`, with no
  build step in between. It only worked when tested manually from a local shell because a
  `bun run build` had already happened earlier in that same session (which generates
  `dist/server/wrangler.json`, the actual config wrangler reads). On a clean CI runner
  with no prior build, `wrangler deploy` tries to bundle `src/server.ts` directly and
  fails with esbuild errors resolving TanStack Start's virtual entry-point imports
  (`#tanstack-router-entry`, `#tanstack-start-entry`, `#tanstack-start-plugin-adapters`,
  `tanstack-start-manifest:v`) — those only exist after the Vite build runs. Fixed by
  adding a `bun run build` step before `wrangler deploy` in deploy.yml (mirroring the
  build step ci.yml already ran). A deploy script that "works locally" after manual
  testing can hide a missing build step that only breaks in a truly clean CI environment
  — always test deploy workflows in CI itself, not just by replaying the commands locally
  after other setup has already happened in the same shell.
- 2026-08-09: a Cloudflare API token scoped to only `Account.Workers Scripts:Edit` is not
  sufficient for `wrangler deploy` — it also needs `Account.Account Settings:Read`.
  Without it, wrangler fails the actual deploy request with a generic
  `Authentication error [code: 10000]` and then a secondary `Invalid access token
  [code: 9109]` on a "Getting User settings" self-check it runs even for non-interactive
  token-based auth. Separately: editing an existing Cloudflare API token's permissions in
  the dashboard (not rolling it, just adding a permission policy) invalidates the token's
  secret value immediately — confirmed by calling `/user/tokens/verify` right after an
  in-place permission edit and getting "Invalid API Token" for a token that had been
  working moments before. (`/user/tokens/verify` is itself unreliable for sanity-checking
  account-scoped tokens — it's meant for user-owned tokens and returns "Invalid API
  Token" even for valid account tokens; test against the real target endpoint instead,
  e.g. an actual `wrangler deploy`.) If a Cloudflare API token needs more permissions,
  create a fresh token rather than editing the existing one's policy in place, especially
  if that token is already stored anywhere (a GitHub secret, a CI env var) — editing
  breaks it immediately for everyone using it.
