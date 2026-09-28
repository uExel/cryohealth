# HANDOFF — cryohealth — 2026-09-28 13:37 PKT
Session: docs-eo-pipeline  Model: claude-opus-5-5  Branch: feat/docs-geo-pipeline  Goal: none  Task: none (direct user request)

## State
PR #60 (repo links) is merged to main (255422a). New public docs page `/documentation/eo-pipeline` is on `feat/docs-geo-pipeline`, rebased onto that main, pushed, and open as PR #61 (not merged; deploys automatically after CI once merged).

- Page: two embedded Archify diagrams of CryoHealth-geo (service architecture + scene-to-hazard-score data flow), then entry points, observation pass, scene sources, hazard pass, hazard index weights/tiers, configuration, known limitations, source links. Facts taken from CryoHealth-geo origin/main a8a210c.
- Diagrams: `public/docs/geo-architecture.html`, `public/docs/geo-pipeline.html`; source JSON + visual-check evidence in `docs/architecture/cryohealth-geo*.json|png`.
- Wired into the sidebar, the /documentation overview cards, sitemap.xml, llms.txt and CLAUDE.md Map.
- Correction: the existing architecture page and system diagram said geo writes `hazard_scores`; it does not (geo POSTs, CryoHealth-api inserts in alerts.service.ts:75). Text, diagram edge label and `system-architecture.html` fixed.

## Done this session
- EO pipeline page + two geo diagrams (commit 2ea9ad1)
- hazard_scores ownership correction, legend relabel, all three diagrams re-delivered, graphify update (commit f2116ff)
- Merged PR #60 (255422a), rebased this branch onto main, opened PR #61
- Archived previous handoff to docs/ai/sessions/2026-09-28-documentation-module-handoff.md (this commit)

## Not done / deferred
- Merge PR #61 — waiting on user approval.
- Prior open items (schema.ts manual sync, #30, #20, admin.alerts.tsx TS errors) unchanged.

## Next action
gh pr view 61 --repo uExel/cryohealth   (merge on user approval, then curl https://cryohealth.io/documentation/eo-pipeline)

## Open questions for a human
- The public page says POST /run and /run-hazard on CryoHealth-geo have no auth (true, already stated in the public repo). OK to state on cryohealth.io? — blocking? no
- Merge PR #61? — blocking? yes (for it to go live)

## Failed approaches (do not retry)
- Archify dataflow: stage columns are fixed (215 px stride, 168 px stage, rows 114 px apart; renderers/dataflow/render-dataflow.mjs) — widening nodes or the viewBox does not add room. Keep node labels ~≤ 100 px and edge labels short.
- Archify dataflow: feeding 4 flows into one node's left side causes port-spread micro-segments and label collisions; bring inputs in from top/bottom with `route: "straight"` instead.
- Archify dataflow: `via` cannot move the endpoint off the side's centre, so two flows into the same side via `via` share a corridor.
- Archify visual-check writes sidecars next to the HTML (public/docs/); move them to docs/architecture/ or they deploy.

## Loops run
- none

## Files touched
src/routes/documentation.eo-pipeline.tsx (new), documentation.tsx, documentation.index.tsx, documentation.architecture.tsx, src/lib/docs/repos.ts, src/routes/sitemap[.]xml.ts, src/routeTree.gen.ts, public/llms.txt, public/docs/{geo-architecture,geo-pipeline,system-architecture}.html, docs/architecture/*, CLAUDE.md, graphify-out/*, docs/ai/HANDOFF.md, docs/ai/sessions/2026-09-28-documentation-module-handoff.md

## Verification status
tests: none in repo  lint: eslint clean on changed files  tsc: no errors in changed files (92 pre-existing elsewhere)  build: pass  archify: all 3 diagrams showcase 9/9, 0 errors/warnings; visual-check pass at 1440x900, 1600x1000, 1920x1080, 2048x1320  browser: dev server page renders both embeds, no overflow at 390px  review: advisor pass  qa: manual only

## Resume with
/uexel:orient   (then: gh pr view 61 --repo uExel/cryohealth)
