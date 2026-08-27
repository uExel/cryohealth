import { createFileRoute } from "@tanstack/react-router";
import { insertAlert, listAllAlerts } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";

export const Route = createFileRoute("/api/public/alerts")({
  server: {
    handlers: {
      GET: async () => {
        const { rows, total, hasMore } = await listAllAlerts(200);
        return new Response(JSON.stringify({ alerts: rows, total, hasMore }), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, no-store",
          },
        });
      },
      POST: async ({ request }) => {
        let claims;
        try {
          claims = await requireAuth(request);
          requireRole(claims, ["cryohealth_admin", "facility_admin"]);
        } catch (e) {
          if (e instanceof AuthError) return e.response;
          throw e;
        }
        const body = (await request.json()) as {
          title: string;
          bodyEn: string;
          bodyUr?: string | null;
          tier: string;
          lakeId?: string | null;
          districtId?: string | null;
          estimatedWindow?: string | null;
          affectedPopulation?: number;
        };
        await insertAlert({
          title: body.title,
          bodyEn: body.bodyEn,
          bodyUr: body.bodyUr ?? null,
          tier: body.tier,
          lakeId: body.lakeId ?? null,
          districtId: body.districtId ?? null,
          estimatedWindow: body.estimatedWindow ?? null,
          affectedPopulation: body.affectedPopulation ?? 0,
          issuedById: claims.sub,
        });
        return Response.json({ ok: true });
      },
    },
  },
});
