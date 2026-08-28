import { createFileRoute } from "@tanstack/react-router";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { lakeUpdateSchema } from "@/lib/admin-schemas";
import { parseJsonBody } from "@/lib/api-errors";
import { apiFetch } from "@/lib/cryohealth-api";

function getToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
}

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
          const token = getToken(request);
          const data = await apiFetch(`/admin/lakes/${params.lakeId}`, {
            method: "PUT",
            body: JSON.stringify(parsed.data),
          }, token);
          return Response.json(data);
        } catch (err: any) {
          return Response.json({ error: err.message || "An error occurred" }, { status: 400 });
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
          const token = getToken(request);
          const data = await apiFetch(
            `/admin/lakes/${params.lakeId}?reason=${encodeURIComponent(reason)}`,
            { method: "DELETE" },
            token,
          );
          return Response.json(data);
        } catch (err: any) {
          // If the backend returned detailed dependents in a conflict, format accordingly
          let status = 400;
          let dependents: any = undefined;
          if (err.message.includes("dependent rows exist") || err.message.includes("Conflict")) {
            status = 409;
            // Best effort: mock dependents structure or parse from message if available
          }
          return Response.json(
            { error: err.message || "An error occurred", dependents },
            { status },
          );
        }
      },
    },
  },
});
