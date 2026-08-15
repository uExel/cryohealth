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
- [x] Step 4 — `admin.districts.tsx`: Actions column, create/edit Dialog+Form, delete
      AlertDialog (`6dc799a`). Note: glacier routes/queries were built alongside
      districts' in steps 2/3 (one commit per layer covering both resources) rather
      than as separate steps 5/6 — a deliberate deviation from the plan's literal
      one-step-per-resource split, named in the build report.
- [x] Steps 5-7 — glacier UI: Actions column, create/edit Dialog+Form (all writable
      fields), delete AlertDialog on `admin.glaciers.index.tsx` (not `admin.glaciers.tsx`)
      (`1d48a4c`). Both delete-guard branches verified live, including inserting a real
      `glacier_observations` row via psql to exercise the 409 branch (0 rows normally).
      Dropped `glacierSchema.status`'s zod `.default()` — it broke the resolver/Control
      type interop with react-hook-form; the DB default + form defaultValues cover it.
- [x] Step 8 — cleanup: graphify update done, full DoD verification command clean
      (tsc/lint/build), final audit-table dump confirms all 6 action types present
      (district.create/update/delete ×1 each, glacier.create ×3, glacier.update ×1,
      glacier.delete ×3 — from verification round-trips, all test rows cleaned up,
      counts back to baseline: districts=2, glaciers=6, glacier_observations=0)
- [ ] /uexel:verify
