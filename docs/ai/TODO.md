# TODO

Working checklist for the active plan. Kept current by /uexel:build.
Plan: docs/ai/PLAN.md · Task: #7 · Goal: #3

- [x] Step 0 — pre-flight: dev stack up (8080/3000/5433), clean tree, tsc+lint baseline green (10 warnings), admin.lakes.index.tsx confirmed placeholder, lake_risk_scores re-confirmed no writer
- [x] Step 1 — listHazardScores() + gated hazard-scores.$lakeId endpoint: requireAuth+requireRole(cryohealth_admin, facility_admin), verified live (401 bare, 200 both admin roles, 403 chw, no 500)
- [x] Step 2 — admin.lakes.index.tsx: real list, verified live (6 lakes, 5 Hunza + 1 Ghizer, Badswat shows WATCH — real state, not all-NORMAL as planning assumed), admin.index.tsx untouched
- [x] Step 3 — admin.lakes.$lakeId.tsx: Tabs (Overview | Risk scores | Hazard scores), verified live (Badswat detail, both time-series tabs show distinct empty states, 404 on unknown lakeId, no edit-affordance grep match)
- [x] Step 4 — cleanup: graphify update done (listHazardScores() resolves as a node), `bun run build` succeeds
- [x] Live browser QA — not attempted this task. Per the recorded lesson from task #6 ("if this recurs a third time, consider it a known-broken tool in this sandbox and skip straight to the curl+static-review substitute"), the gstack `/browse` Playwright install already failed twice in task #6 with the same signature — skipped a third attempt and went straight to the curl+static-review substitute, which is complete: tsc/lint/build all green, every endpoint verified live via curl (401/200/403 role matrix, 404 handling, empty-state payloads), mechanical no-edit-affordance grep. Still open for a human to spot-check visually (dark mode toggle, tab switching, keyboard-only tab navigation on the two audit tabs).
- [ ] /uexel:verify
