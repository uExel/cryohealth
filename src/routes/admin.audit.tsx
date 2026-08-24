import { createFileRoute } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [{ title: "Audit log — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: AuditAdmin,
});

type AuditRow = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_lhw_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  reason: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};
type ActorFacet = { id: string; name: string; lhw_id: string | null };
type AuditResponse = {
  rows: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
  actors: ActorFacet[];
  entityTypes: string[];
};

const PAGE_SIZE = 50;
// Radix's Select forbids a SelectItem with an empty-string value, so "no filter" needs a
// sentinel rather than "". buildAuditQuery below maps it back to "omit the param".
const ALL = "__all__";

function buildAuditQuery(opts: {
  actorId: string;
  entityType: string;
  from: string;
  to: string;
  page?: number;
  pageSize?: number;
  format?: "csv";
}): string {
  const p = new URLSearchParams();
  if (opts.actorId !== ALL) p.set("actorId", opts.actorId);
  if (opts.entityType !== ALL) p.set("entityType", opts.entityType);
  if (opts.from) p.set("from", opts.from);
  if (opts.to) p.set("to", opts.to);
  if (opts.page) p.set("page", String(opts.page));
  if (opts.pageSize) p.set("pageSize", String(opts.pageSize));
  if (opts.format) p.set("format", opts.format);
  return p.toString();
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return "∅";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Renders the jsonb `meta` in a human shape for the two structures the writers actually
 *  produce — `{ changed: { field: { from, to } } }` from updates and
 *  `{ created: { …} }` from creates (see queries.ts / CryoHealth-api's alerts.service.ts)
 *  — and falls back to compact JSON for anything else so no row is ever unreadable. */
function MetaCell({ meta }: { meta: Record<string, unknown> | null }) {
  if (!meta || Object.keys(meta).length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const changed = meta.changed;
  if (changed && typeof changed === "object") {
    const entries = Object.entries(changed as Record<string, { from?: unknown; to?: unknown }>);
    return (
      <div className="space-y-0.5 text-xs">
        {entries.map(([k, v]) => (
          <div key={k} className="text-foreground">
            <span className="font-medium">{k}</span>: {fmtVal(v?.from)} → {fmtVal(v?.to)}
          </div>
        ))}
      </div>
    );
  }

  const created = meta.created;
  if (created && typeof created === "object") {
    return (
      <div className="space-y-0.5 text-xs">
        {Object.entries(created as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <span className="font-medium text-foreground">{k}</span>: {fmtVal(v)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <code className="block max-w-sm break-words text-xs text-muted-foreground">
      {JSON.stringify(meta)}
    </code>
  );
}

function AuditAdmin() {
  const { isCryoHealthAdmin } = useAuth();

  const [actorId, setActorId] = useState<string>(ALL);
  const [entityType, setEntityType] = useState<string>(ALL);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  // The API enforces the role too (403 from requireRole) — this only avoids firing a
  // fetch that would 403 for a facility_admin who guessed the URL.
  const enabled = isCryoHealthAdmin;

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["admin-audit", actorId, entityType, from, to, page],
    enabled,
    // Keep the current page (and the facet dropdowns) on screen while the next page or a
    // re-filter loads, so the table doesn't blank out between pages.
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AuditResponse> => {
      const qs = buildAuditQuery({ actorId, entityType, from, to, page, pageSize: PAGE_SIZE });
      const res = await authFetch(`/api/admin/audit?${qs}`);
      if (!res.ok) throw new Error(`audit fetch failed: ${res.status}`);
      return await res.json();
    },
  });

  if (!isCryoHealthAdmin) return <CryoHealthAdminOnly />;

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const actors = data?.actors ?? [];
  const entityTypes = data?.entityTypes ?? [];
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, total);
  const hasFilters = actorId !== ALL || entityType !== ALL || from !== "" || to !== "";

  // Any filter change resets to page 1 — otherwise you can land on a page that no longer
  // exists for the narrowed result set.
  const onActor = (v: string) => {
    setActorId(v);
    setPage(1);
  };
  const onEntity = (v: string) => {
    setEntityType(v);
    setPage(1);
  };
  const onFrom = (v: string) => {
    setFrom(v);
    setPage(1);
  };
  const onTo = (v: string) => {
    setTo(v);
    setPage(1);
  };
  const clearFilters = () => {
    setActorId(ALL);
    setEntityType(ALL);
    setFrom("");
    setTo("");
    setPage(1);
  };

  async function handleExport() {
    setExporting(true);
    try {
      // Export honors the current filters but not pagination — the whole filtered set,
      // capped server-side. authFetch (not a plain <a href>) so the Bearer token rides
      // along; the CSV comes back as a blob we turn into a one-shot download.
      const qs = buildAuditQuery({ actorId, entityType, from, to, format: "csv" });
      const res = await authFetch(`/api/admin/audit?${qs}`);
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Audit log</h1>
          <p className="text-sm text-muted-foreground">
            Every administrative change and alert action, newest first. Read-only.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting || total === 0}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </header>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase text-muted-foreground">Actor</span>
          <Select value={actorId} onValueChange={onActor}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All actors</SelectItem>
              {actors.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                  {a.lhw_id ? ` (${a.lhw_id})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase text-muted-foreground">Entity type</span>
          <Select value={entityType} onValueChange={onEntity}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {entityTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="audit-from" className="text-xs uppercase text-muted-foreground">
            From
          </label>
          <Input
            id="audit-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => onFrom(e.target.value)}
            className="w-40"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="audit-to" className="text-xs uppercase text-muted-foreground">
            To
          </label>
          <Input
            id="audit-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => onTo(e.target.value)}
            className="w-40"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {isError && (
        <div
          className="mb-4 border-2 px-3 py-2 text-sm"
          style={{
            borderColor: "var(--color-watch)",
            background: "var(--color-watch-soft)",
            color: "var(--color-on-watch)",
          }}
        >
          Couldn't load the audit log. Showing whatever loaded previously, if anything.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs uppercase text-muted-foreground">Time</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Actor</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Action</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Entity</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Entity ID</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Reason</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {isLoading && (
              <TableRow className="border-border">
                <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  {hasFilters ? "No entries match these filters." : "No audit entries yet."}
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id} className="border-border align-top hover:bg-secondary/40">
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  {r.actor_name ? (
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{r.actor_name}</span>
                      {r.actor_lhw_id && (
                        <span className="text-xs text-muted-foreground">{r.actor_lhw_id}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground" title={r.actor_id ?? undefined}>
                      System
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {r.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.entity_type}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {r.entity_id ? <span title={r.entity_id}>{shortId(r.entity_id)}</span> : "—"}
                </TableCell>
                <TableCell className="max-w-xs text-sm text-muted-foreground">
                  {r.reason ?? "—"}
                </TableCell>
                <TableCell className="max-w-sm">
                  <MetaCell meta={r.meta} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total === 0 ? "No entries" : `Showing ${startRow}–${endRow} of ${total}`}
          {isFetching && !isLoading ? " · updating…" : ""}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="tabular-nums">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount || isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </main>
  );
}
