import { createFileRoute } from "@tanstack/react-router";
import { updateChwProfile, deleteChwProfile } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { chwProfileUpdateSchema } from "@/lib/admin-schemas";
import { parseJsonBody, mapDbError } from "@/lib/api-errors";

export const Route = createFileRoute("/api/admin/chw-profiles/$chwProfileId")({
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

        const parsed = chwProfileUpdateSchema.safeParse(json.data);
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
          const profile = await updateChwProfile(params.chwProfileId, parsed.data, claims.sub);
          if (!profile) return Response.json({ error: "Not found" }, { status: 404 });
          return Response.json({ profile });
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

        const url = new URL(request.url);
        const reason = url.searchParams.get("reason");
        if (!reason || reason.trim() === "") {
          return Response.json({ error: "reason is required" }, { status: 400 });
        }

        try {
          const id = await deleteChwProfile(params.chwProfileId, reason, claims.sub);
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
