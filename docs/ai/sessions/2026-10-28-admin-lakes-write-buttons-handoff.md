# HANDOFF — cryohealth — 2026-10-28
Session: admin-lakes-write-buttons  Model: claude-sonnet-5-5  Branch: fix/admin-lakes-hide-write-buttons-for-facility-admin  Goal: none  Task: frontend follow-up to CryoHealth-api#28

## State
This branch is not merged or deployed. It is the frontend follow-up that CryoHealth-api PR #28 asks for. #28 limits `POST/PUT/DELETE /admin/lakes` to `cryohealth_admin`, so a `facility_admin` who clicks "New lake", "Delete" or "Edit lake" in the portal gets a 403. This branch disables those three buttons for anyone who is not `cryohealth_admin`, the same way `src/routes/admin.cases.tsx` does for "New case".

## Done this session
- `src/routes/admin.lakes.index.tsx`: "New lake" and the per-row "Delete" are disabled unless `isCryoHealthAdmin`; a short hint under "New lake" says why.
- `src/routes/admin.lakes.$lakeId.tsx`: "Edit lake" is disabled unless `isCryoHealthAdmin`, with the same hint.
- Read access is unchanged: a `facility_admin` still sees the lake list and detail pages.
- `bun run build` pass; `npx prettier@3.8.3 --check` on both files pass.
- `docs/ai/HANDOFF.md` is the shared text used by PRs #65 to #73, so it does not conflict with them; this note is the handoff for this branch.

## Not done / deferred
- Not opened in a browser as a `facility_admin` (needs a login). Please check: log in as `facility_admin`, the three buttons are greyed out and the hint shows; log in as `cryohealth_admin`, they work as before.
- The other admin pages (districts, glaciers, protocols, facilities, CHW profiles) have the same kind of gap; that is the open question in PR #73 and needs a human decision, so it is not touched here.
- Merge this together with, or after, CryoHealth-api PR #28. Before #28 is deployed the buttons are disabled for `facility_admin` even though the API would still have allowed the write.

## Next action
Review the PR. Check the two cases above in a browser.

## Open questions for a human
- Should `facility_admin` be allowed to edit lakes after all (widen the API roles) instead of hiding the buttons? — blocking: no
