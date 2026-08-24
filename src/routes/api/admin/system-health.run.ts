import { createFileRoute } from "@tanstack/react-router";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { triggerGeoRun } from "@/lib/cryohealth-geo";

/** System health page — "Run now" trigger. `cryohealth_admin` only: requireRole 403s a
 *  facility_admin token hitting this endpoint directly, so the gate is real, not merely a
 *  hidden button (the DoD requirement). Proxies to CryoHealth-geo `POST /run` (no body, no auth
 *  of its own — private-network service); a geo failure becomes a 502 here, not an unhandled
 *  throw. Only POST is defined; other methods 405. */
export const Route = createFileRoute("/api/admin/system-health/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const claims = await requireAuth(request);
          requireRole(claims, ["cryohealth_admin"]);
        } catch (e) {
          if (e instanceof AuthError) return e.response;
          throw e;
        }

        try {
          const result = await triggerGeoRun();
          return Response.json({ ok: true, result });
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 502 });
        }
      },
    },
  },
});
