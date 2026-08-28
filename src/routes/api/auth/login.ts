import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "@/lib/cryohealth-api";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json();
        try {
          const res = await apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify(body),
          });
          return Response.json(res);
        } catch (err: any) {
          const msg = err.message || "Authentication failed";
          const status = msg.includes("401") || msg.toLowerCase().includes("wrong") ? 401 : 400;
          return Response.json({ error: msg }, { status });
        }
      },
    },
  },
});
