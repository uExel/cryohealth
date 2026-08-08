import { createFileRoute } from "@tanstack/react-router";
import { fetchLakesFromApi } from "@/lib/cryohealth-api";

export const Route = createFileRoute("/api/public/lakes")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const lakes = await fetchLakesFromApi();
          return Response.json({ lakes });
        } catch (error) {
          return Response.json({ error: (error as Error).message }, { status: 502 });
        }
      },
    },
  },
});
