import { createFileRoute } from "@tanstack/react-router";
import { createProtocol } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { protocolCreateSchema } from "@/lib/admin-schemas";
import { parseJsonBody, mapDbError } from "@/lib/api-errors";

export const Route = createFileRoute("/api/admin/protocols")({
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

        const parsed = protocolCreateSchema.safeParse(json.data);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid request body", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        try {
          const protocol = await createProtocol({ ...parsed.data, actorId: claims.sub });
          return Response.json({ protocol });
        } catch (err) {
          if ((err as { code?: string })?.code === "23505") {
            return Response.json(
              { error: `A protocol with slug "${parsed.data.slug}" already exists.` },
              { status: 409 },
            );
          }
          const mapped = mapDbError(err);
          if (mapped) return mapped;
          throw err;
        }
      },
    },
  },
});
