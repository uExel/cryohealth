# Graph Report - cryohealth  (2026-08-17)

## Corpus Check
- 187 files · ~199,651 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1539 nodes · 2285 edges · 157 communities (92 shown, 65 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0e688412`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- glaciers.$glacierId.tsx
- routeTree.gen.ts
- devDependencies
- compilerOptions
- sidebar.tsx
- utils.ts
- components.json
- command.tsx
- menubar.tsx
- cn
- server.ts
- queries.ts
- dependencies
- auth-guard.ts
- auth.tsx
- drawer.tsx
- LakeFormDialog.tsx
- Task #6 findings — read-only admin views: Districts, Glaciers, Glacier observations
- Task #9 findings — read-only admin views: Facilities, CHW profiles, Cases
- context-menu.tsx
- dropdown-menu.tsx
- admin.glaciers.index.tsx
- admin-schemas.ts
- HANDOFF — cryohealth — 2026-08-10 01:10 PKT
- PRD — CryoHealth Admin Portal
- breadcrumb.tsx
- navigation-menu.tsx
- admin.lakes.$lakeId.tsx
- card.tsx
- toggle-group.tsx
- What You Must Do When Invoked
- clsx
- HANDOFF — cryohealth — 2026-08-15 21:27 PKT
- table.tsx
- HANDOFF — cryohealth — 2026-08-10 02:15 PKT
- FileRoutesByPath
- sonner.tsx
- HANDOFF — cryohealth — 2026-08-09 22:10 PKT
- check-gstack.sh
- HANDOFF — cryohealth — 2026-08-09 23:20 PKT
- admin.districts.tsx
- date-fns
- embla-carousel-react
- HANDOFF — cryohealth — 2026-08-09 01:25 PKT
- tier.tsx
- leaflet
- lucide-react
- @radix-ui/react-accordion
- @radix-ui/react-alert-dialog
- @radix-ui/react-aspect-ratio
- @radix-ui/react-avatar
- @radix-ui/react-checkbox
- @radix-ui/react-collapsible
- @radix-ui/react-context-menu
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-hover-card
- @radix-ui/react-label
- @radix-ui/react-menubar
- @radix-ui/react-navigation-menu
- @radix-ui/react-popover
- @radix-ui/react-progress
- @radix-ui/react-radio-group
- HANDOFF — cryohealth — 2026-08-01 21:45 PKT
- @radix-ui/react-select
- @radix-ui/react-separator
- HANDOFF — cryohealth — 2026-08-16 PKT
- graphify reference: extra exports and benchmark
- @radix-ui/react-switch
- @radix-ui/react-tabs
- @radix-ui/react-toggle
- @radix-ui/react-toggle-group
- react-day-picker
- react-hook-form
- react-leaflet
- react-resizable-panels
- recharts
- sonner
- cryohealth
- @tailwindcss/vite
- @tanstack/react-start
- @tanstack/router-plugin
- graphify reference: query, path, explain
- @types/leaflet
- vaul
- vite-tsconfig-paths
- zod
- HANDOFF — cryohealth — 2026-08-09 (settings-fix) PKT
- HANDOFF — cryohealth — 2026-08-10 00:20 PKT
- HANDOFF — cryohealth — 2026-08-09 23:55 PKT
- HANDOFF — cryohealth — 2026-08-10 00:35 PKT
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- Session report — /uexel:verify for task #4
- data.tsx
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- HANDOFF — cryohealth — 2026-08-15 23:10 PKT
- .claude/CLAUDE.md
- extraction-spec.md
- LEARNINGS.md
- Task #7 findings — read-only admin views: Lakes, Lake risk scores, Hazard scores
- TODO.md
- jose
- postgres
- react-dom
- HANDOFF — cryohealth — 2026-08-15 22:10 PKT
- tailwindcss
- @tanstack/react-query
- @tanstack/react-router
- input-otp.tsx
- cloudflare-workers.d.ts
- carousel.tsx
- about.tsx
- sitemap[.]xml.ts
- Session report — /uexel:verify for task #5
- HANDOFF — cryohealth — 2026-08-10 02:45 PKT
- HANDOFF — cryohealth — 2026-08-15 20:56 PKT
- HANDOFF — cryohealth — 2026-08-10 15:38 PKT
- @hookform/resolvers
- HANDOFF — cryohealth — 2026-08-10 15:55 PKT
- PLAN
- HANDOFF — cryohealth — 2026-08-15 22:35 PKT
- Session report — /uexel:verify for task #6
- Session report — /uexel:verify for task #8
- cmdk
- Task #8 findings — read-only admin views: Alerts, Alert acknowledgements, Protocols
- HANDOFF — cryohealth — 2026-08-11 20:30 PKT
- Task #10 findings — CRUD: Districts + Glaciers
- Session report — plan + gate + build + verify + close for task #10
- Session report — /uexel:verify for task #7
- cryohealth-api.ts
- Plan steps
- badge.tsx
- router.tsx
- accordion.tsx
- lakes.tsx
- Task #11 findings — CRUD: Lakes (tier/risk-score columns locked)
- Session report — /uexel:verify + close for task #9
- 6. The field lock — how to structurally exclude `currentTier` / `current_risk_score`
- input-otp
- 4. The #10 pattern, file by file (what to copy)
- alert.tsx
- db.ts
- @cloudflare/vite-plugin
- tailwind-merge
- Route
- Route
- Route
- 2. `lakes` schema — authoritative, from `\d lakes` on the live DB
- 9. The UI — what exists and what changes
- 1. Current state of the lake API surface

## God Nodes (most connected - your core abstractions)
1. `cn()` - 69 edges
2. `FileRoutesByPath` - 55 edges
3. `getDb()` - 37 edges
4. `useAuth()` - 20 edges
5. `compilerOptions` - 17 edges
6. `authFetch()` - 15 edges
7. `Task #8 findings — read-only admin views: Alerts, Alert acknowledgements, Protocols` - 15 edges
8. `Task #9 findings — read-only admin views: Facilities, CHW profiles, Cases` - 15 edges
9. `Task #10 findings — CRUD: Districts + Glaciers` - 14 edges
10. `Task #11 findings — CRUD: Lakes (tier/risk-score columns locked)` - 14 edges

## Surprising Connections (you probably didn't know these)
- `CalendarDayButton()` --references--> `react`  [EXTRACTED]
  src/components/ui/calendar.tsx → package.json
- `useCarousel()` --references--> `react`  [EXTRACTED]
  src/components/ui/carousel.tsx → package.json
- `useChart()` --references--> `react`  [EXTRACTED]
  src/components/ui/chart.tsx → package.json
- `useFormField()` --references--> `react`  [EXTRACTED]
  src/components/ui/form.tsx → package.json
- `useSidebar()` --references--> `react`  [EXTRACTED]
  src/components/ui/sidebar.tsx → package.json

## Import Cycles
- None detected.

## Communities (157 total, 65 thin omitted)

### Community 0 - "glaciers.$glacierId.tsx"
Cohesion: 0.07
Nodes (32): escapeHtml(), Facility, Glacier, glacierStatusColor, HazardMap(), Lake, EDGES, getNode() (+24 more)

### Community 1 - "routeTree.gen.ts"
Cohesion: 0.03
Nodes (77): AboutRoute, AdminAlertsRoute, AdminAuditRoute, AdminCasesRoute, AdminChwProfilesRoute, AdminDistrictsRoute, AdminFacilitiesRoute, AdminGlaciersGlacierIdRoute (+69 more)

### Community 2 - "devDependencies"
Cohesion: 0.04
Nodes (46): eslint, eslint-config-prettier, @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @lovable.dev/vite-tanstack-config (+38 more)

### Community 3 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2022, eslint.config.js, src/**/*.ts, src/**/*.tsx, vite/client, vite.config.ts (+18 more)

### Community 4 - "sidebar.tsx"
Cohesion: 0.06
Nodes (38): NAV_GROUPS, Separator, SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay (+30 more)

### Community 5 - "utils.ts"
Cohesion: 0.09
Nodes (13): Avatar, AvatarFallback, AvatarImage, Checkbox, HoverCardContent, PopoverContent, Progress, RadioGroup (+5 more)

### Community 6 - "components.json"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+10 more)

### Community 7 - "command.tsx"
Cohesion: 0.20
Nodes (8): Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut()

### Community 8 - "menubar.tsx"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 9 - "cn"
Cohesion: 0.17
Nodes (16): ButtonProps, buttonVariants, Calendar(), CalendarDayButton(), Pagination(), PaginationContent, PaginationEllipsis(), PaginationItem (+8 more)

### Community 10 - "server.ts"
Cohesion: 0.25
Nodes (9): consumeLastCapturedError(), renderErrorPage(), brandedErrorResponse(), fetch(), getServerEntry(), isCatastrophicSsrErrorBody(), normalizeCatastrophicSsrResponse(), ServerEntry (+1 more)

### Community 11 - "queries.ts"
Cohesion: 0.09
Nodes (37): getDb(), createDistrict(), createGlacier(), createLake(), deleteDistrict(), deleteGlacier(), deleteLake(), deriveDistrictName() (+29 more)

### Community 12 - "dependencies"
Cohesion: 0.13
Nodes (15): bcryptjs, class-variance-authority, dependencies, bcryptjs, class-variance-authority, @radix-ui/react-scroll-area, @radix-ui/react-slider, @radix-ui/react-slot (+7 more)

### Community 13 - "auth-guard.ts"
Cohesion: 0.29
Nodes (8): deleteReasonSchema, mapDbError(), parseJsonBody(), AuthError, requireAuth(), requireRole(), HasDependentsError, InvalidDistrictError

### Community 14 - "auth.tsx"
Cohesion: 0.06
Nodes (44): AdminPlaceholder(), CryoHealthAdminOnly(), AdminShell(), DemoBanner(), NAV, SiteHeader(), AuthCtx, AuthProvider() (+36 more)

### Community 15 - "drawer.tsx"
Cohesion: 0.25
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 16 - "LakeFormDialog.tsx"
Cohesion: 0.11
Nodes (21): DAM_TYPES, DistrictOption, LakeFormInitial, FormControl, FormDescription, FormField(), FormFieldContext, FormFieldContextValue (+13 more)

### Community 17 - "Task #6 findings — read-only admin views: Districts, Glaciers, Glacier observations"
Cohesion: 0.17
Nodes (11): 1. Existing admin scaffolding (task #4), 2. `requireRole` — the prompt's premise is wrong, 3. `StatCard` / `StatusPill`, 4. shadcn `Table` / `Tabs` — installed, unused, deps present, 5. `src/lib/queries.ts` — all four functions already exist, 6. Route to model on, 7. Seed data — concrete expected verification values, Headline: the DoD is significantly overstated. #6 is a UI-only task. (+3 more)

### Community 18 - "Task #9 findings — read-only admin views: Facilities, CHW profiles, Cases"
Cohesion: 0.05
Nodes (40): 10. Draft plan steps, 11. Explicitly NOT in scope, 1. Exact current state of the three route files, 2. Exact schemas (read from CryoHealth-api migrations, verified live against Postgres :5433), 3. Existing data access — exactly what exists and what is missing, 4. Existing API routes — one usable, one wrong-shaped, one missing, 5. `is_disaster_related` flagging — settled interpretation, not an open question, 6. Live seeded state (verified against Postgres :5433, not inferred) (+32 more)

### Community 19 - "context-menu.tsx"
Cohesion: 0.20
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 20 - "dropdown-menu.tsx"
Cohesion: 0.20
Nodes (9): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+1 more)

### Community 21 - "admin.glaciers.index.tsx"
Cohesion: 0.12
Nodes (22): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle (+14 more)

### Community 22 - "admin-schemas.ts"
Cohesion: 0.07
Nodes (26): Alert, alertSchema, Case, caseSchema, ChwProfile, chwProfileSchema, DAM_TYPES, DeleteReason (+18 more)

### Community 23 - "HANDOFF — cryohealth — 2026-08-10 01:10 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-10 01:10 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 24 - "PRD — CryoHealth Admin Portal"
Cohesion: 0.17
Nodes (11): 10. Open questions (need a decision before build), 1. Problem & goal, 2. Users & permissions, 3. Information architecture — sidebar, 4. Routes (flat dot-segment convention — matches `lakes.$lakeId.tsx`, no `admin/` directory exists today), 5. Data domain → CRUD matrix, 6. Connected-systems / platform health, 7. Component reuse plan (grounded in current repo state) (+3 more)

### Community 25 - "breadcrumb.tsx"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 26 - "navigation-menu.tsx"
Cohesion: 0.25
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 27 - "admin.lakes.$lakeId.tsx"
Cohesion: 0.12
Nodes (16): LakeFormDialog(), StatusPill(), TabsContent, TabsList, TabsTrigger, LakeCreate, GlacierRow, ObservationRow (+8 more)

### Community 28 - "card.tsx"
Cohesion: 0.29
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 29 - "toggle-group.tsx"
Cohesion: 0.33
Nodes (5): ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 30 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 32 - "HANDOFF — cryohealth — 2026-08-15 21:27 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-15 21:27 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 33 - "table.tsx"
Cohesion: 0.19
Nodes (14): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow (+6 more)

### Community 34 - "HANDOFF — cryohealth — 2026-08-10 02:15 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-10 02:15 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 35 - "FileRoutesByPath"
Cohesion: 0.06
Nodes (33): Route, Route, Route, Route, Route, Route, Route, Route (+25 more)

### Community 37 - "HANDOFF — cryohealth — 2026-08-09 22:10 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-09 22:10 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 39 - "HANDOFF — cryohealth — 2026-08-09 23:20 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-09 23:20 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 40 - "admin.districts.tsx"
Cohesion: 0.20
Nodes (10): DialogContent, DialogDescription, DialogFooter(), DialogHeader(), DialogOverlay, DialogTitle, dependentsMessage(), DialogState (+2 more)

### Community 43 - "HANDOFF — cryohealth — 2026-08-09 01:25 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-09 01:25 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 44 - "tier.tsx"
Cohesion: 0.21
Nodes (11): authFetch(), Tier, TIER_ICON, TIER_ON_SOLID_VAR, TIER_SOFT_VAR, TIER_SOLID_VAR, TierBadge(), CasesAdmin() (+3 more)

### Community 63 - "HANDOFF — cryohealth — 2026-08-01 21:45 PKT"
Cohesion: 0.15
Nodes (12): Addendum — 2026-08-03 (harness maintenance), Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-01 21:45 PKT, Loops run, Next action, Not done / deferred (+4 more)

### Community 66 - "HANDOFF — cryohealth — 2026-08-16 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-16 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 67 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 78 - "cryohealth"
Cohesion: 0.29
Nodes (6): Commands (`bun`), cryohealth, Gotchas, graphify, gstack (REQUIRED — global install), Map

### Community 82 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 87 - "HANDOFF — cryohealth — 2026-08-09 (settings-fix) PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-09 (settings-fix) PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 88 - "HANDOFF — cryohealth — 2026-08-10 00:20 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-10 00:20 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 89 - "HANDOFF — cryohealth — 2026-08-09 23:55 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-09 23:55 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 94 - "HANDOFF — cryohealth — 2026-08-10 00:35 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-10 00:35 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 95 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 96 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 97 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 98 - "Session report — /uexel:verify for task #4"
Cohesion: 0.33
Nodes (5): Final verdict, Fix-loop: 1 of 3 iterations used, Session report — /uexel:verify for task #4, What was verified, Why the loop stopped

### Community 99 - "data.tsx"
Cohesion: 0.40
Nodes (3): Endpoint, ENDPOINTS, Route

### Community 102 - "HANDOFF — cryohealth — 2026-08-15 23:10 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-15 23:10 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 106 - "Task #7 findings — read-only admin views: Lakes, Lake risk scores, Hazard scores"
Cohesion: 0.08
Nodes (24): 1. Exact current state of the three route files, 2. Exact return shapes, 3. Writers — provenance, and what the empty state may honestly say, 4. Existing API routes, and the data-path decision, 5. "Today's single-page inventory table logic" — there is nothing left to supersede, 6. `TierBadge` precedent and PRD §5 rationale, 7. Draft plan steps, 8. Deviations from the DoD's literal text → name these at GATE (+16 more)

### Community 111 - "HANDOFF — cryohealth — 2026-08-15 22:10 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-15 22:10 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 115 - "input-otp.tsx"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 117 - "carousel.tsx"
Cohesion: 0.07
Nodes (25): react, react, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem (+17 more)

### Community 120 - "Session report — /uexel:verify for task #5"
Cohesion: 0.25
Nodes (7): A note on process, Build phase (no fix loop needed), Final verdict, Fix-loop: 1 of 3 iterations used, Session report — /uexel:verify for task #5, What was built and verified, Why the loop stopped

### Community 121 - "HANDOFF — cryohealth — 2026-08-10 02:45 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-10 02:45 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 122 - "HANDOFF — cryohealth — 2026-08-15 20:56 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-15 20:56 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 123 - "HANDOFF — cryohealth — 2026-08-10 15:38 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-10 15:38 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 125 - "HANDOFF — cryohealth — 2026-08-10 15:55 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-10 15:55 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 126 - "PLAN"
Cohesion: 0.17
Nodes (10): Assumptions & blast radius, GATE decision 1: reject the locked fields with a 400, not silent-drop — and defend it in two layers, GATE decision 2: `district_id` required on create, `district` (legacy text) auto-derived from it, Headline: the DoD's own filenames don't exist yet, Loop budget, PLAN, Rollback, Settled, not GATE items (named so they don't get re-litigated mid-build) (+2 more)

### Community 127 - "HANDOFF — cryohealth — 2026-08-15 22:35 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-15 22:35 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 128 - "Session report — /uexel:verify for task #6"
Cohesion: 0.25
Nodes (7): A note on process, Build phase (no fix loop needed), Final verdict, Fix-loop: 1 of 3 iterations used, Session report — /uexel:verify for task #6, What was built and verified, Why the loop stopped

### Community 129 - "Session report — /uexel:verify for task #8"
Cohesion: 0.25
Nodes (7): A note on process, Build phase (no fix loop needed), Final verdict, Session report — /uexel:verify for task #8, Verify: single pass, no fix loop, What was built and verified, Why the loop stopped

### Community 131 - "Task #8 findings — read-only admin views: Alerts, Alert acknowledgements, Protocols"
Cohesion: 0.06
Nodes (33): 10. Draft plan steps, 11. Explicitly NOT in scope, 1. Exact current state of the two route files, 2. Exact schemas (read from CryoHealth-api migrations, then verified against the live DB), 3. Exact return shapes of the three existing query functions, 4. Existing API routes — nothing new is needed, 5. `TierBadge` on `alerts.tier` — no narrowing guard needed, 6. Live seeded state (verified against Postgres on :5433, not inferred) (+25 more)

### Community 132 - "HANDOFF — cryohealth — 2026-08-11 20:30 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-11 20:30 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 133 - "Task #10 findings — CRUD: Districts + Glaciers"
Cohesion: 0.05
Nodes (38): 10. Draft plan steps (one atomic commit each), 11. Risks / assumptions that would change the plan if wrong, 12. Key file paths, 1. Exact current state of the four route files, 2. The scaffold to follow — `src/routes/api/public/alerts.ts`, 3. The `audit` table — exact live schema, 4. `districts` / `glaciers` schemas and the delete problem, 5. UI primitives — all present, all unused (+30 more)

### Community 134 - "Session report — plan + gate + build + verify + close for task #10"
Cohesion: 0.18
Nodes (10): Exceptions, Final verdict, Fix-loop accounting, Fix-loop iteration 1 — `f753c16`, Mini-handoff, Post-re-verify fixes — `76157bb`, Re-verify → PASS WITH FINDINGS, Session report — plan + gate + build + verify + close for task #10 (+2 more)

### Community 135 - "Session report — /uexel:verify for task #7"
Cohesion: 0.25
Nodes (7): A note on process, Build phase (no fix loop needed), Final verdict, Fix-loop: 1 of 3 iterations used, Session report — /uexel:verify for task #7, What was built and verified, Why the loop stopped

### Community 136 - "cryohealth-api.ts"
Cohesion: 0.27
Nodes (8): API_TIER, apiBaseUrl(), ApiGeomPoint, ApiLake, fetchLakesFromApi(), Lake, toLake(), Route

### Community 137 - "Plan steps"
Cohesion: 0.25
Nodes (8): Plan steps, Step 0 — pre-flight (no commit), Step 1 — `src/lib/admin-schemas.ts`: replace the `lakeSchema` stub with `lakeCreateSchema`/`lakeUpdateSchema`, Step 2 — `src/lib/queries.ts`: `createLake`/`updateLake`/`deleteLake` + `LAKE_WRITABLE_COLUMNS`, Step 3 — `src/routes/api/admin/lakes.ts` (POST) + `lakes.$lakeId.ts` (PUT/DELETE), Step 4 — `admin.lakes.$lakeId.tsx`: edit Dialog with the two locked fields read-only + note, Step 5 — `admin.lakes.index.tsx`: Actions column + create Dialog + delete AlertDialog, Step 6 — cleanup

### Community 138 - "badge.tsx"
Cohesion: 0.67
Nodes (3): Badge(), BadgeProps, badgeVariants

### Community 139 - "router.tsx"
Cohesion: 0.40
Nodes (4): getRouter(), Register, routeTree, startInstance

### Community 140 - "accordion.tsx"
Cohesion: 0.50
Nodes (3): AccordionContent, AccordionItem, AccordionTrigger

### Community 141 - "lakes.tsx"
Cohesion: 0.27
Nodes (5): FreshnessStamp(), fetchLakes(), Route, LakesPage(), Route

### Community 142 - "Task #11 findings — CRUD: Lakes (tier/risk-score columns locked)"
Cohesion: 0.22
Nodes (9): 0. Headline — what is actually different from #10, 10. Other #10 findings that carry over, 11. Proposed plan steps (one atomic commit each, with a verification command), 12. Risks / assumptions that would change this plan if wrong, 3. Postgres type → zod coercion table (the #10 F1/N1 lesson, applied to lakes), 5. The geom problem — decide this before writing anything else, 7. Delete: dependents, and the one FK Postgres will actually enforce, 8. Unique constraints — #10's single hardcoded 23505 message is not enough (+1 more)

### Community 143 - "Session report — /uexel:verify + close for task #9"
Cohesion: 0.25
Nodes (7): Exceptions, Final verdict, Mini-handoff, Session report — /uexel:verify + close for task #9, Since the last report, Verify: pass 1, Why the loop stopped at 1/3 iterations

### Community 144 - "6. The field lock — how to structurally exclude `currentTier` / `current_risk_score`"
Cohesion: 0.33
Nodes (6): 6. The field lock — how to structurally exclude `currentTier` / `current_risk_score`, Is there an existing "in the read type, out of the write schema" precedent?, Layer 0 (the one that will actually bite) — the form must not *send* the locked fields, Layer 1 — `.strict()` gives a hard 400, and it survives `.partial()`, Layer 2 — an allowlist in `queries.ts`, because the DoD calls this security-critical, The definitive three-way field split (so `.strict()` doesn't 400 on something intended)

### Community 146 - "4. The #10 pattern, file by file (what to copy)"
Cohesion: 0.40
Nodes (5): 4. The #10 pattern, file by file (what to copy), Route files, `src/lib/admin-schemas.ts`, `src/lib/queries.ts`, UI: `src/routes/admin.districts.tsx` (385 lines) — the canonical shape

### Community 147 - "alert.tsx"
Cohesion: 0.40
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Community 148 - "db.ts"
Cohesion: 0.60
Nodes (4): createSql(), getHyperdrive(), HyperdriveEnv, isModuleNotFound()

### Community 154 - "2. `lakes` schema — authoritative, from `\d lakes` on the live DB"
Cohesion: 0.50
Nodes (4): 2. `lakes` schema — authoritative, from `\d lakes` on the live DB, Mixed naming is not a mistake — it must be preserved verbatim in the write schema, `slug` is curated, not derived, The `district` varchar vs `district_id` uuid trap

### Community 155 - "9. The UI — what exists and what changes"
Cohesion: 0.50
Nodes (4): 9. The UI — what exists and what changes, `src/routes/admin.lakes.index.tsx` (195 lines) — list, needs create + delete, `src/routes/admin.lakes.$lakeId.tsx` (308 lines) — detail, gets the edit form per the DoD, `src/routes/admin.lakes.tsx` (5 lines) — Outlet parent, do not touch

### Community 156 - "1. Current state of the lake API surface"
Cohesion: 0.67
Nodes (3): 1. Current state of the lake API surface, Other lake endpoints (all read-only, all stay untouched), There is no `src/routes/api/admin/lakes*.ts` — the DoD's filenames don't exist yet

## Knowledge Gaps
- **885 isolated node(s):** `check-gstack.sh script`, `$schema`, `style`, `rsc`, `tsx` (+880 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **65 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`, `cmdk`, `input-otp`, `@cloudflare/vite-plugin`, `tailwind-merge`, `clsx`, `date-fns`, `embla-carousel-react`, `leaflet`, `lucide-react`, `@radix-ui/react-accordion`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-avatar`, `@radix-ui/react-checkbox`, `@radix-ui/react-collapsible`, `@radix-ui/react-context-menu`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-label`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-popover`, `@radix-ui/react-progress`, `@radix-ui/react-radio-group`, `@radix-ui/react-select`, `@radix-ui/react-separator`, `@radix-ui/react-switch`, `@radix-ui/react-tabs`, `@radix-ui/react-toggle`, `@radix-ui/react-toggle-group`, `react-day-picker`, `react-hook-form`, `react-leaflet`, `react-resizable-panels`, `recharts`, `sonner`, `@tailwindcss/vite`, `@tanstack/react-start`, `@tanstack/router-plugin`, `@types/leaflet`, `vaul`, `vite-tsconfig-paths`, `zod`, `jose`, `postgres`, `react-dom`, `tailwindcss`, `@tanstack/react-query`, `@tanstack/react-router`, `carousel.tsx`, `@hookform/resolvers`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Why does `react` connect `carousel.tsx` to `cn`, `dependencies`, `sidebar.tsx`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `sidebar.tsx`, `utils.ts`, `command.tsx`, `menubar.tsx`, `badge.tsx`, `accordion.tsx`, `drawer.tsx`, `LakeFormDialog.tsx`, `alert.tsx`, `context-menu.tsx`, `admin.glaciers.index.tsx`, `dropdown-menu.tsx`, `breadcrumb.tsx`, `navigation-menu.tsx`, `admin.lakes.$lakeId.tsx`, `card.tsx`, `toggle-group.tsx`, `table.tsx`, `admin.districts.tsx`, `input-otp.tsx`, `carousel.tsx`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **What connects `check-gstack.sh script`, `$schema`, `style` to the rest of the system?**
  _885 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `glaciers.$glacierId.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06567992599444958 - nodes in this community are weakly interconnected._
- **Should `routeTree.gen.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.02564102564102564 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._