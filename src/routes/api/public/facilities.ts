import { createFileRoute } from "@tanstack/react-router";
import { listFacilities } from "@/lib/queries";

export const Route = createFileRoute("/api/public/facilities")({
  server: {
    handlers: {
      GET: async () => Response.json({ facilities: await listFacilities() }),
    },
  },
});
