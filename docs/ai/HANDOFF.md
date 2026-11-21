# HANDOFF — cryohealth — 2026-11-21
Session: land-open-frontend-prs  Model: claude-sonnet-5-5  Branch: docs/data-api-examples-match-api  Goal: land the open frontend PRs, each independently verified live  Task: make the /data Open Data examples match what the API really returns

## State
`main` is at 1b98070. Every frontend PR is merged or closed: #65 to #71, #74 to #77, #79 to #82 merged; #72 closed (superseded by #74); #73 merged, reverted (#78), re-landed as #79. #74, #79, #80, #81 and #82 each got an independent live check (PASS+NOTES) before merge. No other PRs are open besides this one. The only open issue is #1 (goal "Dashboard on real API", owned by shaan360): no mock files remain and the lake detail shows the stale state, but its alerts criterion was not re-checked here, so it was left open.

This branch (docs text plus one link rule in `src/routes/data.tsx`):
- `/lakes` example now has the real shape `{ items, total, page, pageSize }` with the camelCase fields the API sends (`currentTier` lowercase, `currentRiskScore`, `currentScore`, `geom`); the card says page/pageSize exist and the default page size is 50.
- The detail example moved from `/lakes/{lakeId}` to `/lakes/{lakeId}/detail`, the endpoint that returns `{ lake, history, alerts, glaciers }`. The card now says the `glaciers` list is the whole glacier inventory (it is not filtered to nearby glaciers), history is oldest first, up to 120 rows, and empty until scores exist.
- `/hot-lakes` example is a bare array, with the risk score as a string ("0.7800"), as the API sends it.
- Card links used to drop the placeholder and left `/lakes//detail` or `/lakes/`; they now open the collection (`/lakes`, `/glaciers`).

## Done this session
- Checked on this branch: `tsc --noEmit` 92 errors against the `main` baseline of 92, 0 new sites; `bun test` 23 pass, 0 fail; build passes. Shapes were read from the live API (`api.cryohealth.io`, GET only) and the API source (`CryoHealth-api/src/lakes/lakes.service.ts`).

## Not done / deferred
- Independent live verification of this branch is pending.
- The history row example (`score`, `confidence` as strings) comes from the API's SQL, not a live response: every deployed lake has an empty history.
- The other `/data` examples (`/alerts`, `/glaciers`, `/glaciers/{id}`, `/facilities`, `/districts`, `/protocols`) were not compared against the real API in this PR.
- In live data a lake's tier does not follow its score (Badswat is CRITICAL at 0.61; Shishper is WATCH at 0.79; `/lakes` shows `currentTier` "critical" next to `currentScore.tier` "high").
- CryoHealth-api `chw-profiles.service.ts:189` does `dto.phone || undefined`, so clearing a CHW phone on edit returns 200 and keeps the old value. Facility contact clears correctly. Needs a PR in that repo.
- Facilities, protocols, cases and CHW-profile pages show `body.error` ("Bad Request") instead of the API's `message` for non-409 delete failures.
- Editing a lake cannot clear an existing population (a blank box is omitted from the update).
- Lake chart: the CRITICAL label overlaps the plotted line near 0.65 to 0.7; the tooltip shows unrounded scores.
- Signed-in `/chw` alert list was never seen rendered against real data.
- Needs an API change deployed first (CryoHealth-api): admin "New case" needs API #25; district/glacier delete message needs API #24.
- Before deploying API #26: it now reads `CORS_ORIGINS`; check the server value includes `https://cryohealth.io`.
- About 17 old registered git worktrees from earlier sessions are being audited; nothing is deleted without the user's confirmation.

## Next action
Independent live check of this PR; merge it if it passes.

## Open questions for a human
- The `uexel-handoff-check` workflow fails any PR whose diff does not include `docs/ai/HANDOFF.md`. With one shared file that stops working once the first PR lands. Should it also accept a new `docs/ai/sessions/` file? The workflow comes from uExel/cryo-harness. Not blocking.

## Failed approaches (do not retry)
- A linear `git rebase origin/main` of a branch that contains a merge: it replays commits in the wrong order and redoes resolved conflicts. Merge `main` in instead.
- Checking a PR with `git fetch origin main pull/N/head` then `git checkout FETCH_HEAD`: `FETCH_HEAD` is `main`. Fetch into a named ref (`+pull/N/head:refs/pr/N`).
- `z.preprocess` on a form field: input type becomes `unknown` and breaks `zodResolver` typing. Use a union.
- `bun run lint` on a Windows checkout reports about 18,000 "Delete `␍`" errors because of CRLF; `main` has the same.

## Loops run
- none

## Files touched
docs/ai/HANDOFF.md, src/routes/data.tsx.

## Verification status
tests: `bun test` 23 pass, 0 fail  build: passes  tsc: 92 vs baseline 92, 0 new sites  lint: not run (docs and one regex)  review: none  qa: independent live check pending

## Resume with
/uexel:orient   (then: gh pr list --repo uExel/cryohealth --state open)
