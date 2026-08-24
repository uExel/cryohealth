import { createFileRoute } from "@tanstack/react-router";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { triggerGeoHazard } from "@/lib/cryohealth-geo";

/** System health page — "Run hazard pass now" trigger. Same `cryohealth_admin` gate as
 *  system-health.run.ts: requireRole 403s a facility_admin hitting it directly, not just a
 *  hidden button. Proxies to CryoHealth-geo `POST /run-hazard` (no body, no auth of its own);
 *  a geo failure becomes a 502. Only POST is defined; other methods 405. */
export const Route = createFileRoute("/api/admin/system-health/run-hazard")({
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
          const result = await triggerGeoHazard();
          return Response.json({ ok: true, result });
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 502 });
        }
      },
    },
  },
});
