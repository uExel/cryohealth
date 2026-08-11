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
        const hazardScores = await listHazardScores(params.lakeId);
        return Response.json({ hazardScores });
      },
    },
  },
});
