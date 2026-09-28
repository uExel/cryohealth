import { createFileRoute, Link } from "@tanstack/react-router";
import { REPO_LINKS, REPOS } from "@/lib/docs/repos";
import { useTheme } from "@/lib/theme";

const URL = "https://cryohealth.io/documentation/architecture";
// Self-contained Archify export; source JSON lives in docs/architecture/.
const DIAGRAM_SRC = "/docs/system-architecture.html";

export const Route = createFileRoute("/documentation/architecture")({
  head: () => ({
    meta: [
      { title: "System architecture — CryoHealth documentation" },
      {
        name: "description",
        content:
          "CryoHealth system architecture: the API, EO pipeline, field app, and web dashboard, and how data flows from Sentinel-2 scene to GLOF alert.",
      },
      { property: "og:title", content: "System architecture — CryoHealth" },
      {
        property: "og:description",
        content: "Services, data flow, and design rules behind CryoHealth.",
      },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: ArchitecturePage,
});

const COMPONENTS: { name: string; detail: string; href?: string }[] = [
  {
    name: "CryoHealth-api",
    href: REPOS.api.url,
    detail:
      "NestJS service that owns product logic: authentication and roles, alert policy, offline sync, admin, and the unauthenticated Open Data API. It is the only place schema migrations are written.",
  },
  {
    name: "PostgreSQL 16 + PostGIS",
    detail:
      "The single shared database. Lake points and boundaries are stored as PostGIS geometries (SRID 4326).",
  },
  {
    name: "CryoHealth-geo",
    href: REPOS.geo.url,
    detail:
      "Python / FastAPI pipeline on a schedule. It fetches Sentinel-2 scenes, measures lake water extent with NDWI, writes observations, and posts hazard scores to the API, which stores them.",
  },
  {
    name: "CryoHealth-app",
    href: REPOS.app.url,
    detail:
      "Expo / React Native field app. Works offline and syncs through the API's /sync endpoint when a connection is available.",
  },
  {
    name: "cryohealth dashboard",
    href: REPOS.web.url,
    detail:
      "This website, server-rendered with TanStack Start on Cloudflare Workers, for the public, administrators, and CHW leads.",
  },
  {
    name: "Cloudflare tunnel",
    detail:
      "The backend host accepts no inbound connections. Traffic reaches the API only through an outbound-only tunnel at api.cryohealth.io.",
  },
];

const FLOW = [
  "CryoHealth-geo fetches new Sentinel-2 scenes for each monitored lake.",
  "It measures water extent with NDWI and writes a row to observations, tagged with the pipeline run ID.",
  "It computes a hazard score and tier and posts it, with every input, to the API, which stores it in hazard_scores (inputs in components).",
  "CryoHealth-api applies alert policy. Creating or overriding an alert requires a human-readable reason, recorded in the audit table.",
  "The field app and this website read the alert. CHWs acknowledge it, and the app syncs field cases back when online.",
];

const RULES = [
  {
    title: "One schema authority",
    body: "Migrations live only in CryoHealth-api. Every other service reads and writes tables defined there and never alters the schema.",
  },
  {
    title: "Policy is code and people, never silent ML",
    body: "The geo service computes scores. Deciding a tier or issuing an alert happens in the API with an audited reason a person can read.",
  },
  {
    title: "Safety information is never gated",
    body: "Open Data endpoints need no login. Every other route requires a signed token and one of four roles: cryohealth_admin, facility_admin, chw, or viewer.",
  },
  {
    title: "Offline first",
    body: "Each case from the field app carries a client-generated ID, so repeated syncs from a device are idempotent. Every sync is logged in sync_log.",
  },
  {
    title: "Reproducible",
    body: "Every observation and hazard score carries the run ID that produced it, and scores keep their inputs so any tier can be recomputed later.",
  },
];

const SOURCES = [
  {
    label: "CryoHealth-api/ARCHITECTURE.md",
    href: REPO_LINKS.apiArchitecture,
    detail: "the API's module layout and the decisions summarised on this page.",
  },
  {
    label: "CryoHealth-geo/docs/HAZARD_METHODOLOGY.md",
    href: REPO_LINKS.hazardMethodology,
    detail: "how hazard scores are computed: inputs, weights, and tier thresholds.",
  },
  {
    label: "cryohealth/docs/architecture",
    href: REPO_LINKS.diagramSource,
    detail: "source for the diagram above.",
  },
];

function ArchitecturePage() {
  const { theme } = useTheme();
  const embedSrc = `${DIAGRAM_SRC}?embed=1&theme=${theme}`;

  return (
    <article>
      <h1 className="text-3xl font-semibold text-foreground">System architecture</h1>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Four services share one PostgreSQL + PostGIS database. The EO pipeline measures lakes, the
        API decides what becomes an alert, and the field app and this website put that alert in
        front of people.
      </p>

      <figure className="mt-8">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <iframe
            key={theme}
            src={embedSrc}
            title="CryoHealth system architecture diagram"
            className="block h-[70vh] min-h-[420px] w-full"
            loading="lazy"
          />
        </div>
        <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>CryoHealth system architecture</span>
          <a
            href={`${DIAGRAM_SRC}?theme=${theme}`}
            target="_blank"
            rel="noopener"
            className="font-semibold text-primary hover:underline"
          >
            Open full screen ↗
          </a>
        </figcaption>
      </figure>

      <div className="max-w-3xl">
        <h2 className="mt-12 text-lg font-semibold text-foreground">Components</h2>
        <dl className="mt-4 space-y-4">
          {COMPONENTS.map((c) => (
            <div key={c.name} className="rounded-xl border border-border bg-card p-4">
              <dt className="text-sm font-semibold text-foreground">
                {c.href ? (
                  <a href={c.href} target="_blank" rel="noopener" className="hover:underline">
                    {c.name} ↗
                  </a>
                ) : (
                  c.name
                )}
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">{c.detail}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-12 text-lg font-semibold text-foreground">
          From satellite scene to alert
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          {FLOW.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <h2 className="mt-12 text-lg font-semibold text-foreground">Design rules</h2>
        <ul className="mt-4 space-y-4">
          {RULES.map((r) => (
            <li key={r.title}>
              <div className="text-sm font-semibold text-foreground">{r.title}</div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
            </li>
          ))}
        </ul>

        <h2 className="mt-12 text-lg font-semibold text-foreground">Source documents</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {SOURCES.map((s) => (
            <li key={s.href}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener"
                className="font-semibold text-primary hover:underline"
              >
                {s.label} ↗
              </a>{" "}
              — {s.detail}
            </li>
          ))}
        </ul>

        <p className="mt-12 text-sm text-muted-foreground">
          The tables behind this flow are documented in{" "}
          <Link to="/documentation/schema" className="font-semibold text-primary hover:underline">
            Schema design
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
