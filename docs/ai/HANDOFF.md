# HANDOFF — cryohealth — 2026-08-19 PKT

Session: task13-build Model: claude-sonnet-5 Branch: <your-branch-name> Goal: protocol
lookup-table CRUD, no-AI-assist hard constraint Task: #13

## State

Task #13 (CRUD: Protocols — no AI-assist, hard warning banner) is **built and
verified against tsc/eslint/vite build**, not run through `/uexel:verify`. Unlike
task #12, this started from zero — there was no admin write path for protocols at
all before this session (only a public read-only GET). `tsc --noEmit` and `eslint`
are clean; `vite build`'s client bundle transforms cleanly and both new routes are
present in `routeTree.gen.ts`. The manual create/edit/delete pass against a seeded
protocol, and the visual "no AI/generate button exists" inspection the DoD calls
for, have **not** been confirmed done yet as of this handoff — that's this session's
open item.

## Done this session

- `src/lib/admin-schemas.ts`: replaced the empty `protocolSchema` placeholder with
  `protocolCreateSchema` (slug/title/category/body/source all required, `is_disaster`
  optional bool, `.strict()`) and `protocolUpdateSchema` (same minus slug — create-only,
  same rationale as `lakeCreateSchema.slug`). `source` is required in the schema even
  though the DB column is already `NOT NULL`, so a missing citation 400s with a clear
  message instead of a raw constraint violation.
- `src/lib/queries.ts`: added `createProtocol()`, `updateProtocol()`, `deleteProtocol()`
  next to the existing `listProtocols()`. `PROTOCOL_WRITABLE_COLUMNS` locks PUT to
  title/category/body/source/is_disaster (slug is create-only). Every write goes
  through the existing `writeAudit()` inside the same transaction.
  `deleteProtocol()` has **no dependents pre-check** — grepped the repo, nothing
  references `protocol_id`/`protocolId` as a FK anywhere in this codebase (unlike
  `deleteLake`/`deleteGlacier`, which check `observations`/`hazard_scores`/etc. first).
  If CryoHealth-api's schema has a FK this repo doesn't know about, a real violation
  still surfaces as a clean 400 via the existing `mapDbError` (23503 case), not a raw
  500 — so this is a reasoned omission, not an oversight, but worth confirming against
  the actual schema if anyone's unsure.
- `src/routes/api/admin/protocols.ts` (new): `POST` only, mirrors `lakes.ts`'s
  collection-route structure — same auth (`cryohealth_admin`/`facility_admin`),
  `.strict()` schema validation, 23505 → 409 on duplicate slug.
- `src/routes/api/admin/protocols.$protocolId.ts` (new): `PUT`/`DELETE`, mirrors
  `lakes.$lakeId.ts`. DELETE requires a `reason` via the shared `deleteReasonSchema`
  — **the issue's DoD doesn't explicitly call this out for protocols** (only alerts'
  issue mentioned it explicitly), but it's the repo-wide convention on every other
  DELETE handler in `api/admin/*` ("destroying reference data other tables point at
  always requires a human-supplied reason," per `deleteReasonSchema`'s own comment in
  admin-schemas.ts), so it was applied here too for consistency. Flag if this wasn't
  actually wanted for protocols specifically.
- `src/routes/admin.protocols.tsx`: rewritten from **read-only** (a bare table, no
  actions at all) to full CRUD — New/Edit/Delete buttons, a create+edit form dialog
  (`ProtocolFormDialog`), delete confirmation requiring a reason
  (`DeleteReasonField`).
- **The hard constraint**: a static, non-dismissible `NoAiAssistBanner` component
  renders inside the form dialog on every create/edit — no close button, no
  `localStorage`, no dismissal state of any kind. The form itself has zero AI/generate/
  "improve wording" affordances — just plain text/textarea/switch inputs bound
  directly to the zod schema. This is the part of the issue with zero tolerance for
  drift; do not add such an affordance later even as a "just a stub" placeholder.
- Hit and fixed the exact type-inference pitfall `LakeFormDialog` already documents in
  its own comments: switching `useForm`'s zod resolver between two _different_ schemas
  (create schema vs. `.omit({slug})`) via a ternary doesn't reconcile into one stable
  react-hook-form generic — threw 3 `tsc` errors cascading through every `FormField`.
  Fixed the same way lakes did: one stable schema
  (`protocolCreateSchema.partial({ slug: true })`) used in both modes, slug field just
  hidden in the UI for edit mode, cast only at the `handleSubmit` boundary.

## Not done / deferred

- **`/uexel:verify` has not run** — built and reviewed conversationally.
- **Manual create/edit/delete pass against a seeded protocol**: not confirmed done.
  This is the next action, see below.
- **DoD's explicit visual check** — "confirm no AI/generate button exists anywhere
  in the form by inspection" — not confirmed done. This has no automated signal;
  someone needs to actually open the rendered dialog and look.
- **Audit row confirmation**: not confirmed against the live `audit` table (no DB
  access from this session).
- Not committed/pushed — commit hash(es): **TBD, fill in below once committed.**

## Next action

1. Run `bun dev`, confirm `src/routeTree.gen.ts` regenerated (check for
   `/api/admin/protocols` and `/api/admin/protocols/$protocolId` entries — this repo
   hit stale-route-tree `tsc` errors on both new files before the first `bun dev`
   after creation, resolved by that rebuild alone).
2. Do the manual create/edit/delete pass end-to-end (see testing steps below).
3. Actually look at the rendered form dialog and confirm no AI/generate affordance
   exists — the DoD requires this be checked by eye, not assumed from the diff.
4. Confirm audit rows land in the `audit` table for each write.
5. Commit, push, update `docs/ai/HANDOFF.md`, check CI.

## Open questions for a human

- Was the `reason`-required-on-delete convention actually wanted for protocols, or
  should protocol deletes be reason-free (unlike alerts, whose issue explicitly
  named the reason requirement)? Applied here for consistency with the rest of
  `api/admin/*`, but the issue text for #13 didn't say so explicitly — worth a
  sanity check against product intent.

## Failed approaches (do not retry)

- Ternary between `protocolCreateSchema` and `protocolCreateSchema.omit({slug:
true})` as the `useForm` resolver, switched on `mode` — throws `tsc` errors on
  every `FormField`'s `name`/`value` typing (`"slug" is not assignable to type
"title" | "source" | ...`, plus a `value: string | boolean` union collapsing
  incorrectly onto `Input`). Use one stable schema
  (`protocolCreateSchema.partial({ slug: true })`) instead, same as
  `LakeFormDialog`'s own documented fix for the identical issue.
- Referencing a new API route file before running `bun dev`/`bun run build` at
  least once — `src/routeTree.gen.ts` is auto-generated and file-creation alone
  doesn't trigger it; the editor's TS server will show `2345`/`2339` errors on
  `createFileRoute(...)` and `params.<newParam>` until a dev/build run picks the
  new file up. Not a code bug — same pattern as task #12's alerts route.

## Loops run

- None — no `/uexel:build`/`/uexel:verify` loop was used for this task.

## Files touched

`src/lib/admin-schemas.ts`, `src/lib/queries.ts`,
`src/routes/api/admin/protocols.ts` (new),
`src/routes/api/admin/protocols.$protocolId.ts` (new), `src/routes/admin.protocols.tsx`
(rewritten from read-only), `src/routeTree.gen.ts` (auto-generated). This file.

## Verification status

tests: n/a (no test script in this repo) review: **not yet run** — no
`/uexel:verify` pass qa: `tsc --noEmit` clean, `eslint` clean (project-wide, aside
from 2 pre-existing errors in `lakes.$lakeId.tsx`/`glaciers.$glacierId.tsx`
untouched by this task), `vite build` client bundle transforms and both new routes
appear in the regenerated route tree (SSR `cloudflare:workers` failure is a
pre-existing environment issue, reproduces identically on an unmodified checkout).
Manual create/edit/delete pass: **not yet confirmed**. Visual no-AI-assist
inspection: **not yet confirmed**.

## Resume with

Run the manual test pass below, confirm the banner/no-AI-assist check by eye,
confirm audit rows, fill in commit hash(es) and branch name above, push, check CI.
