import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";
import { chwProfileCreateSchema } from "@/lib/admin-schemas";
import { parseJsonBody } from "@/lib/api-errors";

function getToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.substring(7);
  return undefined;
}

export const Route = createFileRoute("/api/admin/chw-profiles")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = getToken(request);
        try {
          const res = await apiFetch("/admin/chw-profiles", { method: "GET" }, token);
          return Response.json(res);
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        const token = getToken(request);
        const json = await parseJsonBody(request);
        if (!json.ok) return json.response;

        const parsed = chwProfileCreateSchema.safeParse(json.data);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid request body", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        try {
          const profile = await apiFetch("/admin/chw-profiles", {
            method: "POST",
            body: JSON.stringify(parsed.data),
          }, token);
          return Response.json({ profile });
        } catch (err: any) {
          const status = err.message?.includes("409") ? 409 : err.message?.includes("403") ? 403 : 400;
          return Response.json({ error: err.message }, { status });
        }
      },
    },
  },
});
