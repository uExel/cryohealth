# PLAN

Goal: [#3 — CryoHealth admin portal — sidebar CRUD + platform monitoring](https://github.com/uExel/cryohealth/issues/3)
Task: [#4 — Admin portal shell: sidebar IA + route scaffolding, role-gated](https://github.com/uExel/cryohealth/issues/4)

Scope: shell + navigation + empty route scaffolds only. No CRUD, no data fetching, no
content inside the new routes — that's tasks #6-#19. Full design: `docs/admin-portal-prd.md` §3/§4/§7.

## Assumptions & blast radius

- **Auth**: this task adds a `requireRole()` helper to `auth-guard.ts` but does not wire
  any caller — it's the primitive tasks #6-#19 will use. No auth-boundary change to any
  existing endpoint in this task.
- **No user data, no migrations, no payments** touched. Pure routing/UI scaffold.
- **Page gating is client-only, not a security boundary.** The JWT lives in
  `localStorage` (`src/lib/auth-client.ts:8-10`, `getToken()` returns `null` under SSR),
  so there is no auth cookie and no way to gate page routes server-side in this
  codebase today. The real security boundary is the API layer — `api/admin/*` handlers
  in later tasks call `requireRole()` server-side. This task's route/nav gating is
  UX-only (hide what a role can't use), matching how `admin.tsx`'s existing `isAdmin`
  gate already works. Flagged explicitly, not silently assumed.
- **Working tree is dirty** with unrelated uncommitted changes from earlier this
  session (`PipelineDiagram.tsx`, `src/lib/db.ts`, `src/lib/queries.ts`,
  `src/routes/api/auth/login.ts`, `src/routes/index.tsx`, `src/styles.css`, untracked
  `docs/admin-portal-prd.md`). None touch routing, `sidebar.tsx`, or auth. Must be
  committed or stashed before Step 1 so these 4 commits stay atomic and don't get
  entangled with unrelated diffs.
- **`bun run build` has not been verified green this session.** Loop budget is 3 — a
  pre-existing failure discovered mid-task would burn it. Step 0 rules this out first.

## What already exists (reused, not rebuilt)

- `src/components/ui/sidebar.tsx` — complete shadcn sidebar API, zero imports anywhere
  in the app today. This task is its first consumer.
- `src/components/cryohealth/SiteHeader.tsx` — the visual language to replicate
  (flat 2px borders via inline `style={{borderColor: "var(--color-line)"}}`, zero
  radius, `border-[var(--color-accent)]` active state, `isAdmin`/`isCHW` gating
  pattern at lines 66-73).
- `src/routes/admin.tsx:31-51` — the `loading`/`rolesLoaded`/`isAdmin` gate. Preserved
  verbatim in the new `admin.tsx`, not reinvented.
- `src/routes/lakes.$lakeId.tsx` — the dynamic-segment route convention
  (`createFileRoute`, `head: ({params}) => ...`, `Route.useParams()`) followed exactly
  for `admin.glaciers.$glacierId.tsx` / `admin.lakes.$lakeId.tsx`.
- `src/routes/api/public/alerts.ts:20-22` — the one existing inline role check,
  generalized into the new `requireRole()` helper.

## NOT in scope (deferred, with rationale)

- `StatCard`/`StatusPill` extraction (`admin.tsx:276-315`, duplicated 4x elsewhere) —
  belongs to task #6 (Shared admin components); pulling it into #4 blurs the goal's
  task boundaries.
- Collapsible sidebar / mobile `Sheet` — DoD doesn't require it; `collapsible="none"`
  sidesteps a real layout conflict (see Step 3) without inventing unrequested UI.
- True server-side (cookie-based) page auth — would need a much larger auth migration
  (`api/auth/login.ts`, `auth-client.ts`, CryoHealth-api parity). Out of scope for this
  goal entirely.
- Fixing the pre-existing `/lakes/$lakeId` bug (renders the lakes list, not the detail
  page — same root cause as the `<Outlet/>` finding below) — unrelated existing bug,
  not introduced by this task. **Should be filed as its own issue**, not silently fixed
  here or silently left undocumented.
- 5 PRD §3 nav items with no route in §4 (Glacier observations, Lake risk scores,
  Hazard scores, Alert acknowledgements, Sync activity) — not rendered in the sidebar
  since nothing to link to yet; they arrive with tasks #7 and #19.

## Test coverage note

No test framework exists in this repo (`package.json` has no test script; confirmed no
jest/vitest/playwright config). Verification is typecheck + lint + build + a manual
checklist, matching how every other route in this codebase is verified today. The one
regression class that matters here — a child route silently rendering its parent's
content instead of its own — **cannot be caught by `tsc`/`lint`/`build`**, only by
visiting the URL directly, so that check is explicit and non-optional in Step 2's and
the final human checklist below.

## Steps

### Step 0 — pre-flight (not a commit)

Commit or stash the 6 unrelated dirty files. Run `bun run build && bunx tsc --noEmit && bun run lint` to establish a green baseline before touching anything.
**Verify:** all three exit 0. If not, stop and report — do not attribute a pre-existing failure to this task.

### Step 1 — auth: `isCryoHealthAdmin` + `requireRole()`

Edit `src/lib/auth.tsx` (add `isCryoHealthAdmin = user?.role === "cryohealth_admin"` to the context type, default, derivation, and provider value — purely additive, `isAdmin`/`isCHW` untouched) and `src/lib/auth-guard.ts` (add `requireRole(claims, roles: Role[]): Response | null`, modeled on `src/routes/api/public/alerts.ts:20-22`; do not refactor that file to use it yet — out of scope here).
**Verify:** `bunx tsc --noEmit && bun run lint`.

### Step 2 — all 16 route files (highest-risk step)

- `src/routes/admin.tsx`: keep the `head` block's `robots: noindex` and the existing gate (`admin.tsx:33-51`) verbatim; replace `return <CryosphereInventory />` with `<Outlet/>`.
- `src/routes/admin.index.tsx`: move `CryosphereInventory`/`Stat`/`StatusPill` here unchanged.
- `admin.glaciers.tsx`, `admin.lakes.tsx`: pass-through parents, render only `<Outlet/>` — required so their `$id` children render at all (see rationale below).
- Remaining 13 scaffolds (`admin.districts.tsx`, `admin.glaciers.index.tsx`, `admin.glaciers.$glacierId.tsx`, `admin.lakes.index.tsx`, `admin.lakes.$lakeId.tsx`, `admin.alerts.tsx`, `admin.protocols.tsx`, `admin.cases.tsx`, `admin.facilities.tsx`, `admin.chw-profiles.tsx`, `admin.users.tsx`, `admin.audit.tsx`, `admin.system-health.tsx`) — heading + placeholder body, theme tokens only, `noindex` meta. The 3 admin-only routes additionally render the `!isCryoHealthAdmin` gate directly (defence in depth against direct URL access, not just a hidden nav item).

**Why `<Outlet/>` is required, not optional**: TanStack's flat dot-segment routing nests child routes under their parent (`src/routeTree.gen.ts:93` — `LakesLakeIdRoute` declares `getParentRoute: () => LakesRoute`), and `Outlet` exists in exactly one file today (`src/routes/__root.tsx:3,153`). Without it, every child route silently renders the parent's content instead of its own — confirmed as the live cause of an existing bug (`/lakes/$lakeId` currently shows the lakes list, not a detail page) and independently observed this session when navigating there.

**Verify:** `bun run build && bunx tsc --noEmit && bun run lint`. Then `git diff src/routeTree.gen.ts` and confirm `AdminGlaciersGlacierIdRoute`/`AdminLakesLakeIdRoute` declare `getParentRoute: () => AdminGlaciersRoute`/`AdminLakesRoute` (not `AdminRoute`). Manually: `/admin` shows the register; **`/admin/glaciers/abc` visited directly shows the detail placeholder, not the list** (the regression test tsc/lint/build cannot perform).

### Step 3 — `AdminShell` + wire it in

New `src/components/cryohealth/AdminShell.tsx`: `SidebarProvider` (override `min-h-svh`) → `Sidebar collapsible="none"` (+ `hidden md:flex`, `border-e-2` with inline `style={{borderColor: "var(--color-line)"}}`) → `SidebarContent` → 6× `SidebarGroup`/`SidebarGroupLabel`/`SidebarMenu`, filtering the People & access / Platform groups on `isCryoHealthAdmin`. Items use `SidebarMenuButton asChild` wrapping `<Link>`, `rounded-none` override, `isActive` = exact match for `/admin` and `startsWith` for the rest (do not copy `SiteHeader.tsx:43`'s predicate verbatim — `startsWith("/admin")` would make Overview always show active). Then change `admin.tsx` to `<AdminShell><Outlet/></AdminShell>`.

**Why `collapsible="none"`**: `Sidebar`'s default is `position: fixed` (`sidebar.tsx:235`) but `SiteHeader` is `sticky top-0 z-40` and `DemoBanner` is non-sticky — the header's on-screen offset changes with scroll position, so no constant `top-[Npx]` override exists. `collapsible="none"` renders in normal document flow instead, avoiding the overlap entirely. Trade-off: no collapse toggle, no mobile sheet — DoD doesn't require either.

**Why this step comes after Step 2, not before**: `<Link to="/admin/districts">` is strictly typed against the generated `Register` (`routeTree.gen.ts:641-647`); it will not typecheck until those paths exist.

**Verify:** `bun run build && bunx tsc --noEmit && bun run lint` + click through every sidebar link.

### Step 4 — dark mode + RTL polish

Sweep `AdminShell` for hardcoded palette classes (theme tokens only). Swap physical for logical properties (`border-s-[3px]`, `ps-`/`pe-`) so `dir=rtl` (set by `src/lib/i18n.tsx:58`) flips the layout correctly; pass `side={lang === "ur" ? "right" : "left"}` if not using `collapsible="none"`'s automatic flex-reversal.
**Verify:** `bun run build && bunx tsc --noEmit && bun run lint` + the human checklist below.

## Human verification checklist (not automatable — no test framework, and the Outlet regression is only visible by direct navigation)

Run `bun dev`, sign in as `cryohealth_admin` (`admin-001` / `1234`, see the dev-login seed):

- [ ] All 12 sidebar links navigate and render their own placeholder, not the Overview page
- [ ] `/admin/glaciers/<any-id>` and `/admin/lakes/<any-id>` visited **directly** show the detail placeholder, not the list
- [ ] Active item highlights correctly; Overview highlighted only at `/admin`, not `/admin/*`
- [ ] No sidebar content hidden behind `SiteHeader`, at scroll 0 and scrolled
- [ ] No spurious vertical scrollbar from `min-h-svh`
- [ ] Dark mode: sidebar bg/borders/active state all legible
- [ ] اردو: layout flips (sidebar on the right), no clipped text
- [ ] Sign in as `facility_admin`: People & access / Platform groups absent; `/admin/users`, `/admin/audit`, `/admin/system-health` visited directly show the gate
- [ ] Sign in as `chw`/`viewer`: `/admin` shows "Admin access required"

## Rollback

Each step is one commit; revert in reverse order (4→3→2→1). Step 2 modifies the
git-tracked, auto-generated `src/routeTree.gen.ts` — after reverting the route files,
run `bun run build` once more so the tree regenerates cleanly rather than leaving it
inconsistent with the reverted route files. Steps 1 and 3-4 are plain file
reverts with no generated-file side effect.

## Loop budget & escalation

Loop budget: 3 (fix loop), copied from issue #4.
Escalation: budget exhausted or two identical failure signatures → label `agent:needs-human`, comment the trail, stop.
