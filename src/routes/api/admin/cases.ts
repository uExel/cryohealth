import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";
import { caseCreateSchema } from "@/lib/admin-schemas";
import { parseJsonBody } from "@/lib/api-errors";

function getToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.substring(7);
  return undefined;
}

export const Route = createFileRoute("/api/admin/cases")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = getToken(request);
        try {
          const res = await apiFetch("/admin/cases", { method: "GET" }, token);
          const rows = Array.isArray(res) ? res : (res.rows || res.cases || []);
          const total = res.total ?? rows.length;
          const hasMore = res.hasMore ?? false;
          return new Response(JSON.stringify({ cases: rows, total, hasMore }), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "private, no-store",
            },
          });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        const token = getToken(request);
        const json = await parseJsonBody(request);
        if (!json.ok) return json.response;

        const parsed = caseCreateSchema.safeParse(json.data);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid request body", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        try {
          const created = await apiFetch("/cases", {
            method: "POST",
            body: JSON.stringify(parsed.data),
          }, token);
          return Response.json({ case: created });
        } catch (err: any) {
          const status = err.message?.includes("400") ? 400 : 500;
          return Response.json({ error: err.message }, { status });
        }
      },
    },
  },
});
