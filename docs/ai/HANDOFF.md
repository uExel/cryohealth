# HANDOFF — cryohealth — 2026-08-21 PKT

Session: task14-build Model: claude-sonnet-5 Branch: <your-branch-name> Goal: facilities +
CHW profiles CRUD, following the T7 scaffold Task: #14 (parent: #3, depends on: #9)

## State

Task #14 (CRUD: Facilities + CHW profiles) is **built and verified against
tsc/eslint/vite build**, not run through `/uexel:verify`. Both resources started from
zero — no admin write path existed for either before this session, only read-only
list pages and public GET endpoints. `tsc --noEmit` is clean, `eslint` is clean
project-wide (aside from the same 2 pre-existing errors in
`lakes.$lakeId.tsx`/`glaciers.$glacierId.tsx` from prior tasks), and `vite build`'s
client bundle transforms cleanly with all four new routes present in
`routeTree.gen.ts`. The manual create/edit/delete round-trip on both resources — the
DoD's actual verification step — has **not** been confirmed done as of this
handoff.

## Done this session

- `src/lib/admin-schemas.ts`: replaced the empty `facilitySchema`/`chwProfileSchema`
  placeholders with `facilityCreateSchema`/`facilityUpdateSchema` and
  `chwProfileCreateSchema`/`chwProfileUpdateSchema`. `type`/`vulnerability` on
  facilities stay free-text strings (no enum found anywhere in the codebase to
  constrain them to — `data.tsx`'s own documented payload example uses plain
  lowercase strings). `facility.lat`/`lng` are optional (unlike `lakes.lat`/`lng`,
  since `facilities.geom` is nullable — a facility can be created unmapped).
- `src/lib/queries.ts`: added `createFacility()`/`updateFacility()`/`deleteFacility()`
  and `createChwProfile()`/`updateChwProfile()`/`deleteChwProfile()`, all going
  through the existing `writeAudit()` in the same transaction.
  `FACILITY_WRITABLE_COLUMNS`/`CHW_PROFILE_WRITABLE_COLUMNS` allowlists lock PUT to
  known-writable columns, same second-layer-lock shape as `LAKE_WRITABLE_COLUMNS`.
  `updateFacility`'s geom handling reuses `updateLake`'s conditional-fragment shape
  (`ST_SetSRID(ST_MakePoint(lng, lat), 4326)` appended only when lat/lng are present
  in the patch), adapted for a nullable column instead of `lakes`' NOT NULL one —
  when the writable-column patch is otherwise empty (a lat/lng-only edit),
  falls back to a `SET id = id` no-op filler so the query is never `SET` with
  an empty list, mirroring lakes' `updatedAt`-injection trick for the same problem
  (facilities has no `updatedAt` column to inject instead).
- Neither delete has a `HasDependentsError` pre-check — grepped the repo, nothing
  references `facility_id` or `chw_id`/`chw_profile_id` pointing at `chw_profiles`
  specifically anywhere in this codebase (`cases.chw_id` and
  `alert_acknowledgements.chw_id` reference `users`, not `chw_profiles`). A real FK
  violation this repo doesn't know about (e.g. from CryoHealth-api's schema) still
  surfaces as a clean 400 via the existing `mapDbError` 23503 case, not a raw 500 —
  reasoned omission, not an oversight, but worth confirming against the live schema
  if anyone's unsure.
- `src/routes/api/admin/facilities.ts` (new, POST) +
  `src/routes/api/admin/facilities.$facilityId.ts` (new, PUT/DELETE) — mirror
  `lakes.ts`/`lakes.$lakeId.ts`'s structure exactly (auth, `.strict()` schema
  validation, `mapDbError` in the catch). DELETE requires a `reason` via the shared
  `deleteReasonSchema`, matching the repo-wide convention on every other admin
  DELETE handler.
- `src/routes/api/admin/chw-profiles.ts` (new, POST) +
  `src/routes/api/admin/chw-profiles.$chwProfileId.ts` (new, PUT/DELETE) — same
  structure, same reason-on-delete convention.
- **`chw_profiles.user_id` is deliberately absent from both the schema and the
  forms** — there is no admin/users-listing endpoint yet (`admin.users.tsx` is
  still a bare `AdminPlaceholder`, `listUsers()` doesn't exist in `queries.ts`) to
  populate a "link to an existing user" picker from. New profiles are created with
  `user_id` left NULL by omission from the INSERT's column list. Named here as a
  scoped-out follow-up, not a silent gap — wiring this is a natural next task once
  Users & roles gets its own listing endpoint.
- `src/routes/admin.facilities.tsx`: rewritten from read-only to full CRUD — New/
  Edit/Delete actions, a create+edit `FacilityFormDialog` (name/type/district/
  vulnerability/contact/lat/lng), delete confirmation requiring a reason.
- `src/routes/admin.chw-profiles.tsx`: rewritten from read-only to full CRUD — New/
  Edit/Delete actions, a create+edit `ChwProfileFormDialog` (full_name/district via
  a `Select` sourced from the same `["admin-districts"]` query key other admin pages
  already use/phone/language), delete confirmation requiring a reason.
- Hit one real `tsc` error building `createFacility`: TypeScript couldn't narrow
  `input.lat`/`input.lng` out of `undefined` through a separately-computed `hasGeom`
  boolean passed into the postgres.js template literal — fixed by destructuring
  `lat`/`lng` out of `input` first and checking them directly in the conditional
  expression, which narrows correctly.

## Not done / deferred

- **`/uexel:verify` has not run** — built and reviewed conversationally.
- **Manual create/edit/delete round-trip on both resources**: not confirmed done.
  This is the DoD's actual verification step and the next action below.
- **Audit row confirmation**: not confirmed against the live `audit` table (no DB
  access from this session).
- **`user_id` linkage for CHW profiles**: out of scope, see above — do not treat as
  a bug in this task.
- **Explicitly clearing a facility's mapped location back to "no location"** isn't
  exposed by the current PUT patch shape (a lat/lng-only patch always sets both
  together, falling back to the existing value for whichever one wasn't sent — there's
  no way to null out `geom` once set). Named as a deliberate scope cut, not an
  oversight; a "clear location" action would need its own explicit signal (e.g. a
  `clearGeom: true` flag) if wanted later.
- Not committed/pushed — commit hash(es): **TBD, fill in below once committed.**

## Next action

1. Run `bun dev`, confirm `src/routeTree.gen.ts` regenerated and includes all four new
   routes (`/api/admin/facilities`, `/api/admin/facilities/$facilityId`,
   `/api/admin/chw-profiles`, `/api/admin/chw-profiles/$chwProfileId`) — this repo has
   hit stale-route-tree `tsc` errors on every new route file added so far, always
   resolved by a single `bun dev`/`bun run build`.
2. Do the manual create/edit/delete round-trip on both `/admin/facilities` and
   `/admin/chw-profiles`.
3. Confirm audit rows land for `facility.create/update/delete` and
   `chw_profile.create/update/delete`.
4. Commit, push, update `docs/ai/HANDOFF.md`, check CI.

## Open questions for a human

- Should `user_id` linkage for CHW profiles be its own follow-up issue, or folded
  into whatever ships Users & roles' real listing page? Currently unaddressed by
  design (see Not done, above).
- Is a "clear mapped location" action wanted for facilities, or is unmapped-only-at-
  creation-time an acceptable permanent constraint?

## Failed approaches (do not retry)

- Computing `const hasGeom = input.lat !== undefined && input.lng !== undefined`
  and referencing `input.lat`/`input.lng` again inside the SQL template based on
  that boolean — TypeScript doesn't narrow `input.lat`'s type through a separately
  stored boolean, so the postgres.js tagged-template overload rejects the
  `number | undefined` argument. Destructure the fields first
  (`const { lat, lng } = input`) and check the destructured locals directly in the
  same expression that uses them.
- (Inherited from #12/#13) Referencing a new API route file before running
  `bun dev`/`bun run build` at least once — `routeTree.gen.ts` doesn't pick up new
  files until a dev/build run. Not a code bug.

## Loops run

- None — no `/uexel:build`/`/uexel:verify` loop was used for this task.

## Files touched

`src/lib/admin-schemas.ts`, `src/lib/queries.ts`,
`src/routes/api/admin/facilities.ts` (new),
`src/routes/api/admin/facilities.$facilityId.ts` (new),
`src/routes/api/admin/chw-profiles.ts` (new),
`src/routes/api/admin/chw-profiles.$chwProfileId.ts` (new),
`src/routes/admin.facilities.tsx` (rewritten from read-only),
`src/routes/admin.chw-profiles.tsx` (rewritten from read-only),
`src/routeTree.gen.ts` (auto-generated). This file.

## Verification status

tests: n/a (no test script in this repo) review: **not yet run** — no
`/uexel:verify` pass qa: `tsc --noEmit` clean, `eslint` clean project-wide (aside
from 2 pre-existing errors untouched by this task), `vite build` client bundle
transforms and all four new routes appear in the regenerated route tree (SSR
`cloudflare:workers` failure is a pre-existing environment issue, reproduces
identically on an unmodified checkout, confirmed across tasks #12-#14). Manual
create/edit/delete round-trip on both resources: **not yet confirmed**.

## Resume with

Run the manual round-trip on both `/admin/facilities` and `/admin/chw-profiles`,
confirm audit rows for both resources, fill in commit hash(es) and branch name
above, push, check CI.
