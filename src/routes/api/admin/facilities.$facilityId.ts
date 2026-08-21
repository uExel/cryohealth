import { createFileRoute } from "@tanstack/react-router";
import { updateFacility, deleteFacility } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { facilityUpdateSchema, deleteReasonSchema } from "@/lib/admin-schemas";
import { parseJsonBody, mapDbError } from "@/lib/api-errors";

export const Route = createFileRoute("/api/admin/facilities/$facilityId")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
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

        const parsed = facilityUpdateSchema.safeParse(json.data);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid request body", issues: parsed.error.issues },
            { status: 400 },
          );
        }
        if (Object.keys(parsed.data).length === 0) {
          return Response.json({ error: "No fields to update" }, { status: 400 });
        }

        try {
          const facility = await updateFacility(params.facilityId, parsed.data, claims.sub);
          if (!facility) return Response.json({ error: "Not found" }, { status: 404 });
          return Response.json({ facility });
        } catch (err) {
          const mapped = mapDbError(err);
          if (mapped) return mapped;
          throw err;
        }
      },
      DELETE: async ({ request, params }) => {
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

        const parsed = deleteReasonSchema.safeParse(json.data);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid request body", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        try {
          const id = await deleteFacility(params.facilityId, parsed.data.reason, claims.sub);
          if (!id) return Response.json({ error: "Not found" }, { status: 404 });
          return Response.json({ ok: true });
        } catch (err) {
          const mapped = mapDbError(err);
          if (mapped) return mapped;
          throw err;
        }
      },
    },
  },
});
