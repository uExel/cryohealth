import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";

function getToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.substring(7);
  return undefined;
}

export const Route = createFileRoute("/api/admin/audit")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = getToken(request);
        const url = new URL(request.url);
        const queryStr = url.search ? url.search : "";

        try {
          if (url.searchParams.get("format") === "csv") {
            const base = import.meta.env.VITE_CRYOHEALTH_API_URL || process.env.CRYOHEALTH_API_URL || "http://localhost:3000";
            const res = await fetch(`${base}/admin/audit${queryStr}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const text = await res.text();
            const stamp = new Date().toISOString().slice(0, 10);
            return new Response(text, {
              headers: {
                "content-type": "text/csv; charset=utf-8",
                "content-disposition": `attachment; filename="audit-log-${stamp}.csv"`,
              },
            });
          }

          const res = await apiFetch(`/admin/audit${queryStr}`, { method: "GET" }, token);
          return Response.json(res);
        } catch (err: any) {
          const status = err.message?.includes("403") ? 403 : 400;
          return Response.json({ error: err.message }, { status });
        }
      },
    },
  },
});
