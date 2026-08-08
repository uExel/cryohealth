import { createFileRoute } from "@tanstack/react-router";
import { getLakeDetail, listAlertsForLake, listGlaciers, listLakeRiskScores } from "@/lib/queries";

export const Route = createFileRoute("/api/public/lakes/$lakeId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const [lake, history, alerts, glaciers] = await Promise.all([
          getLakeDetail(params.lakeId),
          listLakeRiskScores(params.lakeId),
          listAlertsForLake(params.lakeId),
          listGlaciers(),
        ]);
        if (!lake) return Response.json({ error: "Not found" }, { status: 404 });
        return Response.json({ lake, history, alerts, glaciers });
      },
    },
  },
});
