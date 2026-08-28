import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";
import { userUpdateSchema } from "@/lib/admin-schemas";
import { parseJsonBody } from "@/lib/api-errors";

function getToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.substring(7);
  return undefined;
}

export const Route = createFileRoute("/api/admin/users/$userId")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        const token = getToken(request);
        const json = await parseJsonBody(request);
        if (!json.ok) return json.response;

        const parsed = userUpdateSchema.safeParse(json.data);
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
          const user = await apiFetch(`/users/${params.userId}`, {
            method: "PUT",
            body: JSON.stringify(parsed.data),
          }, token);
          return Response.json({ user });
        } catch (err: any) {
          const status = err.message?.includes("409") ? 409 : err.message?.includes("404") ? 404 : 400;
          return Response.json({ error: err.message }, { status });
        }
      },
    },
  },
});
