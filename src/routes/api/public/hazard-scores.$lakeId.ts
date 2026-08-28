import { createFileRoute } from "@tanstack/react-router";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { invalidUuidResponse } from "@/lib/api-errors";
import { apiFetch } from "@/lib/cryohealth-api";

function getToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
}

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

        const invalid = invalidUuidResponse(params.lakeId, "lake id");
        if (invalid) return invalid;

        try {
          const token = getToken(request);
          const data = await apiFetch(`/lakes/${params.lakeId}/hazard-scores`, {}, token);
          return Response.json(data);
        } catch (err: any) {
          return Response.json({ error: err.message || "An error occurred" }, { status: 500 });
        }
      },
    },
  },
});
