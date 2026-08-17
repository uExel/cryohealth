import { createFileRoute } from "@tanstack/react-router";
import { createLake, InvalidDistrictError } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { lakeCreateSchema } from "@/lib/admin-schemas";
import { parseJsonBody, mapDbError } from "@/lib/api-errors";

export const Route = createFileRoute("/api/admin/lakes")({
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

        const parsed = lakeCreateSchema.safeParse(json.data);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid request body", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        try {
          const lake = await createLake({ ...parsed.data, actorId: claims.sub });
          return Response.json({ lake });
        } catch (err) {
          if (err instanceof InvalidDistrictError) {
            return Response.json({ error: err.message }, { status: 400 });
          }
          if ((err as { code?: string; constraint_name?: string })?.code === "23505") {
            const constraint = (err as { constraint_name?: string }).constraint_name;
            const message =
              constraint === "UQ_725a4ca381cc90f5d6822852184"
                ? `A lake with ICIMOD ID "${parsed.data.icimodId}" already exists.`
                : `A lake with slug "${parsed.data.slug}" already exists.`;
            return Response.json({ error: message }, { status: 409 });
          }
          const mapped = mapDbError(err);
          if (mapped) return mapped;
          throw err;
        }
      },
    },
  },
});
