import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";

function getToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.substring(7);
  return undefined;
}

export const Route = createFileRoute("/api/public/alerts")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const res = await apiFetch("/alerts?includeCleared=true", { method: "GET" });
          const items = res.items || res.alerts || (Array.isArray(res) ? res : []);
          const total = res.total ?? items.length;
          const hasMore = items.length < total;
          return new Response(JSON.stringify({ alerts: items, total, hasMore }), {
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
        const body = await request.json();
        try {
          await apiFetch("/alerts", {
            method: "POST",
            body: JSON.stringify(body),
          }, token);
          return Response.json({ ok: true });
        } catch (err: any) {
          const status = err.message?.includes("409") ? 409 : err.message?.includes("403") ? 403 : 400;
          return Response.json({ error: err.message }, { status });
        }
      },
    },
  },
});
