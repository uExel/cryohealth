import { createFileRoute } from "@tanstack/react-router";
import {
  getGlacier,
  listDisasterCasesForDistrict,
  listGlacierObservations,
  listLakesForAssoc,
} from "@/lib/queries";

export const Route = createFileRoute("/api/public/glaciers/$glacierId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const glacier = await getGlacier(params.glacierId);
        if (!glacier) return Response.json({ error: "Not found" }, { status: 404 });
        const [observations, lakes, cases] = await Promise.all([
          listGlacierObservations(params.glacierId),
          listLakesForAssoc(),
          glacier.district_id
            ? listDisasterCasesForDistrict(glacier.district_id as string)
            : Promise.resolve([]),
        ]);
        return Response.json({ glacier, observations, lakes, cases });
      },
    },
  },
});
