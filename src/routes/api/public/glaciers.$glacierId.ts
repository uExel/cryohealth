import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";
import { invalidUuidResponse } from "@/lib/api-errors";

export const Route = createFileRoute("/api/public/glaciers/$glacierId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const invalid = invalidUuidResponse(params.glacierId, "glacier id");
        if (invalid) return invalid;

        try {
          const glacier = await apiFetch(`/glaciers/${params.glacierId}`, { method: "GET" });
          const observations = await apiFetch(`/glaciers/${params.glacierId}/observations`, { method: "GET" });
          const lakes = await apiFetch("/lakes", { method: "GET" });
          const lakesList = Array.isArray(lakes) ? lakes : (lakes.items || []);
          return Response.json({ glacier, observations, lakes: lakesList, cases: [] });
        } catch (err: any) {
          const status = err.message?.includes("404") ? 404 : 500;
          return Response.json({ error: err.message }, { status });
        }
      },
    },
  },
});
