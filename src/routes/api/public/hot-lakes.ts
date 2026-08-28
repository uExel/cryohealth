import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";

export const Route = createFileRoute("/api/public/hot-lakes")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const lakes = await apiFetch("/hot-lakes", { method: "GET" });
          return Response.json({ lakes });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },
  },
});
