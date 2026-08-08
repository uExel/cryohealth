import { createFileRoute } from "@tanstack/react-router";
import { insertCase } from "@/lib/queries";
import { requireAuth, AuthError } from "@/lib/auth-guard";

export const Route = createFileRoute("/api/public/cases")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let claims;
        try {
          claims = await requireAuth(request);
        } catch (e) {
          if (e instanceof AuthError) return e.response;
          throw e;
        }
        const body = (await request.json()) as {
          districtId?: string | null;
          patientAge?: number | null;
          patientSex?: string | null;
          symptoms: string;
          diagnosis?: string | null;
          treatment?: string | null;
          outcome?: string | null;
          isDisasterRelated?: boolean;
        };
        await insertCase({
          chwId: claims.sub,
          districtId: body.districtId ?? null,
          patientAge: body.patientAge ?? null,
          patientSex: body.patientSex ?? null,
          symptoms: body.symptoms,
          diagnosis: body.diagnosis ?? null,
          treatment: body.treatment ?? null,
          outcome: body.outcome ?? null,
          isDisasterRelated: body.isDisasterRelated ?? false,
        });
        return Response.json({ ok: true });
      },
    },
  },
});
