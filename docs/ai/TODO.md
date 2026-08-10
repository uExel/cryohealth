# TODO

Working checklist for the active plan. Kept current by /uexel:build.
Plan: docs/ai/PLAN.md · Task: #6 · Goal: #3

- [x] Step 0 — pre-flight: clean tree, baseline tsc+lint green (10 warnings)
- [x] Step 1 — admin.districts.tsx: real table (name/province), verified via API (2 rows: Hunza, Ghizer)
- [x] Step 2 — admin.glaciers.index.tsx: register moved out of admin.index.tsx, links retargeted to /admin/glaciers/$glacierId
- [x] Step 3 — admin.glaciers.$glacierId.tsx: Tabs (Overview | Observations), verified via API bundle (Badswat → Ghizer, 0 observations)
- [x] Step 4 — cleanup: graphify update done, `bun run build` succeeds
- [ ] Live browser QA (dark mode, filters, tab switching) — attempted twice this session via gstack's `/browse` skill; blocked both times by a Playwright browser install for that skill that never finished cleanly in this sandbox (see docs/ai/HANDOFF.md "Failed approaches"). tsc/lint/build all green; data plumbing independently verified via curl against `/api/public/districts` and `/api/public/glaciers/<id>` (2 districts, Badswat → Ghizer district, 0 observations as expected). Remaining gap is purely visual/interactive (dark-mode pill colors, Tabs switching, filter UI) — hand off to the "Human verification checklist" in docs/ai/PLAN.md, or to `/uexel:verify`'s own judgment.
- [ ] /uexel:verify
