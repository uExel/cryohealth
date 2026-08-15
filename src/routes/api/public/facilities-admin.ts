import { createFileRoute } from "@tanstack/react-router";
import { listFacilitiesAdmin } from "@/lib/queries";

export const Route = createFileRoute("/api/public/facilities-admin")({
  server: {
    handlers: {
      GET: async () => Response.json({ facilities: await listFacilitiesAdmin() }),
    },
  },
});
