import { createFileRoute } from "@tanstack/react-router";
import { listUsers, createUser } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { userCreateSchema } from "@/lib/admin-schemas";
import { parseJsonBody, mapDbError } from "@/lib/api-errors";

/** Issue #16. Every handler here is `cryohealth_admin` only — unlike the rest of
 *  api/admin/*, `facility_admin` is NOT included. That's the whole point of the gate:
 *  the sidebar hides "Users & roles" from a facility_admin, but a facility_admin token
 *  hitting this endpoint directly gets a 403 from requireRole, not a listing.
 *
 *  The listing lives here rather than in api/public/* (where the other admin tables
 *  read from) precisely because it can't be ungated: roles, lhwIds and phone numbers
 *  are exactly the material an attacker needs to target the sign-in endpoint. */
export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const claims = await requireAuth(request);
          requireRole(claims, ["cryohealth_admin"]);
        } catch (e) {
          if (e instanceof AuthError) return e.response;
          throw e;
        }
        return Response.json({ users: await listUsers() });
      },
      POST: async ({ request }) => {
        let claims;
        try {
          claims = await requireAuth(request);
          requireRole(claims, ["cryohealth_admin"]);
        } catch (e) {
          if (e instanceof AuthError) return e.response;
          throw e;
        }

        const json = await parseJsonBody(request);
        if (!json.ok) return json.response;

        const parsed = userCreateSchema.safeParse(json.data);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid request body", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        try {
          const user = await createUser({ ...parsed.data, actorId: claims.sub });
          return Response.json({ user });
        } catch (err) {
          // 23505 (duplicate lhwId/phone) -> 409 via mapDbError; both columns are
          // UNIQUE in CryoHealth-api's schema and are the sign-in lookup keys.
          const mapped = mapDbError(err);
          if (mapped) return mapped;
          throw err;
        }
      },
    },
  },
});
