import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TierBadge, type Tier } from "@/lib/tier";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/alerts")({
  head: () => ({
    meta: [{ title: "Alerts — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: AlertsAdmin,
});

type AlertRow = {
  id: string;
  title: string;
  tier: Tier;
  estimated_window: string | null;
  affected_population: number | null;
  created_at: string;
  status: "active" | "cleared";
  cleared_at: string | null;
  lake_name: string | null;
  district_name: string | null;
};

type AckRow = { alert_id: string; chw_id: string; acknowledged_at: string };

function AlertsAdmin() {
  const [tierFilter, setTierFilter] = useState<"ALL" | Tier>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "active" | "cleared">("ALL");
  const [search, setSearch] = useState("");

  const {
    data: alerts,
    isLoading,
    isError: alertsError,
  } = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: async (): Promise<AlertRow[]> => {
      const res = await fetch("/api/public/alerts");
      if (!res.ok) throw new Error(`alerts fetch failed: ${res.status}`);
      return (await res.json()).alerts ?? [];
    },
  });
  const { data: acks, isError: acksError } = useQuery({
    queryKey: ["admin-alert-acks"],
    queryFn: async (): Promise<AckRow[]> => {
      const res = await fetch("/api/public/alert-acks");
      if (!res.ok) throw new Error(`alert-acks fetch failed: ${res.status}`);
      return (await res.json()).acks ?? [];
    },
  });
  const isError = alertsError || acksError;

  const ackCount = (alertId: string) => (acks ?? []).filter((a) => a.alert_id === alertId).length;

  const filteredAlerts = (alerts ?? []).filter((a) => {
    if (tierFilter !== "ALL" && a.tier !== tierFilter) return false;
    if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-foreground">Alerts</h1>
        <p className="text-sm text-muted-foreground">
          {alerts?.length ?? 0} alerts, including cleared · acknowledgements shown as a count,
          view-only
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
          Couldn't load{" "}
          {alertsError && acksError
            ? "alerts or acknowledgements"
            : alertsError
              ? "alerts"
              : "acknowledgements"}
          . Showing whatever loaded previously, if anything.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title…"
            className="rounded-md border border-input bg-background px-2 py-1 text-xs"
          />
          <div className="flex gap-1 rounded-md border border-border bg-background p-0.5 text-xs">
            {(["ALL", "NORMAL", "WATCH", "HIGH", "CRITICAL"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className={`rounded px-2 py-0.5 ${tierFilter === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-md border border-border bg-background p-0.5 text-xs">
            {(["ALL", "active", "cleared"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded px-2 py-0.5 ${statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs uppercase text-muted-foreground">Tier</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Title</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Target</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Window</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Affected</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Acks</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Issued</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {isLoading && (
              <TableRow className="border-border">
                <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && filteredAlerts.length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                  No alerts match the current filters.
                </TableCell>
              </TableRow>
            )}
            {filteredAlerts.map((a) => (
              <TableRow key={a.id} className="border-border hover:bg-secondary/40">
                <TableCell>
                  <TierBadge tier={a.tier} />
                </TableCell>
                <TableCell className="font-semibold text-foreground">{a.title}</TableCell>
                <TableCell>
                  {a.status === "cleared" ? (
                    <span className="inline-flex flex-col gap-0.5">
                      <span className="inline-flex w-fit rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground">
                        Cleared
                      </span>
                      {a.cleared_at && (
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(a.cleared_at).toLocaleString()}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex w-fit rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground">
                      Active
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {a.lake_name ?? a.district_name ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {a.estimated_window ?? "—"}
                </TableCell>
                <TableCell className="text-foreground">
                  {(a.affected_population ?? 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-foreground">{ackCount(a.id)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
