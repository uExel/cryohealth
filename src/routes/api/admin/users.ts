import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";
import { userCreateSchema } from "@/lib/admin-schemas";
import { parseJsonBody } from "@/lib/api-errors";

function getToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.substring(7);
  return undefined;
}

export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = getToken(request);
        try {
          const users = await apiFetch("/users", { method: "GET" }, token);
          return Response.json({ users });
        } catch (err: any) {
          const status = err.message?.includes("403") ? 403 : err.message?.includes("401") ? 401 : 500;
          return Response.json({ error: err.message }, { status });
        }
      },
      POST: async ({ request }) => {
        const token = getToken(request);
        const json = await parseJsonBody(request);
        if (!json.ok) return json.response;

        const parsed = userCreateSchema.safeParse(json.data);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid request body", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        try {
          const user = await apiFetch("/users", {
            method: "POST",
            body: JSON.stringify(parsed.data),
          }, token);
          return Response.json({ user });
        } catch (err: any) {
          const status = err.message?.includes("409") ? 409 : err.message?.includes("403") ? 403 : 400;
          return Response.json({ error: err.message }, { status });
        }
      },
    },
  },
});
