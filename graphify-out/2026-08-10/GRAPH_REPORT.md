# Graph Report - cryohealth  (2026-08-10)

## Corpus Check
- 152 files · ~139,774 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1057 nodes · 1476 edges · 124 communities (59 shown, 65 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b85dbd6f`
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
- index.tsx
- auth.tsx
- drawer.tsx
- carousel.tsx
- alert.tsx
- AdminPlaceholder.tsx
- context-menu.tsx
- dropdown-menu.tsx
- alert-dialog.tsx
- admin-schemas.ts
- table.tsx
- PRD — CryoHealth Admin Portal
- breadcrumb.tsx
- navigation-menu.tsx
- select.tsx
- card.tsx
- toggle-group.tsx
- What You Must Do When Invoked
- clsx
- avatar.tsx
- badge.tsx
- tabs.tsx
- FileRoutesByPath
- sonner.tsx
- HANDOFF — cryohealth — 2026-08-09 22:10 PKT
- check-gstack.sh
- HANDOFF — cryohealth — 2026-08-09 23:20 PKT
- cmdk
- date-fns
- embla-carousel-react
- HANDOFF — cryohealth — 2026-08-09 01:25 PKT
- input-otp
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
- HANDOFF — cryohealth — 2026-08-10 01:10 PKT
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
- bcryptjs
- .claude/CLAUDE.md
- extraction-spec.md
- LEARNINGS.md
- PLAN
- TODO.md
- jose
- postgres
- react-dom
- tailwind-merge
- tailwindcss
- @tanstack/react-query
- @tanstack/react-router
- input-otp.tsx
- cloudflare-workers.d.ts
- router.tsx
- about.tsx
- sitemap[.]xml.ts
- @cloudflare/vite-plugin
- Route
- lakes.ts
- Route

## God Nodes (most connected - your core abstractions)
1. `cn()` - 69 edges
2. `FileRoutesByPath` - 45 edges
3. `getDb()` - 24 edges
4. `useAuth()` - 20 edges
5. `compilerOptions` - 17 edges
6. `AdminPlaceholder()` - 14 edges
7. `What You Must Do When Invoked` - 12 edges
8. `HANDOFF — cryohealth — 2026-08-01 21:45 PKT` - 12 edges
9. `PRD — CryoHealth Admin Portal` - 11 edges
10. `HANDOFF — cryohealth — 2026-08-10 01:10 PKT` - 11 edges

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

## Communities (124 total, 65 thin omitted)

### Community 0 - "glaciers.$glacierId.tsx"
Cohesion: 0.06
Nodes (46): FreshnessStamp(), escapeHtml(), Facility, Glacier, glacierStatusColor, HazardMap(), Lake, StatCard() (+38 more)

### Community 1 - "routeTree.gen.ts"
Cohesion: 0.03
Nodes (61): AboutRoute, AdminAlertsRoute, AdminAuditRoute, AdminCasesRoute, AdminChwProfilesRoute, AdminDistrictsRoute, AdminFacilitiesRoute, AdminGlaciersGlacierIdRoute (+53 more)

### Community 2 - "devDependencies"
Cohesion: 0.04
Nodes (46): eslint, eslint-config-prettier, @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @lovable.dev/vite-tanstack-config (+38 more)

### Community 3 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2022, eslint.config.js, src/**/*.ts, src/**/*.tsx, vite/client, vite.config.ts (+18 more)

### Community 4 - "sidebar.tsx"
Cohesion: 0.06
Nodes (39): NAV_GROUPS, Input, Separator, SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader() (+31 more)

### Community 5 - "utils.ts"
Cohesion: 0.08
Nodes (14): AccordionContent, AccordionItem, AccordionTrigger, Checkbox, HoverCardContent, PopoverContent, Progress, RadioGroup (+6 more)

### Community 6 - "components.json"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+10 more)

### Community 7 - "command.tsx"
Cohesion: 0.12
Nodes (14): Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut() (+6 more)

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
Cohesion: 0.08
Nodes (37): AuthError, requireAuth(), requireRole(), createSql(), getDb(), getHyperdrive(), HyperdriveEnv, isModuleNotFound() (+29 more)

### Community 12 - "dependencies"
Cohesion: 0.13
Nodes (15): class-variance-authority, @hookform/resolvers, dependencies, class-variance-authority, @hookform/resolvers, @radix-ui/react-scroll-area, @radix-ui/react-slider, @radix-ui/react-slot (+7 more)

### Community 13 - "index.tsx"
Cohesion: 0.19
Nodes (7): EDGES, getNode(), NodeDef, NodeId, NODES, PipelineDiagram(), Route

### Community 14 - "auth.tsx"
Cohesion: 0.08
Nodes (35): AdminShell(), DemoBanner(), NAV, SiteHeader(), AuthCtx, AuthProvider(), authFetch(), AuthUser (+27 more)

### Community 15 - "drawer.tsx"
Cohesion: 0.25
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 16 - "carousel.tsx"
Cohesion: 0.05
Nodes (36): react, react, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem (+28 more)

### Community 17 - "alert.tsx"
Cohesion: 0.40
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Community 18 - "AdminPlaceholder.tsx"
Cohesion: 0.17
Nodes (5): AdminPlaceholder(), CryoHealthAdminOnly(), Route, Route, Route

### Community 19 - "context-menu.tsx"
Cohesion: 0.20
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 20 - "dropdown-menu.tsx"
Cohesion: 0.20
Nodes (9): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+1 more)

### Community 21 - "alert-dialog.tsx"
Cohesion: 0.22
Nodes (8): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle

### Community 22 - "admin-schemas.ts"
Cohesion: 0.11
Nodes (18): Alert, alertSchema, Case, caseSchema, ChwProfile, chwProfileSchema, District, districtSchema (+10 more)

### Community 23 - "table.tsx"
Cohesion: 0.22
Nodes (8): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow

### Community 24 - "PRD — CryoHealth Admin Portal"
Cohesion: 0.17
Nodes (11): 10. Open questions (need a decision before build), 1. Problem & goal, 2. Users & permissions, 3. Information architecture — sidebar, 4. Routes (flat dot-segment convention — matches `lakes.$lakeId.tsx`, no `admin/` directory exists today), 5. Data domain → CRUD matrix, 6. Connected-systems / platform health, 7. Component reuse plan (grounded in current repo state) (+3 more)

### Community 25 - "breadcrumb.tsx"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 26 - "navigation-menu.tsx"
Cohesion: 0.25
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 27 - "select.tsx"
Cohesion: 0.25
Nodes (7): SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Community 28 - "card.tsx"
Cohesion: 0.29
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 29 - "toggle-group.tsx"
Cohesion: 0.33
Nodes (5): ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 30 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 32 - "avatar.tsx"
Cohesion: 0.50
Nodes (3): Avatar, AvatarFallback, AvatarImage

### Community 33 - "badge.tsx"
Cohesion: 0.67
Nodes (3): Badge(), BadgeProps, badgeVariants

### Community 34 - "tabs.tsx"
Cohesion: 0.50
Nodes (3): TabsContent, TabsList, TabsTrigger

### Community 35 - "FileRoutesByPath"
Cohesion: 0.09
Nodes (22): Route, Route, Route, Route, Route, Route, Route, Route (+14 more)

### Community 37 - "HANDOFF — cryohealth — 2026-08-09 22:10 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-09 22:10 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 39 - "HANDOFF — cryohealth — 2026-08-09 23:20 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-09 23:20 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 43 - "HANDOFF — cryohealth — 2026-08-09 01:25 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-09 01:25 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 63 - "HANDOFF — cryohealth — 2026-08-01 21:45 PKT"
Cohesion: 0.15
Nodes (12): Addendum — 2026-08-03 (harness maintenance), Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-01 21:45 PKT, Loops run, Next action, Not done / deferred (+4 more)

### Community 66 - "HANDOFF — cryohealth — 2026-08-10 01:10 PKT"
Cohesion: 0.17
Nodes (11): Done this session, Failed approaches (do not retry), Files touched, HANDOFF — cryohealth — 2026-08-10 01:10 PKT, Loops run, Next action, Not done / deferred, Open questions for a human (+3 more)

### Community 67 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 78 - "cryohealth"
Cohesion: 0.29
Nodes (6): cryohealth, Gotchas, graphify, gstack (REQUIRED — global install), Map, Working here

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

### Community 106 - "PLAN"
Cohesion: 0.12
Nodes (16): Assumptions & blast radius, Deviations from the DoD's literal text (state now, don't let /uexel:verify discover them), Human verification checklist, Loop budget & escalation, NOT in scope (deferred, with rationale — filing 3 follow-up issues, not silently dropping), PLAN, Rollback, Step 0 — pre-flight (not a commit) (+8 more)

### Community 115 - "input-otp.tsx"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 117 - "router.tsx"
Cohesion: 0.40
Nodes (4): getRouter(), Register, routeTree, startInstance

## Knowledge Gaps
- **574 isolated node(s):** `check-gstack.sh script`, `$schema`, `style`, `rsc`, `tsx` (+569 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **65 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`, `carousel.tsx`, `clsx`, `cmdk`, `date-fns`, `embla-carousel-react`, `input-otp`, `leaflet`, `lucide-react`, `@radix-ui/react-accordion`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-avatar`, `@radix-ui/react-checkbox`, `@radix-ui/react-collapsible`, `@radix-ui/react-context-menu`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-label`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-popover`, `@radix-ui/react-progress`, `@radix-ui/react-radio-group`, `@radix-ui/react-select`, `@radix-ui/react-separator`, `@radix-ui/react-switch`, `@radix-ui/react-tabs`, `@radix-ui/react-toggle`, `@radix-ui/react-toggle-group`, `react-day-picker`, `react-hook-form`, `react-leaflet`, `react-resizable-panels`, `recharts`, `sonner`, `@tailwindcss/vite`, `@tanstack/react-start`, `@tanstack/router-plugin`, `@types/leaflet`, `vaul`, `vite-tsconfig-paths`, `zod`, `bcryptjs`, `jose`, `postgres`, `react-dom`, `tailwind-merge`, `tailwindcss`, `@tanstack/react-query`, `@tanstack/react-router`, `@cloudflare/vite-plugin`?**
  _High betweenness centrality (0.216) - this node is a cross-community bridge._
- **Why does `react` connect `carousel.tsx` to `cn`, `dependencies`, `sidebar.tsx`?**
  _High betweenness centrality (0.194) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `sidebar.tsx`, `utils.ts`, `command.tsx`, `menubar.tsx`, `drawer.tsx`, `carousel.tsx`, `alert.tsx`, `context-menu.tsx`, `dropdown-menu.tsx`, `alert-dialog.tsx`, `table.tsx`, `breadcrumb.tsx`, `navigation-menu.tsx`, `select.tsx`, `card.tsx`, `toggle-group.tsx`, `avatar.tsx`, `badge.tsx`, `tabs.tsx`, `input-otp.tsx`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **What connects `check-gstack.sh script`, `$schema`, `style` to the rest of the system?**
  _574 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `glaciers.$glacierId.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05632360471070148 - nodes in this community are weakly interconnected._
- **Should `routeTree.gen.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03225806451612903 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._