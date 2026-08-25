import { createFileRoute } from "@tanstack/react-router";
import {
  getGlacier,
  listDisasterCasesForDistrict,
  listGlacierObservations,
  listLakesForAssoc,
} from "@/lib/queries";
import { invalidUuidResponse } from "@/lib/api-errors";

export const Route = createFileRoute("/api/public/glaciers/$glacierId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        // Same class as issue #28's two `.$lakeId` routes: `getGlacier` binds this to a
        // `uuid` column, so a malformed id 500'd with an HTML shell instead of JSON. Seen
        // live during task #6's verify (`curl .../glaciers/not-a-uuid` → 500) — that pass
        // fixed the admin page's handling of the 500 but not the shape of the response.
        const invalid = invalidUuidResponse(params.glacierId, "glacier id");
        if (invalid) return invalid;

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
