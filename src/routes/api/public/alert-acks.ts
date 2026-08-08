import { createFileRoute } from "@tanstack/react-router";
import { insertAlertAck, listAlertAcks } from "@/lib/queries";
import { requireAuth, AuthError } from "@/lib/auth-guard";

export const Route = createFileRoute("/api/public/alert-acks")({
  server: {
    handlers: {
      GET: async () => Response.json({ acks: await listAlertAcks() }),
      POST: async ({ request }) => {
        let claims;
        try {
          claims = await requireAuth(request);
        } catch (e) {
          if (e instanceof AuthError) return e.response;
          throw e;
        }
        const { alertId } = (await request.json()) as { alertId: string };
        await insertAlertAck(alertId, claims.sub);
        return Response.json({ ok: true });
      },
    },
  },
});
