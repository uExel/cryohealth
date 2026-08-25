import { createFileRoute } from "@tanstack/react-router";
import { getLakeDetail, listAlertsForLake, listGlaciers, listLakeRiskScores } from "@/lib/queries";
import { invalidUuidResponse } from "@/lib/api-errors";

export const Route = createFileRoute("/api/public/lakes/$lakeId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        // Before the fan-out below: all four queries bind `lakeId` to a `uuid` column, so a
        // malformed id used to reach Postgres and come back as an uncaught 22P02 — a 500
        // HTML error shell from a JSON endpoint (issue #28).
        const invalid = invalidUuidResponse(params.lakeId, "lake id");
        if (invalid) return invalid;

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
