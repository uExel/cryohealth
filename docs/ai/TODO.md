# TODO

Working checklist for the active plan. Kept current by /uexel:build.
Plan: docs/ai/PLAN.md · Task: #10 · Goal: #3

- [ ] Step 0 — pre-flight: tsc+lint baseline, dev stack up, psql row-count snapshot,
      tokens for admin-001/facility-001/chw-001
- [ ] Step 1 — fill `districtSchema`/`glacierSchema` in `src/lib/admin-schemas.ts`
- [ ] Step 2 — `writeAudit()` helper + `createDistrict`/`updateDistrict`/`deleteDistrict`
      (transactional, dependent-count guard, 23505 handling)
- [ ] Step 3 — `api/admin/districts.ts` (POST) + `api/admin/districts.$districtId.ts`
      (PUT/DELETE) — discharges the verb-dispatch risk, full role-matrix + audit-row
      live verification
- [ ] Step 4 — `admin.districts.tsx`: Actions column, create/edit Dialog+Form, delete
      AlertDialog
- [ ] Steps 5-7 — same three steps for glaciers (query fns → `api/admin/glaciers.ts` +
      `glaciers.$glacierId.ts` → `admin.glaciers.index.tsx`, not `admin.glaciers.tsx`)
- [ ] Step 8 — cleanup: graphify update, full DoD verification command, final audit-table
      dump confirming all 6 action types
- [ ] /uexel:verify
