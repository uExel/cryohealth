# TODO

Working checklist for the active plan. Kept current by /uexel:build.
Plan: docs/ai/PLAN.md · Task: #8 · Goal: #3

- [x] Step 0 — pre-flight: tsc+lint baseline green (10 warnings) on HEAD before edits, dev stack up (8080/3000/5433), admin.alerts/protocols confirmed placeholders, 4 alerts/1 ack/2 protocols live
- [x] Step 1 — listAllAlerts() adds status + cleared_at: additive to the shared public query, data.tsx example payload updated same commit, verified live (1 cleared row, rest active, public /alerts unaffected)
- [x] Step 2 — admin.alerts.tsx: real table with tier/status/target/window/affected/acks/issued columns, search + tier + status filters (default ALL), verified live (4 rows, cleared alert visible by default, ack count 1/0 correct)
- [x] Step 3 — admin.protocols.tsx: real table with disaster badge (neutral, not tier-red), body truncate+expand, verified live (2 rows, disaster-first order preserved, zero tier-red matches)
- [x] Step 4 — cleanup: graphify update done (admin.alerts.tsx resolves as AlertsAdmin() node), `bun run build` succeeds
- [x] Live browser QA — not attempted this task, consistent with #6/#7's disclosed and accepted gap (gstack /browse's Playwright dependency known-broken in this sandbox). Substitute complete: tsc/lint/build all green, every data path verified live via curl, mechanical no-edit-affordance grep clean on both new files. Still open for a human to spot-check visually (dark mode, cleared-alert pill contrast, protocol body expander).
- [x] /uexel:verify — PASS WITH FINDINGS, none blocking, 0/3 fix-loop iterations used; 3 non-blocking findings filed as follow-up issues #30/#31/#32
