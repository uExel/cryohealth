import { createFileRoute } from "@tanstack/react-router";
import { listFacilitiesAdmin } from "@/lib/queries";

export const Route = createFileRoute("/api/public/facilities-admin")({
  server: {
    handlers: {
      GET: async () => {
        const { rows, total, hasMore } = await listFacilitiesAdmin();
        return new Response(JSON.stringify({ facilities: rows, total, hasMore }), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, no-store",
          },
        });
      },
    },
  },
});
