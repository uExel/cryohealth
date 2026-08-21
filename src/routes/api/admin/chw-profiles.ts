import { createFileRoute } from "@tanstack/react-router";
import { createChwProfile } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { chwProfileCreateSchema } from "@/lib/admin-schemas";
import { parseJsonBody, mapDbError } from "@/lib/api-errors";

export const Route = createFileRoute("/api/admin/chw-profiles")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let claims;
        try {
          claims = await requireAuth(request);
          requireRole(claims, ["cryohealth_admin", "facility_admin"]);
        } catch (e) {
          if (e instanceof AuthError) return e.response;
          throw e;
        }

        const json = await parseJsonBody(request);
        if (!json.ok) return json.response;

        const parsed = chwProfileCreateSchema.safeParse(json.data);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid request body", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        try {
          const profile = await createChwProfile({ ...parsed.data, actorId: claims.sub });
          return Response.json({ profile });
        } catch (err) {
          const mapped = mapDbError(err);
          if (mapped) return mapped;
          throw err;
        }
      },
    },
  },
});
