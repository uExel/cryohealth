import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";

export const Route = createFileRoute("/api/public/glaciers")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const glaciers = await apiFetch("/glaciers", { method: "GET" });
          return Response.json({ glaciers });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },
  },
});
