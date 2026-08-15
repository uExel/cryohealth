# Graph Report - cryohealth  (2026-08-15)

## Corpus Check
- 180 files · ~186,346 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1446 nodes · 2098 edges · 154 communities (88 shown, 66 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `76157bb9`
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
- AdminShell.tsx
- auth.tsx
- drawer.tsx
- form.tsx
- Task #6 findings — read-only admin views: Districts, Glaciers, Glacier observations
- Task #9 findings — read-only admin views: Facilities, CHW profiles, Cases
- context-menu.tsx
- dropdown-menu.tsx
- admin.districts.tsx
- admin-schemas.ts
- HANDOFF — cryohealth — 2026-08-10 01:10 PKT
- PRD — CryoHealth Admin Portal
- breadcrumb.tsx
- navigation-menu.tsx
- admin.glaciers.index.tsx
- card.tsx
- toggle-group.tsx
- What You Must Do When Invoked
- clsx
- HANDOFF — cryohealth — 2026-08-15 21:27 PKT
- admin.lakes.$lakeId.tsx
- HANDOFF — cryohealth — 2026-08-10 02:15 PKT
- FileRoutesByPath
- sonner.tsx
- HANDOFF — cryohealth — 2026-08-09 22:10 PKT
- check-gstack.sh
- HANDOFF — cryohealth — 2026-08-09 23:20 PKT
- react
- date-fns
- embla-carousel-react
- HANDOFF — cryohealth — 2026-08-09 01:25 PKT
- index.tsx
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
- HANDOFF — cryohealth — 2026-08-15 22:35 PKT
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
- select.tsx
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
- chart.tsx
- Session report — /uexel:verify for task #6
- Session report — /uexel:verify for task #8
- cmdk
- Task #8 findings — read-only admin views: Alerts, Alert acknowledgements, Protocols
- HANDOFF — cryohealth — 2026-08-11 20:30 PKT
- Task #10 findings — CRUD: Districts + Glaciers
- sheet.tsx
- Session report — /uexel:verify for task #7
- lakes.ts
- Plan steps
- badge.tsx
- router.tsx
- accordion.tsx
- 10. Draft plan steps (one atomic commit each)
- 9. Deviations / decisions to name at GATE
- Session report — /uexel:verify + close for task #9
- avatar.tsx
- input-otp
- 3. The `audit` table — exact live schema
- 4. `districts` / `glaciers` schemas and the delete problem
- 1. Exact current state of the four route files
- @cloudflare/vite-plugin
- tailwind-merge
- Route
- Route
- Route

## God Nodes (most connected - your core abstractions)
1. `cn()` - 69 edges
2. `FileRoutesByPath` - 53 edges
3. `getDb()` - 34 edges
4. `useAuth()` - 20 edges
5. `compilerOptions` - 17 edges
6. `Task #8 findings — read-only admin views: Alerts, Alert acknowledgements, Protocols` - 15 edges
7. `Task #9 findings — read-only admin views: Facilities, CHW profiles, Cases` - 15 edges
8. `Task #10 findings — CRUD: Districts + Glaciers` - 14 edges
9. `authFetch()` - 13 edges
10. `Task #7 findings — read-only admin views: Lakes, Lake risk scores, Hazard scores` - 13 edges

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

## Communities (154 total, 66 thin omitted)

### Community 0 - "glaciers.$glacierId.tsx"
Cohesion: 0.06
Nodes (45): FreshnessStamp(), escapeHtml(), Facility, Glacier, glacierStatusColor, HazardMap(), Lake, StatCard() (+37 more)

### Community 1 - "routeTree.gen.ts"
Cohesion: 0.03
Nodes (73): AboutRoute, AdminAlertsRoute, AdminAuditRoute, AdminCasesRoute, AdminChwProfilesRoute, AdminDistrictsRoute, AdminFacilitiesRoute, AdminGlaciersGlacierIdRoute (+65 more)

### Community 2 - "devDependencies"
Cohesion: 0.04
Nodes (46): eslint, eslint-config-prettier, @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @lovable.dev/vite-tanstack-config (+38 more)

### Community 3 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2022, eslint.config.js, src/**/*.ts, src/**/*.tsx, vite/client, vite.config.ts (+18 more)

### Community 4 - "sidebar.tsx"
Cohesion: 0.09
Nodes (20): Input, Separator, SidebarContext, SidebarContextProps, SidebarFooter, SidebarGroupAction, SidebarHeader, SidebarInput (+12 more)

### Community 5 - "utils.ts"
Cohesion: 0.08
Nodes (14): Alert, AlertDescription, AlertTitle, alertVariants, Checkbox, HoverCardContent, PopoverContent, Progress (+6 more)

### Community 6 - "components.json"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+10 more)

### Community 7 - "command.tsx"
Cohesion: 0.13
Nodes (13): Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut() (+5 more)

### Community 8 - "menubar.tsx"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 9 - "cn"
Cohesion: 0.17
Nodes (17): Button, ButtonProps, buttonVariants, Calendar(), CalendarDayButton(), Pagination(), PaginationContent, PaginationEllipsis() (+9 more)

### Community 10 - "server.ts"
Cohesion: 0.25
Nodes (9): consumeLastCapturedError(), renderErrorPage(), brandedErrorResponse(), fetch(), getServerEntry(), isCatastrophicSsrErrorBody(), normalizeCatastrophicSsrResponse(), ServerEntry (+1 more)

### Community 11 - "queries.ts"
Cohesion: 0.06
Nodes (52): deleteReasonSchema, mapDbError(), parseJsonBody(), AuthError, requireAuth(), requireRole(), createSql(), getDb() (+44 more)

### Community 12 - "dependencies"
Cohesion: 0.13
Nodes (15): bcryptjs, class-variance-authority, dependencies, bcryptjs, class-variance-authority, @radix-ui/react-scroll-area, @radix-ui/react-slider, @radix-ui/react-slot (+7 more)

### Community 13 - "AdminShell.tsx"
Cohesion: 0.18
Nodes (10): NAV_GROUPS, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton (+2 more)

### Community 14 - "auth.tsx"
Cohesion: 0.06
Nodes (41): AdminPlaceholder(), CryoHealthAdminOnly(), AdminShell(), DemoBanner(), NAV, SiteHeader(), AuthCtx, AuthProvider() (+33 more)

### Community 15 - "drawer.tsx"
Cohesion: 0.25
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 16 - "form.tsx"
Cohesion: 0.15
Nodes (12): FormControl, FormDescription, FormField(), FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue (+4 more)

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

### Community 21 - "admin.districts.tsx"
Cohesion: 0.14
Nodes (16): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle (+8 more)

### Community 22 - "admin-schemas.ts"
Cohesion: 0.10
Nodes (20): Alert, alertSchema, Case, caseSchema, ChwProfile, chwProfileSchema, DeleteReason, DistrictUpdate (+12 more)

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

### Community 27 - "admin.glaciers.index.tsx"
Cohesion: 0.16
Nodes (10): Textarea, GlacierCreate, glacierCreateSchema, dependentsMessage(), DialogState, DistrictRow, GLACIER_STATUSES, GlacierRow (+2 more)

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

### Community 33 - "admin.lakes.$lakeId.tsx"
Cohesion: 0.08
Nodes (35): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow (+27 more)

### Community 34 - "HANDOFF — cryohealth — 2026-08-10 02:15 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-10 02:15 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 35 - "FileRoutesByPath"
Cohesion: 0.11
Nodes (19): Route, Route, Route, Route, Route, Route, Route, Route (+11 more)

### Community 37 - "HANDOFF — cryohealth — 2026-08-09 22:10 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-09 22:10 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 39 - "HANDOFF — cryohealth — 2026-08-09 23:20 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-09 23:20 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 40 - "react"
Cohesion: 0.25
Nodes (7): react, react, useCarousel(), useChart(), useFormField(), useSidebar(), useIsMobile()

### Community 43 - "HANDOFF — cryohealth — 2026-08-09 01:25 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-09 01:25 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 44 - "index.tsx"
Cohesion: 0.18
Nodes (8): EDGES, getNode(), NodeDef, NodeId, NODES, PipelineDiagram(), StatPair(), Route

### Community 63 - "HANDOFF — cryohealth — 2026-08-01 21:45 PKT"
Cohesion: 0.15
Nodes (12): Addendum — 2026-08-03 (harness maintenance), Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-01 21:45 PKT, Loops run, Next action, Not done / deferred (+4 more)

### Community 66 - "HANDOFF — cryohealth — 2026-08-15 22:35 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-15 22:35 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

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

### Community 102 - "select.tsx"
Cohesion: 0.25
Nodes (7): SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

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
Cohesion: 0.15
Nodes (12): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+4 more)

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
Nodes (10): Assumptions & blast radius, GATE decision 1: what goes in `audit.reason`, GATE decision 2: require `source` on hand-created glaciers, Headline: four net-new capabilities in one task, Loop budget, PLAN, Rollback, Settled, not GATE items (named so they don't get re-litigated mid-build) (+2 more)

### Community 127 - "chart.tsx"
Cohesion: 0.20
Nodes (7): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, THEMES

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
Cohesion: 0.18
Nodes (11): 11. Risks / assumptions that would change the plan if wrong, 12. Key file paths, 2. The scaffold to follow — `src/routes/api/public/alerts.ts`, 5. UI primitives — all present, all unused, 6. Write-path precedent in `src/lib/queries.ts`, 7. Client-side details a build agent will miss, 8. Role gating — settled, not a GATE item, Headline (+3 more)

### Community 134 - "sheet.tsx"
Cohesion: 0.22
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 135 - "Session report — /uexel:verify for task #7"
Cohesion: 0.25
Nodes (7): A note on process, Build phase (no fix loop needed), Final verdict, Fix-loop: 1 of 3 iterations used, Session report — /uexel:verify for task #7, What was built and verified, Why the loop stopped

### Community 137 - "Plan steps"
Cohesion: 0.25
Nodes (8): Plan steps, Step 0 — pre-flight (no commit), Step 1 — fill `districtSchema` + `glacierSchema` in `src/lib/admin-schemas.ts`, Step 2 — `writeAudit(sql, {...})` helper + the three district write functions, Step 3 — `api/admin/districts.ts` (POST) + `api/admin/districts.$districtId.ts` (PUT/DELETE), Step 4 — `admin.districts.tsx`: Actions column, create/edit Dialog+Form, delete AlertDialog, Step 8 — cleanup, Steps 5-7 — the same three steps for glaciers

### Community 138 - "badge.tsx"
Cohesion: 0.67
Nodes (3): Badge(), BadgeProps, badgeVariants

### Community 139 - "router.tsx"
Cohesion: 0.40
Nodes (4): getRouter(), Register, routeTree, startInstance

### Community 140 - "accordion.tsx"
Cohesion: 0.50
Nodes (3): AccordionContent, AccordionItem, AccordionTrigger

### Community 141 - "10. Draft plan steps (one atomic commit each)"
Cohesion: 0.25
Nodes (8): 10. Draft plan steps (one atomic commit each), Step 0 — pre-flight, no commit, Step 1 — `districtSchema` + `glacierSchema` in `src/lib/admin-schemas.ts`, Step 2 — `writeAudit(sql, {...})` helper **plus** the three district write functions, one commit, Step 3 — `api/admin/districts.ts` (POST) + `api/admin/districts.$districtId.ts` (PUT/DELETE), Step 4 — `admin.districts.tsx`: Actions column, create/edit Dialog + Form, delete AlertDialog, Step 8 — `graphify update .` + close-out., Steps 5–7 — the same three steps for glaciers

### Community 142 - "9. Deviations / decisions to name at GATE"
Cohesion: 0.25
Nodes (8): 9. Deviations / decisions to name at GATE, D1 (GATE) — what goes in `audit.reason`, D2 (GATE) — require `source` on hand-created glaciers, D3 (non-deviation, state it so nobody invents work) — route file layout, D4 (non-deviation) — no changes to the public GET endpoints or their queries, D5 (sizing) — `size:m` is optimistic; pre-authorize the split, D6 (non-deviation) — edit/delete affordances live on the list pages only, D7 (non-deviation) — no migration, ever, in this repo

### Community 143 - "Session report — /uexel:verify + close for task #9"
Cohesion: 0.25
Nodes (7): Exceptions, Final verdict, Mini-handoff, Session report — /uexel:verify + close for task #9, Since the last report, Verify: pass 1, Why the loop stopped at 1/3 iterations

### Community 144 - "avatar.tsx"
Cohesion: 0.50
Nodes (3): Avatar, AvatarFallback, AvatarImage

### Community 146 - "3. The `audit` table — exact live schema"
Cohesion: 0.50
Nodes (4): 3. The `audit` table — exact live schema, Atomicity — the template-defining decision, Naming convention — settled by the single live row, do not invent one, This repo has never written an audit row

### Community 147 - "4. `districts` / `glaciers` schemas and the delete problem"
Cohesion: 0.50
Nodes (4): 4. `districts` / `glaciers` schemas and the delete problem, `districts` — 2 live rows, `glaciers` — 6 live rows, all `status = 'unknown'`, The delete problem — the DB will never stop you

### Community 148 - "1. Exact current state of the four route files"
Cohesion: 0.67
Nodes (3): 1. Exact current state of the four route files, Trap T1 — `tsc` will not catch an unsupported HTTP verb, Trap T2 — the DoD's filename for the glacier modals is wrong

## Knowledge Gaps
- **824 isolated node(s):** `check-gstack.sh script`, `$schema`, `style`, `rsc`, `tsx` (+819 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **66 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`, `cmdk`, `input-otp`, `@cloudflare/vite-plugin`, `tailwind-merge`, `clsx`, `react`, `date-fns`, `embla-carousel-react`, `leaflet`, `lucide-react`, `@radix-ui/react-accordion`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-avatar`, `@radix-ui/react-checkbox`, `@radix-ui/react-collapsible`, `@radix-ui/react-context-menu`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-label`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-popover`, `@radix-ui/react-progress`, `@radix-ui/react-radio-group`, `@radix-ui/react-select`, `@radix-ui/react-separator`, `@radix-ui/react-switch`, `@radix-ui/react-tabs`, `@radix-ui/react-toggle`, `@radix-ui/react-toggle-group`, `react-day-picker`, `react-hook-form`, `react-leaflet`, `react-resizable-panels`, `recharts`, `sonner`, `@tailwindcss/vite`, `@tanstack/react-start`, `@tanstack/router-plugin`, `@types/leaflet`, `vaul`, `vite-tsconfig-paths`, `zod`, `jose`, `postgres`, `react-dom`, `tailwindcss`, `@tanstack/react-query`, `@tanstack/react-router`, `@hookform/resolvers`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `cn`, `dependencies`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `sidebar.tsx`, `utils.ts`, `sheet.tsx`, `command.tsx`, `menubar.tsx`, `badge.tsx`, `accordion.tsx`, `drawer.tsx`, `avatar.tsx`, `form.tsx`, `context-menu.tsx`, `dropdown-menu.tsx`, `admin.districts.tsx`, `breadcrumb.tsx`, `navigation-menu.tsx`, `admin.glaciers.index.tsx`, `card.tsx`, `toggle-group.tsx`, `admin.lakes.$lakeId.tsx`, `select.tsx`, `input-otp.tsx`, `carousel.tsx`, `chart.tsx`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **What connects `check-gstack.sh script`, `$schema`, `style` to the rest of the system?**
  _824 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `glaciers.$glacierId.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.057859703020993344 - nodes in this community are weakly interconnected._
- **Should `routeTree.gen.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.02702702702702703 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._