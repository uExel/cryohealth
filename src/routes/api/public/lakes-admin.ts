import { createFileRoute } from "@tanstack/react-router";
import { listLakesAdmin } from "@/lib/queries";

export const Route = createFileRoute("/api/public/lakes-admin")({
  server: {
    handlers: {
      GET: async () => Response.json({ lakes: await listLakesAdmin() }),
    },
  },
});
