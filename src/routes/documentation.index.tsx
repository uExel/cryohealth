import { createFileRoute, Link } from "@tanstack/react-router";
import { REPOS } from "@/lib/docs/repos";
import { TABLES } from "@/lib/docs/schema";

const URL = "https://cryohealth.io/documentation";

export const Route = createFileRoute("/documentation/")({
  head: () => ({
    meta: [
      { title: "Documentation — CryoHealth" },
      {
        name: "description",
        content:
          "Technical documentation for CryoHealth: system architecture, services, and database schema design.",
      },
      { property: "og:title", content: "Documentation — CryoHealth" },
      {
        property: "og:description",
        content: "How CryoHealth is built: architecture and schema design.",
      },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: DocumentationOverview,
});

function DocumentationOverview() {
  return (
    <article className="max-w-3xl">
      <h1 className="text-3xl font-semibold text-foreground">How CryoHealth is built</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        CryoHealth links satellite-based glacial lake outburst flood (GLOF) early warning with
        offline health guidance for community health workers in Gilgit Baltistan. It is four
        open-source services sharing one PostgreSQL + PostGIS database.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          to="/documentation/architecture"
          className="rounded-xl border border-border bg-card p-5 hover:border-[var(--color-accent)]"
        >
          <div className="text-sm font-semibold text-foreground">System architecture →</div>
          <p className="mt-2 text-sm text-muted-foreground">
            The services, how data flows from satellite scene to alert, and the design rules that
            hold it together.
          </p>
        </Link>
        <Link
          to="/documentation/schema"
          className="rounded-xl border border-border bg-card p-5 hover:border-[var(--color-accent)]"
        >
          <div className="text-sm font-semibold text-foreground">Schema design →</div>
          <p className="mt-2 text-sm text-muted-foreground">
            All {TABLES.length} tables in the shared database, grouped by domain, with columns,
            relationships, and enums.
          </p>
        </Link>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-foreground">Repositories</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        All four repositories are public on GitHub.
      </p>
      <ul className="mt-4 space-y-3">
        {Object.values(REPOS).map((r) => (
          <li key={r.name}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener"
              className="block rounded-xl border border-border bg-card p-4 hover:border-[var(--color-accent)]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <code className="text-sm font-semibold text-foreground">{r.name} ↗</code>
                <span className="text-xs text-muted-foreground">{r.stack}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{r.role}</p>
              <p className="mt-2 text-xs text-primary">{r.url.replace("https://", "")}</p>
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}
