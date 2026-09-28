import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/documentation")({
  component: DocumentationLayout,
});

const SECTIONS = [
  { to: "/documentation", label: "Overview", exact: true },
  { to: "/documentation/architecture", label: "System architecture", exact: false },
  { to: "/documentation/schema", label: "Schema design", exact: false },
] as const;

function DocumentationLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:flex md:gap-10">
      <aside className="mb-8 md:mb-0 md:w-56 md:shrink-0">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Documentation
        </p>
        <nav className="mt-3 flex gap-1 overflow-x-auto md:sticky md:top-24 md:flex-col">
          {SECTIONS.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              activeOptions={{ exact: s.exact }}
              className="whitespace-nowrap border-l-[3px] border-transparent px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground data-[status=active]:border-[var(--color-accent)] data-[status=active]:text-foreground"
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
