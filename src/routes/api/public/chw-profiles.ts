import { createFileRoute } from "@tanstack/react-router";
import { listChwProfiles } from "@/lib/queries";

export const Route = createFileRoute("/api/public/chw-profiles")({
  server: {
    handlers: {
      GET: async () => Response.json({ profiles: await listChwProfiles() }),
    },
  },
});
