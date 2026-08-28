import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";

function getToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.substring(7);
  return undefined;
}

export const Route = createFileRoute("/api/public/alert-acks")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const acks = await apiFetch("/alert-acks", { method: "GET" });
          return Response.json({ acks });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        const token = getToken(request);
        const { alertId } = (await request.json()) as { alertId: string };
        try {
          await apiFetch(`/admin/alerts/${alertId}/ack`, {
            method: "POST",
          }, token);
          return Response.json({ ok: true });
        } catch (err: any) {
          const status = err.message?.includes("401") ? 401 : 400;
          return Response.json({ error: err.message }, { status });
        }
      },
    },
  },
});
