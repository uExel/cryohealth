import { createFileRoute } from "@tanstack/react-router";
import { updateGlacier, deleteGlacier, HasDependentsError } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { glacierUpdateSchema, deleteReasonSchema } from "@/lib/admin-schemas";

export const Route = createFileRoute("/api/admin/glaciers/$glacierId")({
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

        const parsed = glacierUpdateSchema.safeParse(await request.json());
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid request body", issues: parsed.error.issues },
            { status: 400 },
          );
        }
        if (Object.keys(parsed.data).length === 0) {
          return Response.json({ error: "No fields to update" }, { status: 400 });
        }

        const glacier = await updateGlacier(params.glacierId, parsed.data, claims.sub);
        if (!glacier) return Response.json({ error: "Not found" }, { status: 404 });
        return Response.json({ glacier });
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

        const parsed = deleteReasonSchema.safeParse(await request.json());
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid request body", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        try {
          const id = await deleteGlacier(params.glacierId, parsed.data.reason, claims.sub);
          if (!id) return Response.json({ error: "Not found" }, { status: 404 });
          return Response.json({ ok: true });
        } catch (err) {
          if (err instanceof HasDependentsError) {
            return Response.json(
              { error: "Cannot delete: dependent rows exist", dependents: err.dependents },
              { status: 409 },
            );
          }
          throw err;
        }
      },
    },
  },
});
