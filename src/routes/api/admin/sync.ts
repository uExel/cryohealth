import { createFileRoute } from "@tanstack/react-router";
import { listSyncLog, listChwCases } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";

/** Issue #19 (sync activity page). Read-only and `cryohealth_admin` only — same gate and the
 *  same reasoning as api/admin/audit.ts: these rows tie named health workers to device IDs,
 *  so a facility_admin token hitting this directly gets a 403 from requireRole, not a feed.
 *
 *  There is deliberately no POST/PUT/DELETE. Both tables belong to the offline-sync feature
 *  owned by CryoHealth-api; this app only reads them.
 *
 *  The response reports each table separately, because they are in different states and the
 *  page must not claim otherwise:
 *    - `sync_log` has NO writer in CryoHealth-api (verified by grep 2026-08-24 — entity and
 *      migration only), so it is expected to be empty. Building that endpoint is a separate
 *      CryoHealth-api goal, explicitly out of scope here.
 *    - `chw_cases` IS written by `POST /cases` (CasesController, `chw` role), so rows may
 *      legitimately exist; empty means no device has synced yet.
 *  Nothing here substitutes sample or placeholder rows for an empty table — an empty array is
 *  returned as an empty array and the page says so plainly. */

const SYNC_PAGE_LIMIT = 200;

export const Route = createFileRoute("/api/admin/sync")({
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

        // Independent tables, so both are read in one round-trip. A DB failure propagates as
        // a 500 rather than being flattened into an empty result — "the query broke" must
        // never render as "there is no sync data".
        const [syncLog, chwCases] = await Promise.all([
          listSyncLog(SYNC_PAGE_LIMIT),
          listChwCases(SYNC_PAGE_LIMIT),
        ]);

        return Response.json({
          syncLog: { rows: syncLog.rows, total: syncLog.total },
          chwCases: { rows: chwCases.rows, total: chwCases.total },
          limit: SYNC_PAGE_LIMIT,
        });
      },
    },
  },
});
