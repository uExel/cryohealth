import { createFileRoute } from "@tanstack/react-router";
import { getKpis } from "@/lib/queries";

export const Route = createFileRoute("/api/public/kpis")({
  server: {
    handlers: {
      GET: async () => {
        const kpis = await getKpis();
        return Response.json(kpis);
      },
    },
  },
});
