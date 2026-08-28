import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";

export const Route = createFileRoute("/api/public/lakes-admin")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const data = await apiFetch("/lakes-admin");
          return Response.json({ lakes: data.rows });
        } catch (err: any) {
          return Response.json({ error: err.message || "An error occurred" }, { status: 500 });
        }
      },
    },
  },
});
