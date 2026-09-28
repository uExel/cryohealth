# HANDOFF — cryohealth — 2026-09-28 12:20 PKT
Session: documentation-module  Model: claude-opus-5-5  Branch: feat/docs-repo-links  Goal: none  Task: none (direct user request)

## State
The public documentation module is **live** at https://cryohealth.io/documentation. PR #58 merged to main as 2b53a4b; CI and the auto-deploy workflow (`deploy.yml`, runs `wrangler deploy` after CI succeeds on main) both passed. All three pages, the diagram asset, sitemap.xml and llms.txt return 200 in production.

Follow-up on `feat/docs-repo-links` (commit 3b10824, PR open, not merged): the docs pages now link the four GitHub repos (all verified PUBLIC, every link 200 anonymously) via one shared list in `src/lib/docs/repos.ts`, plus ARCHITECTURE.md, HAZARD_METHODOLOGY.md, the diagram source, and the api migrations folder.

- `/documentation` overview, `/documentation/architecture` (embedded Archify diagram, theme-aware, full-screen link), `/documentation/schema` (17 tables, 21 FKs, 5 enums).
- Schema content is hand-transcribed from all 11 CryoHealth-api migrations into `src/lib/docs/schema.ts`, stamped as of `1790097238238-BackfillProtocolSteps`.
- The workspace-root `docs/` folder (outside any git repo) was moved in: diagram HTML → `public/docs/system-architecture.html`, source JSON + visual-check evidence → `docs/architecture/`. Root originals deleted after byte-identical `cmp`.
- Header nav "Docs" link (en + ur), sitemap.xml, llms.txt, and CLAUDE.md Map updated.

## Done this session
- Documentation module built (commit a536c20)
- PR #58 opened, merged (2b53a4b) and deployed; verified live with curl
- This handoff update shipped as a follow-up PR (#59, merged)
- GitHub repo links added to the docs pages (commit 3b10824; PR open)
- Archived previous handoff to docs/ai/sessions/2026-09-27-alert-broadcast-fix-handoff.md (this commit)

## Not done / deferred
- `schema.ts` does not auto-sync; every new CryoHealth-api migration must be replayed into it by hand (noted in CLAUDE.md).
- Previous handoff's open items (stale CLAUDE.md architecture section, #30, #20, `unknown`-typed TS errors in admin.alerts.tsx) are unchanged.

## Next action
gh pr view feat/docs-repo-links --repo uExel/cryohealth   (merge on user approval; deploy is automatic after CI on main)

## Open questions for a human
- Merge the repo-links PR? — blocking? yes (for it to go live)
- Only CryoHealth-api and cryohealth have a LICENSE file (MIT); CryoHealth-geo and cryohealth-app have none, so the docs deliberately say "public", not "MIT". Add licenses there? — blocking? no
- Resolved: Archify visual-check PNGs stay in `docs/architecture/` (user decision 2026-09-28).

## Failed approaches (do not retry)
- `grep` in this shell is aliased to ugrep and silently returned nothing when piped from curl on large SSR pages — extract links with Python instead.
- Iframe src `/docs/system-architecture` (extensionless) — Workers assets 307 `.html` → extensionless in prod, but Vite dev only serves public/ by exact filename. Keep the `.html` src; the prod redirect is harmless.
- `activeProps={{ className }}` for the sidebar active state — loses the Tailwind conflict to base `border-transparent`/`text-muted-foreground`. Use `data-[status=active]:` variants.
- `wrangler dev -c dist/server/wrangler.json` without a Hyperdrive local string fails to start; set `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` (a dummy works for pages that don't hit the DB).
- Chrome `resize_window` did not change the viewport; measure phone width by loading pages into a 390px same-origin iframe instead.

## Loops run
- none

## Files touched
src/routes/documentation.tsx, documentation.index.tsx, documentation.architecture.tsx, documentation.schema.tsx, src/lib/docs/schema.ts, public/docs/system-architecture.html, docs/architecture/*, src/components/cryohealth/SiteHeader.tsx, src/lib/i18n.tsx, src/routes/sitemap[.]xml.ts, public/llms.txt, src/routeTree.gen.ts, CLAUDE.md, graphify-out/*, docs/ai/HANDOFF.md, docs/ai/sessions/2026-09-27-alert-broadcast-fix-handoff.md

## Verification status
tests: none in repo  lint: 0 errors (13 pre-existing warnings, none in new files)  build: pass  built worker: all 3 pages + diagram 200, sitemap/llms.txt 200  browser: nav, anchors, sidebar active state, dark-mode diagram, no overflow at 390px  review: none  qa: manual only  prod: all /documentation URLs 200 after deploy

## Resume with
/uexel:orient   (then: gh pr view feat/docs-repo-links --repo uExel/cryohealth)
