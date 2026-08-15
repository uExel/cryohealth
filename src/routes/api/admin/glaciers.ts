import { createFileRoute } from "@tanstack/react-router";
import { createGlacier } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { glacierCreateSchema } from "@/lib/admin-schemas";
import { parseJsonBody, mapDbError } from "@/lib/api-errors";

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

        const json = await parseJsonBody(request);
        if (!json.ok) return json.response;

        const parsed = glacierCreateSchema.safeParse(json.data);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid request body", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        try {
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
        } catch (err) {
          const mapped = mapDbError(err);
          if (mapped) return mapped;
          throw err;
        }
      },
    },
  },
});
