import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";

export const Route = createFileRoute("/api/public/facilities")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const facilities = await apiFetch("/facilities", { method: "GET" });
          return Response.json({ facilities });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },
  },
});
