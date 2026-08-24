import { createFileRoute } from "@tanstack/react-router";
import { listAudit, listAuditActors, listAuditEntityTypes } from "@/lib/queries";
import { requireAuth, requireRole, AuthError } from "@/lib/auth-guard";
import { auditQuerySchema, AUDIT_EXPORT_MAX } from "@/lib/admin-schemas";

/** Issue #18 (audit log page). Read-only and `cryohealth_admin` only — same gate and the
 *  same reasoning as api/admin/users.ts: the audit log names who did what to whom, so a
 *  facility_admin token hitting this directly gets a 403 from requireRole, not a feed.
 *  There is deliberately no POST/PUT/DELETE — the `audit` table is append-only and is
 *  written *only* as a side effect of the mutations in queries.ts (via writeAudit) and of
 *  CryoHealth-api's alert service. This endpoint reads it and never writes it. */

type AuditExportRow = {
  created_at: Date | string;
  actor_name: string | null;
  actor_lhw_id: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  reason: string | null;
  meta: unknown;
};

/** One CSV cell, RFC-4180 style: always quoted, embedded quotes doubled. Dates go out as
 *  ISO 8601 (stable, sortable, timezone-explicit); the jsonb `meta` object as compact
 *  JSON; null/undefined as an empty field. */
function csvCell(value: unknown): string {
  let s: string;
  if (value === null || value === undefined) s = "";
  else if (value instanceof Date) s = value.toISOString();
  else if (typeof value === "object") s = JSON.stringify(value);
  else s = String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(rows: AuditExportRow[]): string {
  const header = [
    "Time",
    "Actor",
    "Actor LHW ID",
    "Actor ID",
    "Action",
    "Entity type",
    "Entity ID",
    "Reason",
    "Details",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    const cells = [
      r.created_at,
      r.actor_name,
      r.actor_lhw_id,
      r.actor_id,
      r.action,
      r.entity_type,
      r.entity_id,
      r.reason,
      r.meta,
    ];
    lines.push(cells.map(csvCell).join(","));
  }
  // Leading byte-order mark (U+FEFF) so Excel opens the file as UTF-8 (actor names may
  // be Urdu) instead of mojibake; CRLF line endings per the convention Excel expects.
  // Built from a char code so there's no invisible character sitting in this source file.
  const bom = String.fromCharCode(0xfeff);
  return bom + lines.join("\r\n");
}

export const Route = createFileRoute("/api/admin/audit")({
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

        const url = new URL(request.url);
        const parsed = auditQuerySchema.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid query", issues: parsed.error.issues },
            { status: 400 },
          );
        }
        const { page, pageSize, ...filters } = parsed.data;

        // `format` gates the response *shape*, not the data, so it's read straight off the
        // query string rather than through the (non-strict) filter schema. A CSV export
        // honors the same filters but ignores pagination — you export the whole filtered
        // set (capped at AUDIT_EXPORT_MAX), not the single page on screen.
        if (url.searchParams.get("format") === "csv") {
          const { rows } = await listAudit(filters, 1, AUDIT_EXPORT_MAX);
          const stamp = new Date().toISOString().slice(0, 10);
          return new Response(toCsv(rows as unknown as AuditExportRow[]), {
            headers: {
              "content-type": "text/csv; charset=utf-8",
              "content-disposition": `attachment; filename="audit-log-${stamp}.csv"`,
            },
          });
        }

        const { rows, total } = await listAudit(filters, page, pageSize);
        // Facets are whole-table (unfiltered) so the dropdowns keep every option no matter
        // what's currently filtered; fetched alongside the page in one round-trip.
        const [actors, entityTypes] = await Promise.all([
          listAuditActors(),
          listAuditEntityTypes(),
        ]);
        return Response.json({ rows, total, page, pageSize, actors, entityTypes });
      },
    },
  },
});
