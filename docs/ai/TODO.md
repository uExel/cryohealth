# TODO

Working checklist for the active plan. Kept current by /uexel:build.
Plan: docs/ai/PLAN.md · Task: #10 · Goal: #3

- [x] Step 0 — pre-flight: tsc+lint baseline green, dev stack up, psql row counts
      matched (d=2 g=6 a=1 go=0), tokens obtained for admin-001/facility-001/chw-001
- [x] Step 1 — fill `districtSchema`/`glacierSchema` in `src/lib/admin-schemas.ts` (`9cb0a3a`)
- [x] Step 2 — `writeAudit()` helper + `createDistrict`/`updateDistrict`/`deleteDistrict` + glacier equivalents (transactional, dependent-count guard, 23505 handling)
      (`388948a`). Live-probed `sql.begin` + dynamic `sql(patch)` SET clause before
      committing (repo's first transaction).
- [x] Step 3 — `api/admin/districts.ts` (POST) + `api/admin/districts.$districtId.ts`
      (PUT/DELETE) (`13059f8`) — discharges the verb-dispatch risk. Full role matrix
      verified live: 401 no token, 403 chw, 400 zod, 200 create/update/delete, 409
      duplicate name, 409-with-counts on a seeded district with dependents, audit rows
      present for successful ops and absent for the 409'd delete (transaction rollback
      confirmed).
- [ ] Step 4 — `admin.districts.tsx`: Actions column, create/edit Dialog+Form, delete
      AlertDialog
- [ ] Steps 5-7 — same three steps for glaciers (query fns → `api/admin/glaciers.ts` +
      `glaciers.$glacierId.ts` → `admin.glaciers.index.tsx`, not `admin.glaciers.tsx`)
- [ ] Step 8 — cleanup: graphify update, full DoD verification command, final audit-table
      dump confirming all 6 action types
- [ ] /uexel:verify
