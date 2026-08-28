import { createFileRoute } from "@tanstack/react-router";
import { invalidUuidResponse } from "@/lib/api-errors";
import { apiFetch } from "@/lib/cryohealth-api";

export const Route = createFileRoute("/api/public/lakes/$lakeId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const invalid = invalidUuidResponse(params.lakeId, "lake id");
        if (invalid) return invalid;

        try {
          const data = await apiFetch(`/lakes/${params.lakeId}/detail`);
          return Response.json(data);
        } catch (err: any) {
          const status = err.message.includes("not found") ? 404 : 500;
          return Response.json({ error: err.message || "An error occurred" }, { status });
        }
      },
    },
  },
});
