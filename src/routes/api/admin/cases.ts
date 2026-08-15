import { createFileRoute } from "@tanstack/react-router";
import { listCasesAdmin } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";

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
        return Response.json({ cases: await listCasesAdmin() });
      },
    },
  },
});
