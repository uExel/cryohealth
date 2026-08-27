import { createFileRoute } from "@tanstack/react-router";
import { updateCase, softDeleteCase } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { caseUpdateSchema } from "@/lib/admin-schemas";
import { parseJsonBody, mapDbError } from "@/lib/api-errors";

/** Issue #15. Same role gate as the collection route (both admin roles) — see
 *  api/admin/cases.ts for why.
 *
 *  DELETE here is a **soft** delete: it calls softDeleteCase, which runs
 *  `UPDATE cases SET deleted_at = now()`. There is no hard-delete path to `cases`
 *  anywhere in this repo, and there should not be one — unlike facilities/protocols,
 *  whose DELETE handlers do destroy the row. */
export const Route = createFileRoute("/api/admin/cases/$caseId")({
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

        const parsed = caseUpdateSchema.safeParse(json.data);
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
          const updated = await updateCase(params.caseId, parsed.data, claims.sub);
          // Also the 404 for an already soft-deleted case: updateCase only matches rows
          // with `deleted_at IS NULL`, so a deleted case is not editable.
          if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
          return Response.json({ case: updated });
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
          const id = await softDeleteCase(params.caseId, reason, claims.sub);
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
