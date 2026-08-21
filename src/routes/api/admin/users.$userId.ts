import { createFileRoute } from "@tanstack/react-router";
import { updateUser, LastAdminError } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { userUpdateSchema } from "@/lib/admin-schemas";
import { parseJsonBody, mapDbError } from "@/lib/api-errors";

/** Issue #16. There is intentionally no DELETE handler on this route — users are
 *  deactivated (`PUT { active: false }`), never destroyed. See the header comment on
 *  the users section of queries.ts: `cases.chw_id` is ON DELETE RESTRICT and
 *  `audit."actorId"` references users, so a hard delete would either be refused by
 *  the DB or shred the audit trail. `cryohealth_admin` only, same as the collection
 *  route — a facility_admin token gets a 403 here directly. */
export const Route = createFileRoute("/api/admin/users/$userId")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
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

        const parsed = userUpdateSchema.safeParse(json.data);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid request body", issues: parsed.error.issues },
            { status: 400 },
          );
        }
        if (Object.keys(parsed.data).length === 0) {
          return Response.json({ error: "No fields to update" }, { status: 400 });
        }

        try {
          const user = await updateUser(params.userId, parsed.data, claims.sub);
          if (!user) return Response.json({ error: "Not found" }, { status: 404 });
          return Response.json({ user });
        } catch (err) {
          if (err instanceof LastAdminError) {
            return Response.json(
              {
                error:
                  "This is the last active cryohealth_admin. Promote another admin first — no one could restore access otherwise.",
              },
              { status: 409 },
            );
          }
          const mapped = mapDbError(err);
          if (mapped) return mapped;
          throw err;
        }
      },
    },
  },
});
