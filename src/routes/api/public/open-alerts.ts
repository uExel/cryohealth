import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";

export const Route = createFileRoute("/api/public/open-alerts")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const res = await apiFetch("/alerts?pageSize=5", { method: "GET" });
          const alerts = res.items || res.alerts || (Array.isArray(res) ? res : []);
          return Response.json({ alerts });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },
  },
});
