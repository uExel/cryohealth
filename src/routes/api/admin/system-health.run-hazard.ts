import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";

function getToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.substring(7);
  return undefined;
}

export const Route = createFileRoute("/api/admin/system-health/run-hazard")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = getToken(request);
        try {
          const res = await apiFetch("/admin/health/run-hazard", { method: "POST" }, token);
          return Response.json(res);
        } catch (err: any) {
          const status = err.message?.includes("403") ? 403 : 502;
          return Response.json({ error: err.message }, { status });
        }
      },
    },
  },
});
