import { createFileRoute } from "@tanstack/react-router";
import { listGlaciers } from "@/lib/queries";

export const Route = createFileRoute("/api/public/glaciers")({
  server: {
    handlers: {
      GET: async () => Response.json({ glaciers: await listGlaciers() }),
    },
  },
});
