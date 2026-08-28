import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";

export const Route = createFileRoute("/api/public/chw-profiles")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const profiles = await apiFetch("/chw-profiles", { method: "GET" });
          return Response.json({ profiles });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },
  },
});
