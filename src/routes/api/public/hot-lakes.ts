import { createFileRoute } from "@tanstack/react-router";
import { listHotLakes } from "@/lib/queries";

export const Route = createFileRoute("/api/public/hot-lakes")({
  server: {
    handlers: {
      GET: async () => Response.json({ lakes: await listHotLakes() }),
    },
  },
});
