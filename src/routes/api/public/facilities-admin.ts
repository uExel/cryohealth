import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";

export const Route = createFileRoute("/api/public/facilities-admin")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const res = await apiFetch("/admin/facilities", { method: "GET" });
          const rows = Array.isArray(res) ? res : (res.rows || res.facilities || []);
          const total = res.total ?? rows.length;
          const hasMore = res.hasMore ?? false;
          return new Response(JSON.stringify({ facilities: rows, total, hasMore }), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "private, no-store",
            },
          });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },
  },
});
