# TODO

Working checklist for the active plan. Kept current by /uexel:build.
Plan: docs/ai/PLAN.md · Task: #9 · Goal: #3

- [x] Step 0 — pre-flight: tsc+lint baseline green (10 warnings), dev stack up, all 3 target routes confirmed placeholders, GET /api/public/facilities returns 0 (live trap confirmed), GET /api/public/cases has no handler (SSR shell, no data leak) — psql access denied (no .env read), substituted endpoint-level verification throughout
- [x] Step 1 — three new query functions: listFacilitiesAdmin(), listCasesAdmin(limit=200), listChwProfiles() in queries.ts. Additive only, no passwordHash, no SELECT \*
- [x] Step 2 — facilities-admin + chw-profiles endpoints, both ungated: plan gap fixed (Step 5 assumed a chw-profiles endpoint with no step creating it — added here). Verified live: facilities-admin returns 1 row with has_geom=false (no join throw on the varchar district), public /api/public/facilities still 0, chw-profiles returns []
- [x] Step 3 — gated GET /api/admin/cases, the repo's first authenticated GET: requireAuth+requireRole(cryohealth_admin, facility_admin). Full role matrix verified live: 401 no token, 200 cryohealth_admin (4 cases, 1 disaster-related), 200 facility_admin, 403 chw, no passwordHash
- [x] Step 4 — admin.facilities.tsx: real table, Mapped column honestly shows "No location", verified live (1 row, Hassanabad BHU)
- [x] Step 5 — admin.chw-profiles.tsx: real table with honest empty-state copy naming no writer exists, verified live (200 with empty array, not an error)
- [x] Step 6 — admin.cases.tsx: real table, authFetch against the gated endpoint, disaster badge matches admin.protocols.tsx's exact markup (not tier-red), verified live (4 rows newest-first, exactly 1 disaster badge, no-token access 401s)
- [x] Step 7 — cleanup: graphify update done (CasesAdmin() resolves as a node), `bun run build` succeeds
- [x] Live browser QA — not attempted this task, consistent with #6/#7/#8's disclosed and accepted gap (gstack /browse's Playwright dependency known-broken in this sandbox). Substitute complete: tsc/lint/build all green, every data path (including the full auth role matrix on the new gated endpoint) verified live via curl, mechanical no-edit-affordance and no-tier-red greps clean on all three new files. Still open for a human to spot-check visually (dark mode, disaster badge contrast, symptoms/protocol body expanders).
- [ ] /uexel:verify
