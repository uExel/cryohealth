import { createFileRoute } from "@tanstack/react-router";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { lakeCreateSchema } from "@/lib/admin-schemas";
import { parseJsonBody } from "@/lib/api-errors";
import { apiFetch } from "@/lib/cryohealth-api";

function getToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
}

export const Route = createFileRoute("/api/admin/lakes")({
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

        const parsed = lakeCreateSchema.safeParse(json.data);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid request body", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        try {
          const token = getToken(request);
          const data = await apiFetch("/admin/lakes", {
            method: "POST",
            body: JSON.stringify(parsed.data),
          }, token);
          return Response.json(data);
        } catch (err: any) {
          return Response.json({ error: err.message || "An error occurred" }, { status: 400 });
        }
      },
    },
  },
});
