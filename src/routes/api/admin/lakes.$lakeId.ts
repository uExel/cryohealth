import { createFileRoute } from "@tanstack/react-router";
import { updateLake, deleteLake, HasDependentsError, InvalidDistrictError } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { lakeUpdateSchema } from "@/lib/admin-schemas";
import { parseJsonBody, mapDbError } from "@/lib/api-errors";

export const Route = createFileRoute("/api/admin/lakes/$lakeId")({
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

        // .strict() 400s here (unrecognized_keys) if currentTier, current_risk_score,
        // or slug are present in the body -- task #11 GATE decision 1, layer 1.
        const parsed = lakeUpdateSchema.safeParse(json.data);
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
          const lake = await updateLake(params.lakeId, parsed.data, claims.sub);
          if (!lake) return Response.json({ error: "Not found" }, { status: 404 });
          return Response.json({ lake });
        } catch (err) {
          if (err instanceof InvalidDistrictError) {
            return Response.json({ error: err.message }, { status: 400 });
          }
          if ((err as { code?: string })?.code === "23505") {
            const constraint = (err as { constraint_name?: string }).constraint_name;
            const message =
              constraint === "UQ_725a4ca381cc90f5d6822852184"
                ? "A lake with that ICIMOD ID already exists."
                : "A lake with that slug already exists.";
            return Response.json({ error: message }, { status: 409 });
          }
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

        const url = new URL(request.url);
        const reason = url.searchParams.get("reason");
        if (!reason || reason.trim() === "") {
          return Response.json({ error: "reason is required" }, { status: 400 });
        }

        try {
          const id = await deleteLake(params.lakeId, reason, claims.sub);
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
