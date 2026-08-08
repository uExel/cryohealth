import { createFileRoute } from "@tanstack/react-router";
import { insertAlert, listAllAlerts } from "@/lib/queries";
import { requireAuth, AuthError } from "@/lib/auth-guard";

export const Route = createFileRoute("/api/public/alerts")({
  server: {
    handlers: {
      GET: async () => {
        const alerts = await listAllAlerts(200);
        return Response.json({ alerts });
      },
      POST: async ({ request }) => {
        let claims;
        try {
          claims = await requireAuth(request);
        } catch (e) {
          if (e instanceof AuthError) return e.response;
          throw e;
        }
        if (claims.role !== "cryohealth_admin" && claims.role !== "facility_admin") {
          return Response.json({ error: "Forbidden" }, { status: 403 });
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
