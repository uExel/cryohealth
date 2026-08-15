import { createFileRoute } from "@tanstack/react-router";
import { createDistrict } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { districtCreateSchema } from "@/lib/admin-schemas";
import { parseJsonBody, mapDbError } from "@/lib/api-errors";

export const Route = createFileRoute("/api/admin/districts")({
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

        const parsed = districtCreateSchema.safeParse(json.data);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid request body", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        try {
          const district = await createDistrict({
            name: parsed.data.name,
            province: parsed.data.province,
            population: parsed.data.population ?? null,
            centroidLat: parsed.data.centroid_lat ?? null,
            centroidLng: parsed.data.centroid_lng ?? null,
            actorId: claims.sub,
          });
          return Response.json({ district });
        } catch (err) {
          if ((err as { code?: string })?.code === "23505") {
            return Response.json(
              { error: `A district named "${parsed.data.name}" already exists.` },
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
