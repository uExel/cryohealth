import { createFileRoute } from "@tanstack/react-router";
import { listDistricts } from "@/lib/queries";

export const Route = createFileRoute("/api/public/districts")({
  server: {
    handlers: {
      GET: async () => Response.json({ districts: await listDistricts() }),
    },
  },
});
