import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";

export const Route = createFileRoute("/api/public/protocols")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const protocols = await apiFetch("/protocols", { method: "GET" });
          return Response.json({ protocols });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },
  },
});
