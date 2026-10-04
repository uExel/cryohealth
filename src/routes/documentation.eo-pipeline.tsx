import { createFileRoute, Link } from "@tanstack/react-router";
import { REPO_LINKS, REPOS } from "@/lib/docs/repos";
import { useTheme } from "@/lib/theme";

const URL = "https://cryohealth.io/documentation/eo-pipeline";
// Self-contained Archify exports; source JSON lives in docs/architecture/.
const ARCHITECTURE_SRC = "/docs/geo-architecture.html";
const PIPELINE_SRC = "/docs/geo-pipeline.html";

export const Route = createFileRoute("/documentation/eo-pipeline")({
  head: () => ({
    meta: [
      { title: "EO pipeline — CryoHealth documentation" },
      {
        name: "description",
        content:
          "How CryoHealth-geo turns Sentinel-2 scenes into lake water-extent observations and GLOF hazard scores: architecture, pipeline steps, hazard index, and configuration.",
      },
      { property: "og:title", content: "EO pipeline — CryoHealth" },
      {
        property: "og:description",
        content: "From Sentinel-2 scene to NDWI observation to hazard score.",
      },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: EoPipelinePage,
});

const ENTRY_POINTS = [
  {
    name: "Daily scheduler",
    detail:
      "APScheduler runs inside the FastAPI process every 24 hours: the observation pass first, then the hazard pass, so scoring always sees that run's newest observation.",
  },
  {
    name: "POST /run and POST /run-hazard",
    detail:
      "Trigger either pass on demand with the same code the scheduler runs. GET /health reports whether the scheduler is running.",
  },
  {
    name: "Backfill CLI",
    detail:
      "uv run python -m pipeline.backfill --start YYYY-MM-DD fills history over a date range. It is a terminal command on purpose: imagery quota and run time grow with the range.",
  },
];

const OBSERVATION_STEPS = [
  "For each of the six monitored lakes, search Sentinel-2 L2A for up to 12 recent scenes over the lake's area of interest (a box reaching about 1 km out from the lake's point).",
  "Read the green (B03), near-infrared (B08) and scene classification (SCL) bands, already aligned on one 10 m grid.",
  "Mask cloud, cloud shadow and cirrus pixels (SCL 3, 8, 9, 10). Snow and ice (SCL 11) stay unmasked because glacial lakes border them.",
  "If more than 50% of the area is masked, skip the scene and try the next one.",
  "Compute NDWI = (Green − NIR) / (Green + NIR). Pixels above 0 count as water; area is water pixels × 100 m².",
  "Upsert a row into observations with the area, cloud fraction, scene ID and run ID. One row per lake per day per source; a re-run never overwrites it.",
  "Flag the lake stale if its newest observation is more than 60 days old, and clear the flag when a fresher one lands.",
];

const HAZARD_STEPS = [
  "Read each lake's static fields (dam type, glacier contact, GLOF history) and its last 548 days of observations, then close the database connection before any slow network work.",
  "Compute mean terrain slope from the Copernicus GLO-30 DEM. Terrain does not change, so the result is cached per process.",
  "Count population within 5 km of the lake (a square buffer) from the WorldPop Pakistan 2025 raster, downloaded once (about 140 MB) and cached.",
  "Compute the hazard index and tier with pure functions in pipeline/hazard.py.",
  "POST the score, tier and full components to CryoHealth-api's /alerts/hazard-scores with the service API key. The API stores the score and decides whether a tier change raises an alert.",
];

const COMPONENTS = [
  {
    name: "Area growth (30 and 90 days)",
    weight: "0.30",
    risk: "Growth clamped to 0–50% and mapped to 0–1; the two windows are averaged. Shrinking is not scored.",
  },
  {
    name: "Dam type",
    weight: "0.20",
    risk: "moraine 1.0 · ice 0.8 · unknown 0.5 · bedrock 0.2",
  },
  {
    name: "Historical GLOF",
    weight: "0.15",
    risk: "1.0 if the lake has a recorded GLOF, else 0",
  },
  {
    name: "Seasonal anomaly",
    weight: "0.15",
    risk: "Latest area against the same month in other years, clamped to 0–30%",
  },
  {
    name: "Glacier contact",
    weight: "0.10",
    risk: "1.0 if still in contact with its glacier, else 0.3",
  },
  {
    name: "Slope",
    weight: "0.10",
    risk: "Mean slope clamped to 0–40° and mapped to 0–1",
  },
];

const TIERS = [
  { tier: "critical", score: "≥ 0.65" },
  { tier: "high", score: "≥ 0.45" },
  { tier: "watch", score: "≥ 0.25" },
  { tier: "normal", score: "< 0.25" },
];

const SOURCES_OF_SCENES = [
  {
    name: "Copernicus Data Space (production)",
    detail:
      "Used when CDSE_CLIENT_ID is set. STAC search finds candidate scenes; the Sentinel Hub Process API, authenticated with OAuth2 client credentials, returns the bands already cropped and reprojected on the server.",
  },
  {
    name: "Microsoft Planetary Computer (fallback)",
    detail:
      "Anonymous, used when no CDSE credentials are present. The service reprojects the box into each scene's UTM zone and upsamples the 20 m SCL band so every band lines up.",
  },
];

const CONFIG = [
  {
    name: "CDSE_CLIENT_ID, CDSE_CLIENT_SECRET",
    detail: "Copernicus OAuth client; selects the production scene source",
  },
  { name: "CRYOHEALTH_API_URL", detail: "Base URL of CryoHealth-api" },
  { name: "CRYOHEALTH_API_KEY", detail: "Must equal CryoHealth-api's GEO_SERVICE_API_KEY" },
  {
    name: "DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME",
    detail: "Shared PostgreSQL + PostGIS; defaults match local docker-compose (port 5433)",
  },
  { name: "CRYOHEALTH_CACHE_DIR", detail: "Where the WorldPop raster is cached" },
];

const LIMITS = [
  "Weights and tier thresholds are a documented starting point. None of the six lakes has had a GLOF in the observed period, so they are not yet calibrated.",
  "Only growth counts as risk. A lake draining fast, which can mean an outburst is underway, is not detected by this index.",
  "Exposure uses a straight-line 5 km square, not a modelled flood path, and does not change the tier.",
  "Each lake is measured inside a fixed box around its point, not its digitized outline.",
  "Very small lakes give noisy areas from day to day; the growth clamp limits how far one bad reading can move the score.",
  "POST /run and /run-hazard have no authentication, so the service must stay on a private network.",
];

const DOCS = [
  {
    label: "CryoHealth-geo/pipeline",
    href: REPO_LINKS.geoPipeline,
    detail: "the service code: one module per step described on this page.",
  },
  {
    label: "CryoHealth-geo/docs/HAZARD_METHODOLOGY.md",
    href: REPO_LINKS.hazardMethodology,
    detail: "the full hazard methodology, kept in step with pipeline/hazard.py.",
  },
  {
    label: "cryohealth/docs/architecture",
    href: REPO_LINKS.diagramSource,
    detail: "source for both diagrams above.",
  },
];

function Diagram({ src, title }: { src: string; title: string }) {
  const { theme } = useTheme();

  return (
    <figure className="mt-8">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <iframe
          key={theme}
          src={`${src}?embed=1&theme=${theme}`}
          title={`${title} diagram`}
          className="block h-[70vh] min-h-[420px] w-full"
          loading="lazy"
        />
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{title}</span>
        <a
          href={`${src}?theme=${theme}`}
          target="_blank"
          rel="noopener"
          className="font-semibold text-primary hover:underline"
        >
          Open full screen ↗
        </a>
      </figcaption>
    </figure>
  );
}

function EoPipelinePage() {
  return (
    <article>
      <h1 className="text-3xl font-semibold text-foreground">EO pipeline</h1>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        <a
          href={REPOS.geo.url}
          target="_blank"
          rel="noopener"
          className="font-semibold text-primary hover:underline"
        >
          CryoHealth-geo ↗
        </a>{" "}
        is the Python service that watches glacial lakes from space. Once a day it measures each
        lake's water area from Sentinel-2 imagery, then scores its outburst hazard. It only
        computes: whether a score becomes an alert is decided by CryoHealth-api.
      </p>

      <h2 className="mt-12 text-lg font-semibold text-foreground">Service architecture</h2>
      <Diagram src={ARCHITECTURE_SRC} title="CryoHealth-geo service architecture" />

      <h2 className="mt-12 text-lg font-semibold text-foreground">Scene to hazard score</h2>
      <Diagram src={PIPELINE_SRC} title="CryoHealth-geo pipeline" />

      <div className="max-w-3xl">
        <h2 className="mt-12 text-lg font-semibold text-foreground">Entry points</h2>
        <dl className="mt-4 space-y-4">
          {ENTRY_POINTS.map((e) => (
            <div key={e.name} className="rounded-xl border border-border bg-card p-4">
              <dt className="text-sm font-semibold text-foreground">{e.name}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{e.detail}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-12 text-lg font-semibold text-foreground">Observation pass</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The daily run keeps the newest usable scene per lake. A backfill keeps every usable scene
          in its date range.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          {OBSERVATION_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <h2 className="mt-12 text-lg font-semibold text-foreground">Scene sources</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Both sit behind one SceneSource interface that always returns pixel-aligned bands, so the
          rest of the pipeline never knows which one it is using.
        </p>
        <ul className="mt-4 space-y-4">
          {SOURCES_OF_SCENES.map((s) => (
            <li key={s.name}>
              <div className="text-sm font-semibold text-foreground">{s.name}</div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.detail}</p>
            </li>
          ))}
        </ul>

        <h2 className="mt-12 text-lg font-semibold text-foreground">Hazard pass</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          {HAZARD_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          In both passes a failure at one lake is recorded against that lake and the run moves on to
          the next.
        </p>

        <h2 className="mt-12 text-lg font-semibold text-foreground">Hazard index</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Methodology version 1.0. Six components are each turned into a risk from 0 to 1 and
          combined as a weighted sum. A missing signal counts as zero risk rather than shifting its
          weight onto the others. Every score is stored with its raw inputs, risks, weights and
          thresholds, so it can be recomputed from the database alone.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-semibold">Component</th>
                <th className="px-4 py-2 font-semibold">Weight</th>
                <th className="px-4 py-2 font-semibold">Risk</th>
              </tr>
            </thead>
            <tbody>
              {COMPONENTS.map((c) => (
                <tr key={c.name} className="border-t border-border align-top">
                  <td className="px-4 py-2 font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-2 font-mono text-foreground">{c.weight}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-6 text-sm font-semibold text-foreground">Tiers</h3>
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
          {TIERS.map((t) => (
            <li
              key={t.tier}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-muted-foreground"
            >
              <span className="font-semibold text-foreground">{t.tier}</span>{" "}
              <span className="font-mono">{t.score}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Population exposure is stored with the score to help prioritise lakes. It never changes
          the tier.
        </p>

        <h2 className="mt-12 text-lg font-semibold text-foreground">Configuration</h2>
        <dl className="mt-4 divide-y divide-border rounded-xl border border-border">
          {CONFIG.map((c) => (
            <div key={c.name} className="px-4 py-3">
              <dt>
                <code className="text-xs font-semibold text-foreground">{c.name}</code>
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">{c.detail}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Every merge to main that passes CI builds a Docker image, pushes it to GitHub Container
          Registry, and redeploys the service on the backend host.
        </p>

        <h2 className="mt-12 text-lg font-semibold text-foreground">Known limitations</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          {LIMITS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>

        <h2 className="mt-12 text-lg font-semibold text-foreground">Source documents</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {DOCS.map((s) => (
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
          Where this service fits among the others is shown in{" "}
          <Link
            to="/documentation/architecture"
            className="font-semibold text-primary hover:underline"
          >
            System architecture
          </Link>
          ; the observations, lakes and hazard_scores tables are in{" "}
          <Link to="/documentation/schema" className="font-semibold text-primary hover:underline">
            Schema design
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
