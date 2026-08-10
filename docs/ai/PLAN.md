# PLAN

Goal: [#3 — CryoHealth admin portal — sidebar CRUD + platform monitoring](https://github.com/uExel/cryohealth/issues/3)
Task: [#5 — Shared admin components: StatCard extraction, StatusPill token fix, requireRole helper](https://github.com/uExel/cryohealth/issues/5)

Scope: extract shared display components and harden two primitives nearly every
downstream #3 task (#6-#19) will consume. No CRUD, no new routes, no data fetching.

## Assumptions & blast radius

- **Auth-adjacent, but no behavior change to any live request path.** `requireRole()`
  (added in #4, commit `0ba00ac`) currently has **zero call sites** — confirmed via
  grep. This task gives it its first caller (`api/public/alerts.ts`) and changes its
  signature while that's still free to do. No other endpoint is touched;
  `cases.ts`/`alert-acks.ts` intentionally stay role-open (any authenticated user can
  log a case or ack an alert) and must **not** gain a `requireRole` call.
- **No migrations, no user data.** Pure refactor (component extraction) + one
  signature change + a new unused-until-consumed schema file.
- **`requireRole`'s DoD text is partially stale.** Issue #5 says "Add `requireRole()`
  to `auth-guard.ts`" as if from scratch — it already exists (task #4). The real,
  undone half of that DoD line is wiring `alerts.ts` as its first caller. Documenting
  this now so `/uexel:verify` doesn't read "already exists" as scope creep beyond the
  issue.
- **Working tree is clean, branch is `main`, up to date with `origin/main`** (verified
  by the planning agent this session — no Step 0 stash needed, unlike #4).

## What already exists (reused, not rebuilt)

- `src/lib/auth-guard.ts` — `requireAuth()` (throws `AuthError` carrying a `Response`)
  is the pattern `requireRole()` will now match, instead of diverging from it.
- `src/routes/api/public/alerts.ts:12-23` — the existing `try { requireAuth(...) } catch
(e) { if (e instanceof AuthError) return e.response; throw e }` wrapper. `requireRole`
  moves inside this same try block — zero new lines of error-handling boilerplate.
- `src/lib/tier.tsx` — design-system tier tokens (`--color-normal/-watch/-high/-critical`
  and `-soft` variants) `StatusPill` will map onto. **Not** reused directly: glacier
  stability (`stable/retreating/advancing/surging/unknown`) is a different semantic axis
  than hazard tier (`NORMAL/WATCH/HIGH/CRITICAL`) — see deviation #2 below. Reuse the
  _tokens_, not `Tier`/`TierBadge`.
- `src/components/cryohealth/AdminPlaceholder.tsx` — precedent for one file exporting
  multiple small named components (`AdminPlaceholder` + `CryoHealthAdminOnly`).
  `StatCard.tsx` follows the same shape.
- `zod@3.25.76` (declared `^3.24.2`) and `@hookform/resolvers`/`react-hook-form` are
  already dependencies — no install needed. Use `import { z } from "zod"` (v3 classic
  API), not the `zod/v4` subpath the same package also ships.

## NOT in scope (deferred, with rationale — filing 3 follow-up issues, not silently dropping)

- **`--color-muted`/`--muted-foreground` naming collision** (`src/styles.css` declares
  `--color-muted` twice — a `@theme inline` alias and a later, unlayered literal).
  **Correction post-verify**: `@theme inline` inlines its referenced value at Tailwind's
  build time, so `.bg-muted` compiles straight to `background-color: var(--muted)` and
  never reads the later literal at all — `bg-muted`/`text-muted-foreground` resolve to
  genuinely different colors (`--color-surface` vs `--color-muted`) in both themes, not
  the same one. No active contrast bug; confirmed against the built stylesheet. What's
  real is a fragile naming collision (two different variables sharing one custom-
  property name), worth a rename for clarity but not urgent — downgraded from `bug` to
  `type:chore`/`prio:p3` on issue #21 after `/uexel:verify` caught the original claim
  was wrong. See issue #21's correction comment for the full trace.
- **`glaciers.$glacierId.tsx:432-435` `driverMeta` hardcoded palette** (`bg-blue-100`
  etc., same bug class as `StatusPill` but not named in the DoD, and the file is
  already half-migrated — its `risk` entry is correctly tokenized, `factor` isn't) —
  **file as its own issue.**
- **`dashboard.tsx:250` `Kpi` component** — a 5th `Stat`-shaped card (adds an icon slot)
  that could converge onto `StatCard` once it grows an optional `icon` prop. Not this
  task's DoD; giving `StatCard` an `icon?: React.ReactNode` prop now costs nothing and
  avoids a 6th duplicate appearing in #6-#19's admin KPI rows, but the `Kpi` call sites
  themselves are not migrated here — **file as its own issue** so it doesn't get lost.
- **Fixing issue #20** (`/lakes/$lakeId` renders the list, not the detail page) —
  already filed, already out of scope for this task; it just means `StatCard`'s
  presence in `lakes.$lakeId.tsx` can only be checked by code-inspection + `tsc`, not
  by visiting the page (see Step 2's verify note).
- **Filling in real per-resource `zod` schemas** (districts, glaciers, etc. field
  lists) — that's #10-#19's job as each CRUD task lands; this task ships the file and
  pattern, not the content.

## Deviations from the DoD's literal text (state now, don't let /uexel:verify discover them)

1. **`index.tsx:383`'s `Stat` is not a duplicate of the other three** — it renders
   `<dt>/<dd>` inside a `<dl>` on the landing-page hero, with no card chrome, `string`-
   only value, vs. the other three's `<div>` card with `React.ReactNode` value and
   (for `admin.index.tsx`) a `tone` prop. Swapping it for card-chrome `StatCard` would
   break `<dl>` content validity and visually break the site's most-viewed page. Fix:
   `StatCard.tsx` exports **two** components — `StatCard` (card, `tone`, superset of
   the `admin.index.tsx`/`lakes.$lakeId.tsx`/`glaciers.$glacierId.tsx` shape) and
   `StatPair` (`<dt>/<dd>`, for `index.tsx` only).
2. **`StatusPill` lands on design-system tokens, not the `Tier` type.** Glacier
   stability has 5 states that don't map 1:1 onto the 4 hazard tiers, and reusing `Tier`
   would risk `surging`/`retreating` rendering in tier-red — which the workspace
   CLAUDE.md reserves exclusively for CRITICAL hazard alerts. `HazardMap.tsx:36-37` and
   `glaciers.$glacierId.tsx:434-435` already document this exact reasoning for adjacent
   code. `StatusPill` reuses the `--color-watch`/`--color-normal` _tokens_, mapped the
   same way `admin.index.tsx`'s existing `tone` prop already does (`retreating`/
   `surging` → warn/watch, `stable` → ok/normal), not `TierBadge`.
3. **`requireRole` changes its return type from `Response | null` to throwing
   `AuthError`**, matching `requireAuth`. The DoD's `requireRole(claims, roles: Role[])`
   names only the parameters, not the return shape. Justification: `Response | null`
   is fail-open — a caller that writes `requireRole(claims, [...])` as a bare statement
   (forgetting to check the return) compiles clean and lints clean (this repo's
   `eslint.config.js` has no `no-unused-expressions` rule) while silently granting
   access. `requireAuth`'s sibling pattern already throws for the identical reason.
   Every future `api/admin/*` handler (#10-#19) will wrap both calls in the one
   existing `try/catch`, at zero extra cost. This is the one behavior-shaped decision
   in this plan — flagged here for GATE, not slipped in silently.
4. **`glaciers.$glacierId.tsx:31-37`'s `statusColor` is folded into the same
   extraction**, even though the DoD only names `admin.tsx:302`. It's a byte-identical
   copy of `StatusPill`'s color map, used on a **public** page (`:177` header badge,
   `:303` observations table) — leaving it behind means the DoD's "verify in dark mode"
   requirement passes on `/admin` while the identical bug stays live on `/glaciers/$id`.
5. **Schema placeholders use `.strict()` empty-shape stubs, not bare `z.object({})`** —
   an unfilled `z.object({})` accepts any payload (fail-open, same class of bug as
   deviation #3); `.strict()` rejects everything until a CRUD task fills in real fields,
   which is the safe failure direction for a stub nobody's supposed to call yet.

## Test coverage note

No test framework in this repo. `bunx tsc --noEmit && bun run lint` (the issue's own
verification command) cannot catch: an orphaned unused local `Stat` left behind after
extraction (`@typescript-eslint/no-unused-vars` is off), a `StatusPill` variant that
doesn't actually change background color in dark mode, or `requireRole` regressing
`alerts.ts`'s existing 401/403 behavior. Per-step `grep` checks and one dark-mode
toggle check below cover what `tsc`/`lint` structurally cannot.

## Steps

### Step 0 — pre-flight (not a commit)

Confirm clean tree and green baseline: `git status --short` (expect only the untracked
graphify cache stamp), `bunx tsc --noEmit && bun run lint && bun run build`.
**Verify:** all three exit 0, lint warning count is exactly 10 (the current pre-existing
`react-refresh/only-export-components` baseline) — record this number now so Step 2's
verify can detect a regression `bun run lint`'s own exit code won't flag.

### Step 1 — `requireRole()` throws, wired into `alerts.ts`

Edit `src/lib/auth-guard.ts`: change `requireRole(claims: JwtPayload, roles: Role[]): Response | null` to throw `AuthError` (same class `requireAuth` throws) instead of returning a `Response`; update `AuthError`'s docstring (currently scoped to "thrown by requireAuth") to cover both callers, and its default message away from "Unauthorized"-only phrasing if it's used as the literal string anywhere a 403 case would need a different one — check `AuthError`'s constructor before assuming the message is generic enough to reuse as-is; if not, add an optional `status`/`message` param defaulting to today's 401 behavior. Edit `src/routes/api/public/alerts.ts:12-23`: add `requireRole(claims, ["cryohealth_admin", "facility_admin"])` inside the existing `try` block, immediately after `requireAuth`, and delete the now-redundant inline `if (claims.role !== "cryohealth_admin" && claims.role !== "facility_admin") { return Response.json(...) }` check it replaces.
**Verify:** `bunx tsc --noEmit && bun run lint`. `grep -rn "claims.role !==" src/routes/api/` → empty. `grep -rn "requireRole" src/routes/` → exactly 1 hit (the new call in `alerts.ts`). `grep -rln "requireRole" src/lib/auth-guard.ts src/routes/api/public/cases.ts src/routes/api/public/alert-acks.ts` → confirm `cases.ts`/`alert-acks.ts` do NOT gain a `requireRole` call (they intentionally stay role-open).

### Step 2 — extract `StatCard` / `StatPair` / `StatusPill`

New `src/components/cryohealth/StatCard.tsx`, following `AdminPlaceholder.tsx`'s
multi-named-export shape (plain `export function`, no default export, no `React.FC`,
status/tone class maps as module-private `const` — **not** `export const`, to avoid
pushing the repo's `react-refresh/only-export-components` warning count from 10 to 11):

- `StatCard({label, value, tone?}: {label: string; value: React.ReactNode; tone?: "default"|"danger"|"warn"|"ok"; icon?: React.ReactNode})` — card chrome + tone-to-token mapping, modeled on `admin.index.tsx`'s current `Stat` (the superset variant). `icon` is optional and unused by this task's call sites — added now so `dashboard.tsx`'s `Kpi` can converge onto it later without a second breaking prop change (see NOT-in-scope note; do not migrate `Kpi`'s call sites in this task).
- `StatPair({label, value}: {label: string; value: string})` — the `<dt>/<dd>` shape, replacing `index.tsx`'s `Stat`.
- `StatusPill({status}: {status: string})` — merges `admin.index.tsx`'s `StatusPill` map and `glaciers.$glacierId.tsx`'s byte-identical `statusColor` map into one, defaulting unrecognized values to the `unknown` style internally (fixes `glaciers.$glacierId.tsx:303`'s current no-fallback `undefined` class bug as a side effect — note this in the commit message as an intentional fix, not scope creep).

Delete the local `Stat`/`StatusPill`/`statusColor` definitions from all 4 sites and import from the new file: `admin.index.tsx`, `lakes.$lakeId.tsx`, `glaciers.$glacierId.tsx` (import `StatCard` + `StatusPill`, update both `:177` and `:303` use sites), `index.tsx` (import `StatPair`).

**Verify:** `bunx tsc --noEmit && bun run lint` (warning count still 10). `grep -rn "^function Stat\b\|^function StatusPill\b\|^const statusColor" src/routes/` → empty (nothing orphaned). `bun run build`. Manual: `/`, `/admin`, `/glaciers/<any-id>` in both light and dark — confirm every `StatusPill`/`StatCard` background actually changes color when toggling `.dark` on `<html>` (this is the real bug — a fixed-light chip that stays readable but doesn't participate in the theme; contrast alone won't catch it). `lakes.$lakeId.tsx` gets `tsc`-only verification, not a live check — issue #20 (`/lakes/$lakeId` Outlet bug, already filed, out of scope here) makes that route unreachable in its intended form.

### Step 3 — `StatusPill` colors onto design-system tokens

Replace `StatusPill`'s hardcoded `bg-blue-100 text-blue-800` / `bg-emerald-100 text-emerald-800` / `bg-purple-100 text-purple-800` / `bg-slate-100 text-slate-700` with the same tone-to-token mapping `StatCard`'s `tone` prop already uses (`retreating`/`surging` → `--color-watch`/`--color-watch-soft`; `stable` → `--color-normal`/`--color-normal-soft`; `advancing` → keep a distinct, non-tier token — do not overload `--color-normal` for two different meanings; pick or introduce a token, name the choice in the commit).
**Verify:** `grep -rn "bg-blue-100\|bg-emerald-100\|bg-purple-100\|bg-slate-100" src/` → only remaining hit is `glaciers.$glacierId.tsx:432-433`'s `driverMeta` (explicitly out of scope, filed separately). `bunx tsc --noEmit && bun run lint`. Manual dark-mode toggle check as in Step 2.

### Step 4 — `zod` schema skeleton

New `src/lib/admin-schemas.ts`: per-resource `.strict()` empty-object placeholder schemas + `z.infer` type exports for `districts`, `glaciers`, `lakes`, `alerts`, `protocols`, `facilities`, `chw_profiles`, `cases`, `users` (per PRD §5's "Full CRUD" rows). Add a comment on the `lakes` schema noting `currentTier`/`current_risk_score` must never appear there — that's tier-policy output CryoHealth-api owns, not an admin-editable field. Add a comment on `alerts` noting issue #12 requires a mandatory `reason` field on clear/delete — a marker for that task, not implemented here.
**Verify:** `bunx tsc --noEmit && bun run lint`. `grep -n "strict()" src/lib/admin-schemas.ts` → 9 hits, one per resource.

### Step 5 — cleanup

`graphify update .` (graph is confirmed stale post-#4 — still shows `Stat`/`StatusPill` at old `admin.tsx` line numbers). File the 3 deferred-scope issues (`--color-muted` collision, `driverMeta` hardcoded palette, `Kpi`/`StatCard` convergence) per PLAN's "NOT in scope" section above — this is a commitment, not a suggestion, per the exact lesson from #4's verify pass (an unfiled commitment was the one real process gap found there).
**Verify:** `graphify query "StatCard"` resolves to the new file. `gh issue list --search "in:title StatCard OR muted OR driverMeta"` shows the 3 new issues exist.

## Human verification checklist

Run `bun dev`, no login needed (no route/auth-page changes in this task):

- [ ] `/` hero stats render unchanged visually (StatPair swap)
- [ ] `/admin` overview stats + status pills render, tone colors correct, dark mode toggle changes every pill's background
- [ ] `/glaciers/<any-id>` header badge (L177) and observations table (L303) both use the shared `StatusPill`, dark mode changes both
- [ ] `POST /api/public/alerts` (or whatever triggers the alerts write path) still returns 401 for no token, 403 for wrong role, 200 for `cryohealth_admin`/`facility_admin` — confirms `requireRole`'s new throw behavior didn't regress the response shape a client depends on

## Rollback

Each step is one commit; revert in reverse order (5→4→3→2→1). No generated-file
side effects this time (no route files, no `routeTree.gen.ts` changes) — plain
reverts are sufficient at every step.

## Loop budget & escalation

Loop budget: 3 (fix loop), copied from issue #5.
Escalation: budget exhausted or two identical failure signatures → label `agent:needs-human`, comment the trail, stop.
