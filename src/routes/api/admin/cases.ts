import { createFileRoute } from "@tanstack/react-router";
import { listCasesAdmin, insertCase } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { caseCreateSchema } from "@/lib/admin-schemas";
import { parseJsonBody, mapDbError } from "@/lib/api-errors";

/** Issue #15. Both admin roles, matching the GET that shipped with #9 and the rest of
 *  api/admin/* — the narrower `cryohealth_admin`-only gate is reserved for users, audit
 *  and system-health. The PRD calls cases "clinical-adjacent", which drives the
 *  soft-delete and the confirm dialog, not a narrower role; facility-scoping for
 *  `facility_admin` is PRD open question 1 and needs a schema change (`cases` has no
 *  facility column), so it is not silently half-implemented here.
 *
 *  DELETE lives on cases.$caseId.ts and is a soft delete — see softDeleteCase. */
export const Route = createFileRoute("/api/admin/cases")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const claims = await requireAuth(request);
          requireRole(claims, ["cryohealth_admin", "facility_admin"]);
        } catch (e) {
          if (e instanceof AuthError) return e.response;
          throw e;
        }
        const { rows, total, hasMore } = await listCasesAdmin();
        return new Response(JSON.stringify({ cases: rows, total, hasMore }), {
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

        const json = await parseJsonBody(request);
        if (!json.ok) return json.response;

        const parsed = caseCreateSchema.safeParse(json.data);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid request body", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        try {
          // snake_case (the schema, mirroring the columns) -> camelCase (insertCase's
          // long-standing params, shared with POST /api/public/cases). `chwId` comes
          // from the form, NOT from claims.sub: an admin logs a case on a CHW's behalf,
          // so the case is attributed to that CHW while `actorId` records who actually
          // wrote it. The public route is the one where the two coincide.
          const created = await insertCase({
            chwId: parsed.data.chw_id,
            districtId: parsed.data.district_id ?? null,
            patientAge: parsed.data.patient_age ?? null,
            patientSex: parsed.data.patient_sex ?? null,
            symptoms: parsed.data.symptoms,
            diagnosis: parsed.data.diagnosis ?? null,
            treatment: parsed.data.treatment ?? null,
            outcome: parsed.data.outcome ?? null,
            isDisasterRelated: parsed.data.is_disaster_related ?? false,
            actorId: claims.sub,
          });
          return Response.json({ case: created });
        } catch (err) {
          // 23503 -> 400: chw_id/district_id are FKs, so a stale picker option gives a
          // clean "the related record does not exist" instead of a raw 500.
          const mapped = mapDbError(err);
          if (mapped) return mapped;
          throw err;
        }
      },
    },
  },
});
