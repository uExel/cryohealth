import { createFileRoute } from "@tanstack/react-router";
import { updateAlert, clearAlert, deleteAlert, HasDependentsError } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { alertUpdateSchema, deleteReasonSchema } from "@/lib/admin-schemas";
import { parseJsonBody, mapDbError } from "@/lib/api-errors";

export const Route = createFileRoute("/api/admin/alerts/$alertId")({
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

        const parsed = alertUpdateSchema.safeParse(json.data);
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
          const alert = await updateAlert(params.alertId, parsed.data, claims.sub);
          if (!alert) return Response.json({ error: "Not found" }, { status: 404 });
          return Response.json({ alert });
        } catch (err) {
          if ((err as { code?: string })?.code === "23505") {
            return Response.json(
              { error: "An active alert already exists for that lake and tier." },
              { status: 409 },
            );
          }
          const mapped = mapDbError(err);
          if (mapped) return mapped;
          throw err;
        }
      },
      PATCH: async ({ request, params }) => {
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
          const alert = await clearAlert(params.alertId, parsed.data.reason, claims.sub);
          if (!alert) return Response.json({ error: "Not found" }, { status: 404 });
          return Response.json({ alert });
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
          const id = await deleteAlert(params.alertId, parsed.data.reason, claims.sub);
          if (!id) return Response.json({ error: "Not found" }, { status: 404 });
          return Response.json({ ok: true });
        } catch (err) {
          if (err instanceof HasDependentsError) {
            return Response.json(
              { error: "Cannot delete: dependent rows exist", dependents: err.dependents },
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
