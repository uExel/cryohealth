import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "Open data and API — CryoHealth" },
      {
        name: "description",
        content:
          "Public, read-only, CC BY 4.0 licensed API for glacial lake hazard data and aggregated health indicators in Gilgit Baltistan.",
      },
      { property: "og:title", content: "Open data and API — CryoHealth" },
      {
        property: "og:description",
        content:
          "Public read-only endpoints for lakes, alerts, glaciers, and programme KPIs. No authentication, no fee.",
      },
      { property: "og:url", content: "https://cryohealth.io/data" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://cryohealth.io/data" }],
  }),
  component: DataPage,
});

type Endpoint = {
  method: "GET";
  path: string;
  desc: string;
  example: string;
};

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/public/lakes",
    desc: "All monitored glacial lakes with current risk tier, location, and last update time.",
    example: `{
  "lakes": [
    {
      "id": "lk_shishper",
      "name": "Shishper glacial lake",
      "lat": 36.32,
      "lng": 74.65,
      "current_tier": "WATCH",
      "stale": false,
      "district_id": "hunza",
      "elevation_m": 3100,
      "last_updated": "2026-08-09T04:12:00Z"
    }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/public/lakes/{lakeId}",
    desc: "A single lake's detail: current state, risk score history, alerts issued for it, and nearby glaciers.",
    example: `{
  "lake": { "id": "lk_shishper", "name": "Shishper glacial lake", "current_tier": "WATCH" },
  "history": [{ "score": 62, "tier": "WATCH", "confidence": 0.81, "observed_at": "2026-08-08" }],
  "alerts": [{ "id": "al_204", "title": "Watch: Shishper", "tier": "WATCH" }],
  "glaciers": [ ]
}`,
  },
  {
    method: "GET",
    path: "/api/public/hot-lakes",
    desc: "Lakes currently at HIGH or CRITICAL tier only, ordered by risk score.",
    example: `{ "lakes": [{ "id": "lk_shishper", "name": "Shishper glacial lake", "current_tier": "HIGH", "current_risk_score": 78, "downstream_population": 4200, "last_updated": "2026-08-09T04:12:00Z" }] }`,
  },
  {
    method: "GET",
    path: "/api/public/alerts",
    desc: "Every alert issued, newest first: dispatch tier, message text, target lake or district, and estimated impact window.",
    example: `{
  "alerts": [
    {
      "id": "al_204",
      "title": "Watch: Shishper glacial lake",
      "tier": "WATCH",
      "body_en": "Risk rising. Avoid contaminated water sources downstream.",
      "body_ur": null,
      "estimated_window": "next 24h",
      "affected_population": 4200,
      "created_at": "2026-08-09T04:12:00Z",
      "status": "active",
      "cleared_at": null,
      "lake_name": "Shishper glacial lake",
      "district_name": "Hunza"
    }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/public/glaciers",
    desc: "Glacier inventory (RGI v7 / GLIMS derived): area, length, elevation range, and observed status per glacier.",
    example: `{ "glaciers": [{ "id": "gl_101", "name": "Shishper Glacier", "rgi_id": "RGI60-14.07524", "district_id": "hunza", "area_km2": 15.4, "status": "surging" }] }`,
  },
  {
    method: "GET",
    path: "/api/public/glaciers/{glacierId}",
    desc: "A single glacier's detail: observation time series, associated lakes, and recent disaster-related cases in its district.",
    example: `{ "glacier": { "id": "gl_101", "name": "Shishper Glacier" }, "observations": [ ], "lakes": [ ], "cases": [ ] }`,
  },
  {
    method: "GET",
    path: "/api/public/facilities",
    desc: "Health facilities with a mapped location, type, and vulnerability rating, used to show downstream exposure.",
    example: `{ "facilities": [{ "id": "fac_12", "name": "Gilgit District Hospital", "lat": 35.92, "lng": 74.31, "type": "hospital", "vulnerability": "medium" }] }`,
  },
  {
    method: "GET",
    path: "/api/public/districts",
    desc: "Reference list of districts and their province, used to filter every other endpoint.",
    example: `{ "districts": [{ "id": "hunza", "name": "Hunza", "province": "Gilgit-Baltistan", "population": null }] }`,
  },
  {
    method: "GET",
    path: "/api/public/protocols",
    desc: "The prevention and care protocols the offline app draws on, with disaster-related protocols flagged.",
    example: `{ "protocols": [{ "id": "pr_5", "title": "Safe drinking water after a flood", "is_disaster": true }] }`,
  },
  {
    method: "GET",
    path: "/api/public/kpis",
    desc: "Platform-wide indicators: lakes at HIGH or CRITICAL, alerts in the last 30 days, cases in the last 7 days, active community health workers.",
    example: `{ "highLakes": 2, "alerts30d": 14, "cases7d": 9, "chws": 11 }`,
  },
];

function DataPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Open data</p>
      <h1 className="mt-2 text-3xl font-semibold text-foreground">Open data and API</h1>
      <p className="mt-2 text-lg text-muted-foreground">Public, read only, CC BY 4.0.</p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        CryoHealth is API driven end to end. Everything the app uses is available through the same
        documented endpoints below, so any partner or ministry can integrate without a negotiation,
        a contract or a fee. Endpoints are read-only and require no authentication.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Try it now
        </p>
        <pre className="mt-2 overflow-x-auto rounded-md bg-secondary/60 p-3 text-xs text-foreground">
          <code>curl https://cryohealth.io/api/public/lakes</code>
        </pre>
        <p className="mt-2 text-xs text-muted-foreground">
          No API key, no headers required. Copy, paste, and the response comes back live.
        </p>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-foreground">Endpoints</h2>
      <ul className="mt-4 space-y-4">
        {ENDPOINTS.map((e) => (
          <li key={e.path} className="rounded-xl border border-border bg-card p-4">
            <a
              href={e.path.replace(/\{[^}]+\}/, "")}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-sm text-primary hover:underline"
            >
              {e.method} {e.path}
            </a>
            <p className="mt-1 text-xs text-muted-foreground">{e.desc}</p>
            <pre className="mt-2 overflow-x-auto rounded-md bg-secondary/60 p-3 text-xs text-foreground">
              <code>{e.example}</code>
            </pre>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-lg font-semibold text-foreground">Update frequency</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Lake risk tiers and glacier observations refresh within 4 hours of new Sentinel or MODIS
        imagery. Alerts and KPIs are generated in real time as events occur. Reference tables
        (districts, facilities, protocols) change only when the underlying dataset is updated.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-foreground">Licence</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Code is released under the{" "}
        <a
          href="https://github.com/uExel/cryohealth/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          MIT licence
        </a>
        . Data returned by these endpoints is released under{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          CC BY 4.0
        </a>
        . Suggested attribution: “Data from CryoHealth (cryohealth.io), uExel Solutions, CC BY 4.0.”
      </p>

      <h2 className="mt-10 text-lg font-semibold text-foreground">Interoperability</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        CryoHealth does not currently claim conformance with HL7 FHIR or DHIS2. Because the platform
        is API driven and holds no personally identifiable data, adding those adapters is an
        integration task rather than a rebuild, and we intend to pursue both as national health
        system adoption requires it.
      </p>

      <p className="mt-10 rounded-xl border border-border bg-secondary/40 p-4 text-xs text-muted-foreground">
        Public endpoints are rate limited. For higher volume access, contact us. It is free.
      </p>
    </main>
  );
}
