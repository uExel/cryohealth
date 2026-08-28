import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";

export const Route = createFileRoute("/api/public/kpis")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const kpis = await apiFetch("/kpis", { method: "GET" });
          return Response.json(kpis);
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },
  },
});
