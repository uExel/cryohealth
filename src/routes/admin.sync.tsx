import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { authFetch } from "@/lib/auth-client";
import { CryoHealthAdminOnly } from "@/components/cryohealth/AdminPlaceholder";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/sync")({
  head: () => ({
    meta: [{ title: "Sync activity — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: SyncAdmin,
});

// Mirrors /api/admin/sync (see that route + listSyncLog/listChwCases in queries.ts).
type SyncLogRow = {
  id: string;
  user_id: string | null;
  device_id: string;
  started_at: string;
  finished_at: string | null;
  item_count: number;
  status: string;
  detail: unknown;
  created_at: string;
  user_name: string | null;
  user_lhw_id: string | null;
};

type ChwCaseRow = {
  id: string;
  chw_id: string | null;
  captured_at: string;
  outcome: string | null;
  sync_state: string;
  device_id: string;
  client_case_id: string;
  created_at: string;
  chw_name: string | null;
  chw_lhw_id: string | null;
};

type SyncResponse = {
  syncLog: { rows: SyncLogRow[]; total: number };
  chwCases: { rows: ChwCaseRow[]; total: number };
  limit: number;
};

/* Empty-state copy (issue #19). The requirement is an explicit, honest explanation rather than
 * a generic "no results", and NO fabricated rows to make the page look populated — so these
 * strings state exactly why each table is empty. The two tables are not in the same state, so
 * they do not share one message:
 *   - sync_log has no writer at all in CryoHealth-api (verified by grep 2026-08-24).
 *   - chw_cases IS written by POST /cases, so empty there means "nothing synced yet".
 * Reusing the "endpoint is not built" line for chw_cases would itself be inaccurate.
 * Written as concatenated literals so no line runs past the 100-col print width.
 */
const SYNC_LOG_EMPTY_HEADLINE = "No sync data yet — CryoHealth-api's sync endpoint is not built";

const SYNC_LOG_EMPTY_BODY =
  "The sync_log table exists in the shared schema (deviceId, itemCount, status, startedAt, " +
  "finishedAt), but no controller or service in CryoHealth-api ever writes to it — so there is " +
  "genuinely nothing to display here, and nothing broken in this page. Building that sync " +
  "endpoint is a separate CryoHealth-api goal and is out of scope for this page; this table " +
  "will begin filling on its own once that endpoint ships.";

const CHW_CASES_EMPTY_HEADLINE = "No offline cases have synced yet";

const CHW_CASES_EMPTY_BODY =
  "Unlike the sync log, this table does have a live writer: POST /cases on CryoHealth-api " +
  "(CHW role) stores a case captured on a device, idempotent on clientCaseId. An empty table " +
  "here therefore means no device has synced a case yet — not that the feature is missing.";

function SyncAdmin() {
  const { isCryoHealthAdmin } = useAuth();

  // The server route enforces the same gate (403 from requireRole); `enabled` only avoids
  // firing a request that would 403 for a non-admin who reached this component by URL.
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-sync"],
    enabled: isCryoHealthAdmin,
    queryFn: async (): Promise<SyncResponse> => {
      const res = await authFetch("/api/admin/sync");
      if (!res.ok) throw new Error(`sync fetch failed: ${res.status}`);
      return res.json();
    },
  });

  if (!isCryoHealthAdmin) return <CryoHealthAdminOnly />;

  const syncRows = data?.syncLog.rows ?? [];
  const caseRows = data?.chwCases.rows ?? [];

  // An empty state is only honest once the request has actually succeeded. While loading, or
  // after a failure, the tables are "unknown" — never reported as "no data".
  const settled = !isLoading && !isError;
  const syncEmpty = settled && syncRows.length === 0;
  const casesEmpty = settled && caseRows.length === 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-foreground">Sync activity</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Offline sync from CryoHealth-app, read from the two tables CryoHealth-api owns. This page
          reports exactly what is in them — including nothing at all.
        </p>
      </header>

      {isError && (
        <div
          className="mb-4 border-2 px-3 py-2 text-sm"
          style={{
            borderColor: "var(--color-watch)",
            background: "var(--color-watch-soft)",
            color: "var(--color-on-watch)",
          }}
        >
          Couldn't load sync activity — this is a request failure, not an empty result. The tables
          below are unknown until it succeeds.
        </div>
      )}

      <section className="mb-6">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">Device sync log</h2>
          <p className="text-xs text-muted-foreground">
            {settled ? `${data?.syncLog.total ?? 0} total` : "—"}
          </p>
        </div>

        {syncEmpty ? (
          <EmptyNotice headline={SYNC_LOG_EMPTY_HEADLINE} body={SYNC_LOG_EMPTY_BODY} />
        ) : (
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
                  <TableHead className="text-xs uppercase text-muted-foreground">Started</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">
                    Finished
                  </TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">User</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Device</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Items</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {isLoading && <LoadingRow colSpan={7} />}
                {isError && !isLoading && <UnknownRow colSpan={7} />}
                {syncRows.map((s) => (
                  <TableRow key={s.id} className="border-border hover:bg-secondary/40">
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(s.started_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.finished_at ? new Date(s.finished_at).toLocaleString() : "In progress"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.user_name ?? s.user_lhw_id ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground">
                      {s.device_id}
                    </TableCell>
                    <TableCell className="text-foreground">{s.item_count}</TableCell>
                    <TableCell className="text-foreground">{s.status}</TableCell>
                    <TableCell className="max-w-xs text-xs text-muted-foreground">
                      {s.detail ? JSON.stringify(s.detail) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">Offline cases synced</h2>
          <p className="text-xs text-muted-foreground">
            {settled ? `${data?.chwCases.total ?? 0} total` : "—"}
          </p>
        </div>

        {casesEmpty ? (
          <EmptyNotice headline={CHW_CASES_EMPTY_HEADLINE} body={CHW_CASES_EMPTY_BODY} />
        ) : (
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
                  <TableHead className="text-xs uppercase text-muted-foreground">
                    Captured
                  </TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">CHW</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Device</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">
                    Client case ID
                  </TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">
                    Sync state
                  </TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {isLoading && <LoadingRow colSpan={6} />}
                {isError && !isLoading && <UnknownRow colSpan={6} />}
                {caseRows.map((c) => (
                  <TableRow key={c.id} className="border-border hover:bg-secondary/40">
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(c.captured_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.chw_name ?? c.chw_lhw_id ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground">
                      {c.device_id}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {c.client_case_id}
                    </TableCell>
                    <TableCell className="text-foreground">{c.sync_state}</TableCell>
                    <TableCell className="text-muted-foreground">{c.outcome ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </main>
  );
}

/** Deliberately plain, and deliberately not a table row: an empty table with one grey "no
 *  results" cell is the generic treatment issue #19 rules out. The headline states the cause,
 *  the body explains the ownership and what would change it. */
function EmptyNotice({ headline, body }: { headline: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-6">
      <p className="text-sm font-semibold text-foreground">{headline}</p>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function LoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow className="border-border">
      <TableCell colSpan={colSpan} className="py-6 text-center text-muted-foreground">
        Loading…
      </TableCell>
    </TableRow>
  );
}

/** Shown instead of an empty state when the request failed — "we don't know" is not "there is
 *  no data", and conflating them would misreport an outage as a built-but-idle feature. */
function UnknownRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow className="border-border">
      <TableCell colSpan={colSpan} className="py-6 text-center text-muted-foreground">
        Unknown — the request failed.
      </TableCell>
    </TableRow>
  );
}
