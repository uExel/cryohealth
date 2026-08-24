/**
 * Server-side client for CryoHealth-geo, the hazard-pipeline service. Mirrors
 * cryohealth-api.ts: every function here runs inside a TanStack Start server route, never in
 * the browser. CryoHealth-geo sends no CORS headers and has no inbound auth of its own (it is
 * meant to sit on a private network), so the browser must not call it directly — the
 * /api/admin/system-health* routes proxy to it same-origin and gate on cryohealth_admin first.
 */

function geoBaseUrl(): string {
  // Same dual-read as cryohealth-api.ts: VITE_-prefixed for Vite build/dev (import.meta.env),
  // falling back to the plain runtime var. Only CRYOHEALTH_GEO_URL is documented in
  // .env.example, matching how CRYOHEALTH_API_URL is treated.
  const url = import.meta.env.VITE_CRYOHEALTH_GEO_URL || process.env.CRYOHEALTH_GEO_URL;
  if (!url) throw new Error("Missing CRYOHEALTH_GEO_URL environment variable.");
  return url.replace(/\/+$/, "");
}

/** CryoHealth-geo's `GET /health` shape. `status` is a plain string ("ok"); `scheduler_running`
 *  reflects whether the APScheduler background job loop is live. */
export type GeoHealth = { status: string; scheduler_running: boolean };

/**
 * Probes CryoHealth-geo `GET /health`. Throws on a network error or non-2xx so the
 * system-health route can present the service as unreachable rather than failing the whole page.
 */
export async function fetchGeoHealth(): Promise<GeoHealth> {
  const res = await fetch(`${geoBaseUrl()}/health`);
  if (!res.ok) throw new Error(`CryoHealth-geo /health returned ${res.status}`);
  return (await res.json()) as GeoHealth;
}

/**
 * Proxies `POST /run` (run the latest ingest/scoring pass now). CryoHealth-geo expects no
 * request body and returns `{ results: [...] }`; that payload is returned verbatim to the
 * caller. Throws on non-2xx so the route can surface a 502.
 */
export async function triggerGeoRun(): Promise<unknown> {
  const res = await fetch(`${geoBaseUrl()}/run`, { method: "POST" });
  if (!res.ok) throw new Error(`CryoHealth-geo /run returned ${res.status}`);
  return res.json();
}

/**
 * Proxies `POST /run-hazard` (re-run the hazard-scoring pass now). Same contract as
 * triggerGeoRun: no request body, `{ results: [...] }` back, throws on non-2xx.
 */
export async function triggerGeoHazard(): Promise<unknown> {
  const res = await fetch(`${geoBaseUrl()}/run-hazard`, { method: "POST" });
  if (!res.ok) throw new Error(`CryoHealth-geo /run-hazard returned ${res.status}`);
  return res.json();
}
