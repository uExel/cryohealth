import { createFileRoute } from "@tanstack/react-router";
import { listOpenAlerts } from "@/lib/queries";

export const Route = createFileRoute("/api/public/open-alerts")({
  server: {
    handlers: {
      GET: async () => Response.json({ alerts: await listOpenAlerts(5) }),
    },
  },
});
