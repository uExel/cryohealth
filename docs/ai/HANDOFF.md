# HANDOFF — cryohealth — 2026-11-21
Session: land-open-frontend-prs  Model: claude-sonnet-5-5  Branch: fix/issue-3-admin-delete-and-optional-fields-v2  Goal: land the open frontend PRs, each independently verified live  Task: re-land #73 (admin delete, optional contact/phone) with 0 new `tsc` errors

## State
`main` is at 9654cc2. #65 to #71, #74 to #77 are merged. #74 carried #72's commits, so #72 has nothing left to add (merging it changes no file). #73 was merged and then reverted by #78 because it added 24 `tsc` errors (`main` went from 92 to 116). This branch re-applies #73 and fixes the cause.

| PR | State | Notes |
|---|---|---|
| #72 | open, superseded | Everything in it landed through #74. Close it. |
| #74 | merged | Null-safe population/score/confidence display. Independent live check on the real API: PASS+NOTES. |
| #73 | merged, reverted by #78 | Re-landed here. |

## Done this session
- Reverted #73 (#78), verified #72 (FAIL: crash on null `downstream_population`), merged `main` into #74, verified it live (PASS+NOTES), merged it.
- This branch: reverted the revert of #73, then fixed the type errors. Cause: `z.preprocess` in `blankToNull` (`src/lib/admin-schemas.ts`) makes each field's input type `unknown`, which no longer matches the form's value type, so zodResolver's generics failed in `admin.chw-profiles.tsx`, `admin.facilities.tsx`, `admin.users.tsx`. `blankToNull` is now a union (blank string transforms to `null`, otherwise the original schema), which keeps the input type. `tsc --noEmit`: 92 errors, 0 new sites against `main`'s 92. New `src/lib/admin-schemas.test.ts` (5 tests); `bun test` 13 pass, 0 fail; build passes; lint 0 real errors.

## Not done / deferred
- Independent live verification of this branch is pending (admin pages need a login that was not available against a non-local API).
- The map popups and glacier pages still show "Downstream: 0" for a lake with no population: `src/lib/cryohealth-api.ts` lines 61 to 62 map missing values to `0`. Keep `null` there.
- Lake detail chart y-axis is 0 to 100 (`domain={[0, 100]}`) while scores are 0 to 1.
- Editing a lake cannot clear an existing population (a blank box is omitted from the update).
- API data: Ghulkin has score 0.38 but tier HIGH, which disagrees with the documented thresholds.
- Needs an API change deployed first (CryoHealth-api): admin "New case" needs API #25; district/glacier delete message needs API #24.
- Before deploying API #26: it now reads `CORS_ORIGINS`; check the server value includes `https://cryohealth.io`.

## Next action
Independent live check of this PR; merge if it passes; close #72.

## Open questions for a human
- The `uexel-handoff-check` workflow fails any PR whose diff does not include `docs/ai/HANDOFF.md`. With one shared file that stops working once the first PR lands. Should it also accept a new `docs/ai/sessions/` file? The workflow comes from uExel/cryo-harness. — blocking: no

## Failed approaches (do not retry)
- A linear `git rebase origin/main` of a branch that contains a merge: it replays commits in the wrong order and redoes resolved conflicts. Merge `main` in instead.
- Checking a PR with `git fetch origin main pull/N/head` then `git checkout FETCH_HEAD`: `FETCH_HEAD` is `main`. Fetch into a named ref (`+pull/N/head:refs/pr/N`).
- `z.preprocess` on a form field: input type becomes `unknown` and breaks `zodResolver` typing. Use a union.
- `bun run lint` on a Windows checkout reports about 18,000 "Delete `␍`" errors because of CRLF; `main` has the same.

## Loops run
- none

## Files touched
docs/ai/HANDOFF.md, src/lib/admin-schemas.ts, src/lib/admin-schemas.test.ts, plus the files #73 changed (`admin.*` routes, `cryohealth-client.ts`) restored from the revert.

## Verification status
tests: `bun test` 13 pass, 0 fail  build: passes  tsc: 92 vs baseline 92, 0 new sites  lint: 0 real errors  review: none  qa: independent live check pending

## Resume with
/uexel:orient   (then: gh pr list --repo uExel/cryohealth --state open)
