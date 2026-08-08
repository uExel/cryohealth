import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "Open Data — CryoHealth" },
      { name: "description", content: "Public hazard and health data endpoints under CC BY 4.0." },
      { property: "og:title", content: "Open Data — CryoHealth" },
      {
        property: "og:description",
        content:
          "Public read-only API endpoints for lakes, alerts, and KPIs — free to use under CC BY 4.0.",
      },
      { property: "og:url", content: "https://cryohealth.life/data" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://cryohealth.life/data" }],
  }),
  component: DataPage,
});

const ENDPOINTS = [
  { path: "/api/public/lakes", desc: "All monitored lakes with current risk tier and score." },
  { path: "/api/public/lakes/:id/risk", desc: "Risk score history for a single lake." },
  { path: "/api/public/alerts", desc: "Issued alerts (newest first)." },
  {
    path: "/api/public/kpis",
    desc: "Platform KPIs: lakes in HIGH+, alerts 30d, cases 7d, active CHWs.",
  },
];

function DataPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-foreground">Open data API</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        All hazard and aggregated health data is published under CC BY 4.0. Endpoints are read-only
        and require no authentication.
      </p>
      <ul className="mt-6 space-y-3">
        {ENDPOINTS.map((e) => (
          <li key={e.path} className="rounded-xl border border-border bg-card p-4">
            <a
              href={e.path}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-sm text-primary hover:underline"
            >
              GET {e.path}
            </a>
            <p className="mt-1 text-xs text-muted-foreground">{e.desc}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-muted-foreground">
        Code released under Apache 2.0. Data released under CC BY 4.0.
      </p>
    </main>
  );
}
