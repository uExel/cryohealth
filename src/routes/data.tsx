import { createFileRoute } from "@tanstack/react-router";
import { apiBaseUrl } from "@/lib/cryohealth-api";

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
    path: "/lakes",
    desc: "All monitored glacial lakes with current risk tier, location, and last update time. Optional query parameters: page (default 1) and pageSize (default 50). Each item carries more fields than shown (boundary, source, population estimate, confidence); the example is trimmed and its ids and values are made-up placeholders.",
    example: `{
  "items": [
    {
      "id": "00000000-0000-4000-8000-000000000002",
      "slug": "shishper",
      "name": "Shishper glacial lake",
      "valley": "Hunza",
      "district": "Hunza",
      "geom": { "type": "Point", "coordinates": [74.65, 36.32] },
      "elevationM": 3100,
      "currentTier": "watch",
      "stale": false,
      "currentRiskScore": 0.38,
      "downstreamPopulation": 4200,
      "currentScore": { "score": 0.38, "tier": "watch", "computedAt": "2026-08-09T04:12:00.000Z" },
      "updatedAt": "2026-08-09T04:12:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 50
}`,
  },
  {
    method: "GET",
    path: "/lakes/{lakeId}/detail",
    desc: "A single lake's detail: current state, risk score history (oldest first, up to 120 rows, empty until scores have been computed), the lake's latest alerts, and the glacier inventory. The example is trimmed; its ids and values are made-up placeholders, and the risk score is sent as a string.",
    example: `{
  "lake": {
    "id": "00000000-0000-4000-8000-000000000002",
    "name": "Shishper glacial lake",
    "district_name": "Hunza",
    "lat": 36.32,
    "lng": 74.65,
    "current_tier": "WATCH",
    "current_risk_score": "0.3800",
    "downstream_population": 4200,
    "stale": false
  },
  "history": [{ "score": "0.3800", "tier": "WATCH", "confidence": "0.81", "observed_at": "2026-08-08T00:00:00.000Z" }],
  "alerts": [
    {
      "id": "00000000-0000-4000-8000-000000000003",
      "title": "Shishper glacial lake: tier now WATCH",
      "tier": "WATCH",
      "status": "active",
      "cleared_at": null,
      "created_at": "2026-08-09T04:12:00.000Z",
      "estimated_window": "next 24h"
    }
  ],
  "glaciers": [{ "id": "00000000-0000-4000-8000-000000000004", "name": "Shishper Glacier", "rgi_id": "RGI2000-v7.0-G-14-00000", "area_km2": "15.4000", "status": "surging" }]
}`,
  },
  {
    method: "GET",
    path: "/lakes/{lakeId}/observations",
    desc: "A lake's satellite water-area readings (Sentinel-2), newest first. Optional query parameters: page (default 1) and pageSize (default 100, maximum 500). The example below is illustrative: all ids and values are made-up placeholders, not real CryoHealth data, and the number formatting shown is not a guarantee.",
    example: `{
  "items": [
    {
      "id": "00000000-0000-4000-8000-000000000001",
      "lakeId": "00000000-0000-4000-8000-000000000002",
      "capturedAt": "2026-08-08T00:00:00.000Z",
      "source": "sentinel2",
      "areaKm2": "0.412300",
      "cloudFraction": "0.1200",
      "sceneId": "S2B_MSIL2A_20260808",
      "runId": "run_2026-08-09",
      "createdAt": "2026-08-09T04:12:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 100
}`,
  },
  {
    method: "GET",
    path: "/hot-lakes",
    desc: "Lakes currently at HIGH or CRITICAL tier only, highest risk score first. The response is a bare array, and the risk score (0 to 1) is sent as a string.",
    example: `[
  {
    "id": "00000000-0000-4000-8000-000000000002",
    "name": "Shishper glacial lake",
    "current_tier": "CRITICAL",
    "current_risk_score": "0.7800",
    "downstream_population": 4200,
    "last_updated": "2026-08-09T04:12:00.000Z"
  }
]`,
  },
  {
    method: "GET",
    path: "/alerts",
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
    path: "/glaciers",
    desc: "Glacier inventory (RGI v7 / GLIMS derived): area, length, elevation range, and observed status per glacier.",
    example: `{ "glaciers": [{ "id": "gl_101", "name": "Shishper Glacier", "rgi_id": "RGI60-14.07524", "district_id": "hunza", "area_km2": 15.4, "status": "surging" }] }`,
  },
  {
    method: "GET",
    path: "/glaciers/{glacierId}",
    desc: "A single glacier's detail: observation time series, associated lakes, and recent disaster-related cases in its district.",
    example: `{ "glacier": { "id": "gl_101", "name": "Shishper Glacier" }, "observations": [ ], "lakes": [ ], "cases": [ ] }`,
  },
  {
    method: "GET",
    path: "/facilities",
    desc: "Health facilities with a mapped location, type, and vulnerability rating, used to show downstream exposure.",
    example: `{ "facilities": [{ "id": "fac_12", "name": "Gilgit District Hospital", "lat": 35.92, "lng": 74.31, "type": "hospital", "vulnerability": "medium" }] }`,
  },
  {
    method: "GET",
    path: "/districts",
    desc: "Reference list of districts and their province, used to filter every other endpoint.",
    example: `{ "districts": [{ "id": "hunza", "name": "Hunza", "province": "Gilgit-Baltistan", "population": null }] }`,
  },
  {
    method: "GET",
    path: "/protocols",
    desc: "The prevention and care protocols the offline app draws on, with disaster-related protocols flagged.",
    example: `{ "protocols": [{ "id": "pr_5", "title": "Safe drinking water after a flood", "is_disaster": true }] }`,
  },
  {
    method: "GET",
    path: "/kpis",
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
          <code>curl {apiBaseUrl()}/lakes</code>
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
              href={`${apiBaseUrl()}${e.path.replace(/\/\{[^}]+\}.*$/, "")}`}
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
