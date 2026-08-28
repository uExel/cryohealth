import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";

function getToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.substring(7);
  return undefined;
}

export const Route = createFileRoute("/api/admin/sync")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = getToken(request);
        try {
          const res = await apiFetch("/admin/sync", { method: "GET" }, token);
          return Response.json(res);
        } catch (err: any) {
          const status = err.message?.includes("403") ? 403 : 500;
          return Response.json({ error: err.message }, { status });
        }
      },
    },
  },
});
