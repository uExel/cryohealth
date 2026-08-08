import { createFileRoute } from "@tanstack/react-router";
import { listProtocols } from "@/lib/queries";

export const Route = createFileRoute("/api/public/protocols")({
  server: {
    handlers: {
      GET: async () => Response.json({ protocols: await listProtocols() }),
    },
  },
});
