import { createFileRoute } from "@tanstack/react-router";
import { listHazardScores } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";

export const Route = createFileRoute("/api/public/hazard-scores/$lakeId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const claims = await requireAuth(request);
          requireRole(claims, ["cryohealth_admin", "facility_admin"]);
        } catch (e) {
          if (e instanceof AuthError) return e.response;
          throw e;
        }
        // `hazardScores` keeps its original key so this stays a purely additive change for any
        // existing consumer; `total`/`hasMore` are what let a caller tell a complete list from a
        // list capped at 120 (issue #27).
        const { rows, total, hasMore } = await listHazardScores(params.lakeId);
        return Response.json({ hazardScores: rows, total, hasMore });
      },
    },
  },
});
