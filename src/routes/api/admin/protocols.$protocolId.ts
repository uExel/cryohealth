import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";
import { protocolUpdateSchema } from "@/lib/admin-schemas";
import { parseJsonBody } from "@/lib/api-errors";

function getToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.substring(7);
  return undefined;
}

export const Route = createFileRoute("/api/admin/protocols/$protocolId")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        const token = getToken(request);
        const json = await parseJsonBody(request);
        if (!json.ok) return json.response;

        const parsed = protocolUpdateSchema.safeParse(json.data);
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
          const protocol = await apiFetch(`/admin/protocols/${params.protocolId}`, {
            method: "PUT",
            body: JSON.stringify(parsed.data),
          }, token);
          return Response.json({ protocol });
        } catch (err: any) {
          const status = err.message?.includes("404") ? 404 : 400;
          return Response.json({ error: err.message }, { status });
        }
      },
      DELETE: async ({ request, params }) => {
        const token = getToken(request);
        const url = new URL(request.url);
        const reason = url.searchParams.get("reason");
        if (!reason || reason.trim() === "") {
          return Response.json({ error: "reason is required" }, { status: 400 });
        }

        try {
          await apiFetch(`/admin/protocols/${params.protocolId}`, {
            method: "DELETE",
            body: JSON.stringify({ reason }),
          }, token);
          return Response.json({ ok: true });
        } catch (err: any) {
          const status = err.message?.includes("404") ? 404 : 400;
          return Response.json({ error: err.message }, { status });
        }
      },
    },
  },
});
