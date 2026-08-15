import { createFileRoute } from "@tanstack/react-router";
import { createGlacier } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { glacierCreateSchema } from "@/lib/admin-schemas";

export const Route = createFileRoute("/api/admin/glaciers")({
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

        const parsed = glacierCreateSchema.safeParse(await request.json());
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid request body", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        const glacier = await createGlacier({
          name: parsed.data.name,
          rgiId: parsed.data.rgi_id ?? null,
          glimsId: parsed.data.glims_id ?? null,
          districtId: parsed.data.district_id ?? null,
          lat: parsed.data.lat,
          lng: parsed.data.lng,
          areaKm2: parsed.data.area_km2 ?? null,
          lengthKm: parsed.data.length_km ?? null,
          elevationMinM: parsed.data.elevation_min_m ?? null,
          elevationMaxM: parsed.data.elevation_max_m ?? null,
          status: parsed.data.status,
          terminusType: parsed.data.terminus_type ?? null,
          source: parsed.data.source,
          lastObserved: parsed.data.last_observed ?? null,
          notes: parsed.data.notes ?? null,
          actorId: claims.sub,
        });
        return Response.json({ glacier });
      },
    },
  },
});
