import { createFileRoute } from "@tanstack/react-router";
import { listHazardScores } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { invalidUuidResponse } from "@/lib/api-errors";

export const Route = createFileRoute("/api/public/hazard-scores/$lakeId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const claims = await requireAuth(request);
          requireRole(claims, ["cryohealth_admin", "facility_admin"]);
        } catch (e) {
          if (e instanceof AuthError) return e.response;
          throw e;
        }
        // Deliberately after the auth gate, not before it: an unauthenticated caller must
        // still get 401 regardless of the id's shape, so this endpoint never validates
        // input for someone who isn't allowed to call it at all. Both queries in
        // listHazardScores bind `lakeId` to a `uuid` column (issue #28).
        const invalid = invalidUuidResponse(params.lakeId, "lake id");
        if (invalid) return invalid;

        // `hazardScores` keeps its original key so this stays a purely additive change for any
        // existing consumer; `total`/`hasMore` are what let a caller tell a complete list from a
        // list capped at 120 (issue #27).
        const { rows, total, hasMore } = await listHazardScores(params.lakeId);
        // The only authenticated GET under `api/public/*` (the other gated routes on this
        // prefix — alerts, alert-acks, cases — gate POSTs, which caches don't store by
        // default). Nothing caches this prefix today (no `routes`/`assets` rule in
        // wrangler.jsonc, nothing cache-related in vite.config.ts), but the prefix *name*
        // reads as public, so a future edge-cache rule written against `/api/public/*`
        // would cache a role-gated body — `runId`/`components` pipeline internals — and
        // serve it to the wrong audience. This header makes that mistake impossible to
        // make silently, rather than relying on the CLAUDE.md note (issue #29).
        return Response.json(
          { hazardScores: rows, total, hasMore },
          { headers: { "Cache-Control": "private, no-store" } },
        );
      },
    },
  },
});
