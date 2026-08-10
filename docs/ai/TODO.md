# TODO

Working checklist for the active plan. Kept current by /uexel:build.
Plan: docs/ai/PLAN.md · Task: #6 · Goal: #3

- [x] Step 0 — pre-flight: clean tree, baseline tsc+lint green (10 warnings)
- [x] Step 1 — admin.districts.tsx: real table (name/province), verified via API (2 rows: Hunza, Ghizer)
- [x] Step 2 — admin.glaciers.index.tsx: register moved out of admin.index.tsx, links retargeted to /admin/glaciers/$glacierId
- [x] Step 3 — admin.glaciers.$glacierId.tsx: Tabs (Overview | Observations), verified via API bundle (Badswat → Ghizer, 0 observations)
- [x] Step 4 — cleanup: graphify update done, `bun run build` succeeds
- [x] Live browser QA — not completed (Playwright install stalled twice); judged an acceptable disclosed gap by both verifier passes given tsc/lint/build green + curl-verified data plumbing. Still open for a human via docs/ai/PLAN.md's "Human verification checklist".
- [x] /uexel:verify — PASS (fix-loop 1/3 used: error handling + 2 dropped-content fixes; 3 minor findings deferred to issues #24/#25/#26)
