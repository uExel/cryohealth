import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";

function getToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.substring(7);
  return undefined;
}

export const Route = createFileRoute("/api/public/cases")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = getToken(request);
        const body = await request.json();
        try {
          await apiFetch("/cases", {
            method: "POST",
            body: JSON.stringify(body),
          }, token);
          return Response.json({ ok: true });
        } catch (err: any) {
          const status = err.message?.includes("401") ? 401 : 400;
          return Response.json({ error: err.message }, { status });
        }
      },
    },
  },
});
