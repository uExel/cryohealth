import { createFileRoute } from "@tanstack/react-router";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { fetchApiHealth } from "@/lib/cryohealth-api";
import { fetchGeoHealth } from "@/lib/cryohealth-geo";

/** System health page. `cryohealth_admin` only — same gate/reasoning as api/admin/users.ts and
 *  audit.ts: a facility_admin token hitting this directly gets a 403 from requireRole, not a
 *  status feed. This GET aggregates the two sibling services' public `/health` probes into one
 *  same-origin payload the browser can poll; the browser never touches CryoHealth-geo directly
 *  (it sends no CORS headers — see cryohealth-geo.ts). Each service is probed independently, so
 *  one being down returns `reachable:false` for that service rather than failing the whole page. */

/** Per-service probe result: the health payload when reachable, else the error string. */
type Probe<T> = { reachable: true; data: T } | { reachable: false; error: string };

async function probe<T>(fn: () => Promise<T>): Promise<Probe<T>> {
  try {
    return { reachable: true, data: await fn() };
  } catch (err) {
    return { reachable: false, error: (err as Error).message };
  }
}

export const Route = createFileRoute("/api/admin/system-health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const claims = await requireAuth(request);
          requireRole(claims, ["cryohealth_admin"]);
        } catch (e) {
          if (e instanceof AuthError) return e.response;
          throw e;
        }

        // Probed in parallel and independently — a slow or down geo service must not delay or
        // fail the api reading, and vice versa.
        const [api, geo] = await Promise.all([probe(fetchApiHealth), probe(fetchGeoHealth)]);
        return Response.json({ api, geo, checkedAt: new Date().toISOString() });
      },
    },
  },
});
