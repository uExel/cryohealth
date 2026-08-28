import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";

export const Route = createFileRoute("/api/public/districts")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const districts = await apiFetch("/districts", { method: "GET" });
          return Response.json({ districts });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },
  },
});
